import os
import sys
import json
import boto3
import random
import argparse
from typing import List, Dict
from datetime import datetime

# Google Gemini API
from google import genai
from google.genai import types

# RAG 관련 라이브러리
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.utils import embedding_functions

# --- 환경 변수 설정 ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
BUCKET_NAME = os.environ.get("BUCKET_NAME")
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.environ.get("AWS_REGION")

# --- ChromaDB 설정 ---
CHROMA_HOST = os.environ.get("CHROMA_HOST", "localhost") 
CHROMA_PORT = os.environ.get("CHROMA_PORT", 8000)
COLLECTION_NAME = os.environ.get("COLLECTION_NAME", "cs_skill_questions")

# 환경 변수 유효성 검사
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY environment variable not set.", file=sys.stderr)
    sys.exit(1)
if not BUCKET_NAME:
    print("Error: BUCKET_NAME environment variable not set.", file=sys.stderr)
    sys.exit(1)
if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY or not AWS_REGION:
    print("Error: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION environment variables not fully set.", file=sys.stderr)
    # sys.exit(1) # S3 사용하지 않는 경우를 대비해 일단 에러는 띄우고 종료하지 않음
    # 실제 환경에서는 필수적으로 설정되어야 함.

# S3 클라이언트 초기화
s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)


# --- RAG 관련 초기화 ---
# 임베딩 모델 로드 (스크립트 시작 시 한 번만 로드)
print("[*] Loading SentenceTransformer model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2') 
print("[*] SentenceTransformer model loaded.")

# ChromaDB 클라이언트 초기화
print(f"Connecting to ChromaDB at {CHROMA_HOST}:{CHROMA_PORT}...")
try:
    chroma_client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
    # 컬렉션 존재 여부 확인 후 로드 또는 생성
    collection = chroma_client.get_collection(name=COLLECTION_NAME)
    print(f"ChromaDB collection '{COLLECTION_NAME}' loaded.")
except Exception as e:
    print(f"ChromaDB collection '{COLLECTION_NAME}' not found or connection error: {e}. Attempting to create it...")
    try:
        collection = chroma_client.create_collection(name=COLLECTION_NAME)
        print(f"ChromaDB collection '{COLLECTION_NAME}' created.")
    except Exception as create_e:
        print(f"Error creating ChromaDB collection: {create_e}. Please ensure ChromaDB server is running and accessible.", file=sys.stderr)
        sys.exit(1)

try:
    collection = chroma_client.get_collection(name=COLLECTION_NAME)
    print(f"ChromaDB collection '{COLLECTION_NAME}' loaded.")
except Exception as e:
    print(f"ChromaDB collection '{COLLECTION_NAME}' not found. Creating it...")
    # NOTE: embedding_function은 add/query 시 직접 임베딩을 제공하므로 여기서 지정하지 않습니다.
    collection = chroma_client.create_collection(name=COLLECTION_NAME)
    print(f"ChromaDB collection '{COLLECTION_NAME}' created. Please run embed_and_store.py to populate it.")


# --- 메인 주제 및 세부 주제 정의 (프롬프트의 내용과 일치하도록) ---
# TODO: 메인 주제에 대한 세부 주제의 다양성 확대 방법 연구
TOPICS = ["Algorithm", "OS", "Network", "DB", "Git", "DevOps"]
SUB_TOPICS = {
    "Algorithm": ["시간/공간 복잡도", "정렬/검색", "자료구조", "동적 계획법", "그래프 알고리즘", "재귀/분할정복"],
    "OS": ["프로세스/스레드", "메모리 관리", "파일 시스템", "동기화", "스케줄링"],
    "Network": ["OSI 7계층", "TCP/UDP", "HTTP/HTTPS", "DNS", "라우팅", "보안"],
    "DB": ["SQL", "트랜잭션", "인덱스", "정규화", "JOIN", "복제", "샤딩"],
    "Git": ["버전 관리", "브랜치", "머지", "충돌 해결", "워크플로우"],
    "DevOps": ["CI/CD", "컨테이너", "모니터링", "배포", "인프라 자동화"]
}

# --- 유틸 함수 ---
def generate_prompt_text(selected_topic=None, selected_sub_topic=None):
    """자동 모드에서 사용할 프롬프트 텍스트를 동적으로 생성"""
    base_prompt = "CS 스킬 관련 객관식 4지선다형 문제를 만들어주세요."
    if selected_topic:
        base_prompt += f" 메인 주제는 '{selected_topic}'입니다."
        if selected_sub_topic:
            base_prompt += f" 특히 '{selected_sub_topic}'에 대한 내용을 포함해주세요."
    base_prompt += " 이전에 생성된 문제와는 다른 새로운 문제를 생성해 주세요."
    return base_prompt

def get_last_topic_index(s3_client_obj, bucket_name):
    """S3에서 마지막으로 사용된 토픽 인덱스를 읽음"""
    STATE_FILE_KEY = "cs-question-state/last_topic_index.json"
    try:
        response = s3_client_obj.get_object(Bucket=bucket_name, Key=STATE_FILE_KEY)
        state_data = json.loads(response['Body'].read().decode('utf-8'))
        return state_data.get("last_topic_index", -1)
    except s3_client_obj.exceptions.NoSuchKey:
        print(f"State file {STATE_FILE_KEY} not found in S3. Starting from index -1.")
        return -1
    except Exception as e:
        print(f"Error reading state file from S3: {e}")
        return -1 # 에러 발생 시 초기값으로 시작
    
def update_last_topic_index(s3_client_obj, bucket_name, index):
    """S3에 다음 사용할 토픽 인덱스를 저장"""
    STATE_FILE_KEY = "cs-question-state/last_topic_index.json"
    state_data = {"last_topic_index": index}
    s3_client_obj.put_object(
        Body=json.dumps(state_data).encode('utf-8'),
        Bucket=bucket_name,
        Key=STATE_FILE_KEY
    )
    print(f"Updated last topic index in S3 to {index}")

def retrieve_similar_questions(query_text: str, target_topic: str, n_results: int = 3) -> List[Dict]:
    """ChromaDB에서 쿼리 및 특정 주제와 유사한 문제들을 검색"""
    query_embedding = embedding_model.encode(query_text).tolist()
    
    # 'where' 절을 사용하여 특정 topic의 문제만 검색
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where={"topic": target_topic}, # 동일 주제 필터링
        include=['documents', 'metadatas']
    )
    
    retrieved_questions = []
    if results and results['documents']:
        for i in range(len(results['documents'][0])):
            question_text = results['documents'][0][i]
            metadata = results['metadatas'][0][i]
            
            retrieved_questions.append({
                "question": question_text,
                "answer": metadata.get("answer")
            })
    return retrieved_questions

def embed_and_store_single_question(question_data: Dict):
    """단일 문제를 임베딩하고 ChromaDB에 저장"""
    question_text = question_data.get("question")
    topic = question_data.get("topic")
    answer = question_data.get("answer")
    selections = question_data.get("selections", [])

    if not question_text:
        print(f"Warning: 'question' field missing or empty. Skipping ChromaDB store.", file=sys.stderr)
        return

    # 임베딩
    question_embedding = embedding_model.encode(question_text).tolist()

    # 고유 ID 생성 (타임스탬프와 랜덤 조합)
    unique_id = f"q-{datetime.now().strftime('%Y%m%d%H%M%S%f')}-{random.randint(0, 999999)}"

    try:
        # ChromaDB에 추가
        collection.add(
            ids=[unique_id],
            embeddings=[question_embedding],
            documents=[question_text],
            metadatas=[{
                "topic": topic,
                "answer": answer,
                "selections": json.dumps(selections) # 리스트는 문자열로 저장
            }]
        )
        print(f"Successfully embedded and stored question '{question_text[:50]}...' into ChromaDB with ID: {unique_id}")
    except Exception as e:
        print(f"Error storing question in ChromaDB: {e}", file=sys.stderr)


# --- 메인 문제 생성 함수 ---
def generate_and_store_question(custom_user_prompt=None):
    genai_client = genai.Client(api_key=GEMINI_API_KEY)
    model = "gemini-2.5-flash-preview-05-20"
    
    is_manual_mode = (custom_user_prompt is not None)
    selected_topic = None
    selected_sub_topic = None
    next_topic_index = -1 

    # 1. USER_INPUT 결정 및 모드 설정
    if not is_manual_mode: # 자동 모드 (Cronjob 시뮬레이션)
        print("Running in automatic mode (simulating Cronjob).")
        last_index = get_last_topic_index(s3_client, BUCKET_NAME)
        next_topic_index = (last_index + 1) % len(TOPICS)
        selected_topic = TOPICS[next_topic_index]
        selected_sub_topic = random.choice(SUB_TOPICS[selected_topic])
        base_prompt_text = generate_prompt_text(selected_topic, selected_sub_topic)
        print(f"Selected Topic: {selected_topic}, Sub-Topic: {selected_sub_topic}")
    else: # 수동 모드
        print("Running in manual mode with custom prompt.")
        base_prompt_text = custom_user_prompt
        # 수동 모드에서는 RAG 검색 시 topic 필터링을 하지 않음 (프롬프트에서 topic 추출 로직 필요시 추가)
        print("NOTE: In manual mode, RAG search will NOT filter by topic. Consider refining your prompt for specificity.")
        selected_topic = None # RAG 검색에서 topic 필터를 적용하지 않도록 설정

    # 2. 유사 문제 검색 (RAG) 및 프롬프트 컨텍스트 증강
    retrieved_similar_questions = retrieve_similar_questions(base_prompt_text, target_topic=selected_topic, n_results=3)
    
    context_for_llm = ""
    if retrieved_similar_questions:
        print(f"Retrieved {len(retrieved_similar_questions)} similar questions from ChromaDB for RAG context.")
        context_for_llm += "\n\n# 참고할 기존 문제 (이와는 다른 새로운 문제를 생성해야 함):\n"
        for i, q_data in enumerate(retrieved_similar_questions):
            context_for_llm += f"## 기존 문제 {i+1}:\n"
            context_for_llm += f"Question: {q_data.get('question', 'N/A')}\n"
            context_for_llm += f"Answer: {q_data.get('answer', 'N/A')}\n\n" # 선택지 제외
        context_for_llm += "위 문제를 참고하여, **유사하지 않은 완전히 새로운** CS 스킬 4지선다 문제를 JSON 스키마에 맞춰 생성해주세요.\n"
    else:
        print("No similar questions found in ChromaDB for RAG context or filters applied (e.g., topic).")

    # 최종 USER_INPUT 구성
    final_user_input_with_rag = base_prompt_text + context_for_llm

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=final_user_input_with_rag),
            ],
        ),
    ]

    # 모델 생성 설정
    generate_content_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=genai.types.Schema(
            type = genai.types.Type.OBJECT,
            description = "CS 학습용 4지선다 문제 생성을 위한 스키마",
            required = ["topic", "question", "answer", "selections"],
            properties = {
                "topic": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    description = "문제의 메인주제 분야",
                    enum = TOPICS, # 정의된 TOPICS 리스트 사용
                ),
                "question": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    description = "문제 내용 (markdown 형식, 최대 3-4문장)",
                ),
                "answer": genai.types.Schema(
                    type = genai.types.Type.STRING,
                    description = "정답 선택지 (markdown 형식, 최대 3문장)",
                ),
                "selections": genai.types.Schema(
                    type = genai.types.Type.ARRAY,
                    description = "4개의 선택지 배열 (정답 포함)",
                    items = genai.types.Schema(
                        type = genai.types.Type.STRING,
                        description = "선택지 내용 (markdown 형식, 최대 3문장)",
                    ),
                ),
            },
        ),
        temperature=0.8, # 다양성 높이기 (일시적임, prompt를 수정하는 것이 나음)
        system_instruction=[
            types.Part.from_text(text="""이 프로젝트의 목적은 IT 직무의 CS 스킬에 대한 인터뷰 대비 및 일상적인 학습을 위한 CS 스킬 기반 문제 제작입니다. 데일리로 가볍게 풀 수 있는 문제를 지향하며, 주니어 엔지니어(3년 미만 경력)가 해결할 수 있는 수준의 문제를 생성해야 합니다.

당신이 해야할 것은 CS스킬(Algorithm, OS, Network, DB, Git, DevOps 등) 기반의 4지선다형 '문제'의 제작이며, '문제'와 함께 '정답지'와 '3~4개의 정답이 아닌 선택지'도 함께 제작해야합니다.

1. 문제 생성 범위
사용자가 제시한 메인주제와 세부주제를 가장 먼저 선택하되, 주제의 입력이 없는 경우 아래와 같은 규칙을 적용해서 주제를 선택한다.
메인 주제: Algorithm, OS, Network, DB, Git, DevOps 중 하나를 무작위로 선택
세부 주제 : 아래의 '메인 주제별 예시 세부주제'를 이용합니다.
난이도: 주니어 엔지니어(3년 미만 경력)에 적합한 수준
형식: 4지선다형 객관식 문제

2. 문제 내용 가이드라인
문제 길이: 최대 3~4문장으로 간결하게 작성
문제 유형: 개념 설명, 차이점 비교, 실무 상황 적용, 기본 원리 이해 등
실무 연관성: 실제 개발/운영 환경에서 마주할 수 있는 상황 포함
명확성: 모호하지 않고 명확한 답이 존재하는 문제

3. 선택지 생성 규칙
정답 선택지: 정확하고 완전한 답변 (최대 3문장)
오답 선택지 3~4개: 각각 최대 3문장으로 작성

아래와 같은 유형들을 이용할 수 있으며, 오답 선택지를 생성할때 아래 유형들을 적절히 선택해서 사용합니다. 아래 유형들을 반드시 모두 사용할 필요는 없습니다.
유사 혼동형: 정답과 비슷하지만 핵심 내용이 틀린 선택지
부분 오류형: 일부는 맞지만 중요한 부분에서 틀린 선택지
개념 혼동형: 관련 있지만 다른 개념을 설명하는 선택지

4. 각 메인 주제별 예시 세부주제와 키워드
- 알고리즘 (Algorithm)
예시 세부주제 : 시간/공간 복잡도, 정렬/검색, 자료구조, 동적 계획법, 그래프 알고리즘, 재귀/분할정복 등
예시 키워드: Big O, 스택, 큐, 해시테이블, DFS/BFS, 이진탐색, 퀵정렬, 머지정렬, DP, 그리디 등
- OS (Operating System)
예시 세부주제 : 프로세스/스레드, 메모리 관리, 파일 시스템, 동기화, 스케줄링 등
예시 키워드: 뮤텍스, 세마포어, 데드락, 가상 메모리, 페이징 등

- 네트워크 (Network)
예시 세부주제 : OSI 7계층, TCP/UDP, HTTP/HTTPS, DNS, 라우팅, 보안 등
예시 키워드: 소켓, 포트, IP 주소, 서브넷, 방화벽, SSL/TLS 등

- DB (Database)
예시 세부주제 : SQL, 트랜잭션, 인덱스, 정규화, JOIN, 복제, 샤딩 등
예시 키워드: ACID, 관계형/비관계형 DB, 쿼리 최적화, 백업 등

- Git
예시 세부주제 : 버전 관리, 브랜치, 머지, 충돌 해결, 워크플로우 등
예시 키워드: commit, push, pull, rebase, reset, revert, stash 등

- DevOps
예시 세부주제 : CI/CD, 컨테이너, 모니터링, 배포, 인프라 자동화 등
예시 키워드: Docker, Jenkins, argoCD, Kubernetes, 로드밸런싱, 오케스트레이션, ELK스택, PLG스택, RTO/RPO 등

제시된 예시 세부주제 외에도, 각 메인 주제와 관련된 다양한 최신 또는 심화 개념을 자유롭게 발굴하여 문제를 생성할 수 있습니다.


모든 내용을 JSON 형식으로 최종 출력하며, 다음 구조를 따라야합니다.
```
{
  "topic": "주제 (Algorithm/OS/Network/DB/Git/DevOps 중 하나)",
  "question": "문제 내용 (markdown 형식, 최대 3~4문장)",
  "answer": "정답 선택지 (markdown 형식, 최대 3문장)",
  "selections": [
    "정답 선택지 (answer와 동일)",
    "오답 선택지 1 (최대 3문장)",
    "오답 선택지 2 (최대 3문장)", 
    "오답 선택지 3 (최대 3문장)"
  ]
}
```

6. 문제 품질 기준

- 정확성: 기술적으로 정확한 내용
- 실용성: 실무에서 유용한 지식
- 적절한 난이도: 너무 쉽지도, 어렵지도 않은 수준
- 혼동 요소: 오답 선택지가 적절히 헷갈리는 수준
- 학습 효과: 문제를 통해 핵심 개념을 학습할 수 있음

7. 주의사항

- 선택지 순서는 무작위로 배치 (정답이 항상 첫 번째가 아니어야 함)
- 오답 선택지는 완전히 틀린 내용보다는 "아쉽게 틀린" 수준으로 제작
- 트릭 문제나 함정 문제보다는 정당한 지식을 묻는 문제 지향
- 특정 벤더나 도구에 국한되지 않는 일반적인 개념 중심
- 시대에 뒤떨어진 기술보다는 현재 널리 사용되는 기술 중심

제작되는 '문제'와 '선택지'의 예시는 아래와 같습니다.
```
{
  "topic": "DB"
  "question": "DB에서 사용되는 join 연산에 대해 설명해주세요",
  "answer": "두 개 이상의 테이블을 공통 컬럼을 기준으로 결합하여 데이터를 조회하는 방법입니다. 주요 JOIN 유형에는 INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL JOIN 등이 있으며, 각각 테이블 간 데이터 결합 방식이 다릅니다. 이를 통해 복잡한 쿼리를 통해 관련 데이터를 효율적으로 가져올 수 있습니다."
  "selection": [
    "데이터베이스의 성능과 확장성을 향상하기 위해 샤드라는 단위로 데이터를 분산 저장하는 방법입니다. 동일한 DB내에서 나누어 저장하는 파티셔닝과 다르게 여러개의 DB에 샤드를 저장하고 대규모 분산 시스템에서 처리부하를 분산시키기 위한 용도로 사용됩니다.",
    "두 개 이상의 테이블을 공통 컬럼을 기준으로 결합하여 데이터를 조회하는 방법입니다. 주요 JOIN 유형에는 INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL JOIN 등이 있으며, 각각 테이블 간 데이터 결합 방식이 다릅니다. 이를 통해 복잡한 쿼리를 통해 관련 데이터를 효율적으로 가져올 수 있습니다.",
    "두 개 이상의 테이블을 공통 컬럼을 기준으로 결합하여 데이터를 조회하는 방법입니다. 주요 JOIN 유형에는 INNER JOIN, LEFT JOIN, RIGHT JOIN, 그리고 CROSS JOIN이 있으며, CROSS JOIN은 두 테이블의 모든 행을 곱해 하나의 행으로 결합합니다. 이를 통해 복잡한 쿼리로 관련 데이터를 효율적으로 가져올 수 있습니다.",
    "데이터베이스에서 JOIN 연산은 두 개 이상의 테이블을 공통 키를 기준으로 결합하여 데이터를 조회하는 방법입니다. 주요 JOIN 유형에는 INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL JOIN이 있으며, INNER JOIN은 두 테이블의 모든 행을 결합하여 결과로 반환합니다."
  ]
}```
"""),
        ],
    )

    MAX_RETRIES = 3 # 최대 재시도 횟수

    for attempt in range(MAX_RETRIES):
        response = genai_client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        
        if not response or not response.text:
            print(f"No response text received. Retrying... (Attempt {attempt + 1})")
            continue

        try:
            generated_data = json.loads(response.text)
            
            # S3에 JSON 파일로 저장
            now = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
            # 자동/수동 모드에 따라 S3 경로 접두사 변경 (선택 사항)
            s3_key_prefix = "cs-question/"
            if is_manual_mode: 
                s3_key_prefix = "cs-question-manual/"
            
            question_file_key = f"{s3_key_prefix}q-{now}.json"
            
            s3_client.put_object(
                Body=response.text.encode('utf-8'), # S3는 bytes를 선호
                Bucket=BUCKET_NAME,
                Key=question_file_key,
            )
            print(f"Successfully generated and saved question to S3://{BUCKET_NAME}/{question_file_key}")
            print(f"Question: {generated_data.get('question', 'N/A')[:50]}...")

            # 생성된 문제를 ChromaDB에 바로 임베딩 추가
            embed_and_store_single_question(generated_data)

            # Cronjob 모드일 때만 상태 업데이트 (S3에 다음 토픽 인덱스 저장)
            if not is_manual_mode:
                update_last_topic_index(s3_client, BUCKET_NAME, next_topic_index)
            
            return # 성공 시 함수 종료

        except json.JSONDecodeError as jde:
            print(f"JSON Decode Error from Gemini response: {jde}. Raw response: {response.text}. Retrying... (Attempt {attempt + 1})")
            continue 
        except s3_client.exceptions.ClientError as s3_ce:
            print(f"S3 Error: {s3_ce}. Check AWS credentials and bucket name. Retrying... (Attempt {attempt + 1})")
            continue
        except Exception as e:
            print(f"An unexpected error occurred during save or embed: {e}. Retrying... (Attempt {attempt + 1})")
            continue 

    print(f"Failed to generate a valid question after {MAX_RETRIES} attempts.")
    sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate CS skill quiz questions using Gemini API.")
    parser.add_argument(
        "--prompt",
        type=str,
        help="Custom instruction prompt for question generation (overrides automatic topic selection)."
    )
    parser.add_argument(
        "--input-file",
        type=str,
        help="Path to a JSON file containing the custom prompt (e.g., {'prompt': '...'}) or raw text."
    )

args = parser.parse_args()

# 일반 문제 생성 모드
custom_input = None
if args.prompt:
    custom_input = args.prompt
# elif args.input_file:
#     try:
#         with open(args.input_file, 'r', encoding='utf-8') as f:
#             file_content = f.read()
#             try:
#                 json_data = json.loads(file_content)
#                 custom_input = json_data.get("prompt", file_content)
#             except json.JSONDecodeError:
#                 custom_input = file_content
#     except FileNotFoundError:
#         print(f"Error: Input file '{args.input_file}' not found.", file=sys.stderr)
#         sys.exit(1)
#     except Exception as e:
#         print(f"Error reading input file '{args.input_file}': {e}", file=sys.stderr)
#         sys.exit(1)

generate_and_store_question(custom_user_prompt=custom_input)