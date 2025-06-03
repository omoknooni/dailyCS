import os
import sys
import boto3
from google import genai
from google.genai import types
from datetime import datetime

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
BUCKET_NAME = os.environ.get("BUCKET_NAME")

USER_INPUT = """
CS스킬 문제를 만들어주세요.
"""

s3 = boto3.client("s3", aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"), aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"), region_name=os.environ.get("AWS_REGION"))

def generate():
    client = genai.Client(
        api_key=GEMINI_API_KEY,
    )

    model = "gemini-2.5-flash-preview-05-20"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=USER_INPUT),
            ],
        ),
    ]
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
                    enum = ["Algorithm", "OS", "Network", "DB", "Git", "DevOps"],
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

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        print(response.text)
    except genai.errors.ClientError as ce:
        print(f"Error: {ce}")
        if hasattr(ce, 'status_code') and e.status_code == 429:
            print("Rate limit exceeded. Please try again later.")
            sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


    if response and response.text:
        try:
            # put response.text to s3
            now = datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
            s3.put_object(
                Body=response.text,
                Bucket=BUCKET_NAME,
                Key=f"cs-question/q-{now}.json",
            )
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    generate()
