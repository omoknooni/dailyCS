import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Button,
  Paper,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import {
  fetchQuizSetById,
  fetchQuestionsByQuizSet,
  submitAllAnswers, // 새로 추가된 API 함수
} from '../api/quizApi';
import OptionButton from '../components/OptionButton';
import ProgressBar from '../components/ProgressBar';

/**
 * 배열을 무작위로 섞는 유틸 함수 (Fisher–Yates Shuffle)
 * @param {Array} array - 랜덤하게 섞을 배열
 * @returns {Array} - 원본 배열을 복사한 뒤 섞은 새로운 배열
 */
const shuffleArray = (array) => {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const QuizPlayPage = () => {
  const { quizSetId } = useParams(); // URL 파라미터에서 문제집 ID를 가져옴
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────
  // 1) 컴포넌트 상태 정의
  // ─────────────────────────────────────────────────────
  const [quizSet, setQuizSet] = useState(null);           // 문제집 정보
  const [questions, setQuestions] = useState([]);         // 문제 목록 (shuffledChoices 포함)
  const [loading, setLoading] = useState(true);           // 로딩 상태
  const [error, setError] = useState(null);               // 에러 메시지

  const [currentIndex, setCurrentIndex] = useState(0);    // 0-based 현재 문제 인덱스
  // ** selectedChoiceIds: 사용자가 현재 문제에서 선택한 choice ID들의 배열 **
  const [selectedChoiceIds, setSelectedChoiceIds] = useState([]);

  // ** userAnswers: 퀴즈를 다 풀 때까지 누적된 사용자 답안 배열 **
  // 예: [ { question_id: 5, choice_ids: [12, 15] }, { question_id: 6, choice_ids: [18] }, … ]
  const [userAnswers, setUserAnswers] = useState([]);

  const [submitting, setSubmitting] = useState(false);    // 최종 제출 요청 로딩 상태

  // ─────────────────────────────────────────────────────
  // 2) 문제집 정보 + 문제 목록 불러오기 (랜덤 순서 적용)
  // ─────────────────────────────────────────────────────
  const loadQuizData = useCallback(async () => {
    try {
      // 2-1) 문제집 정보 가져오기
      const quizSetRes = await fetchQuizSetById(quizSetId);
      setQuizSet(quizSetRes.data);

      // 2-2) 문제 목록 가져오기 (변경된 응답 구조 사용)
      // 응답 예시: { quizset_id: "2", total_question_count: 5, questions: [ { id, question_text, choices: [ … ] }, … ] }
      const questionsRes = await fetchQuestionsByQuizSet(quizSetId);
      const rawQuestions = questionsRes.data.questions || [];

      // 2-3) 문제 순서를 랜덤으로 섞고, 각 question에 대해 shuffledChoices를 추가
      const shuffledQuestions = shuffleArray(rawQuestions).map((question) => {
        // question.choices: [ { id, text, order, is_correct }, … ]
        const shuffledChoices = shuffleArray(question.choices || []);
        return {
          ...question,
          shuffledChoices,
        };
      });

      setQuestions(shuffledQuestions);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('문제를 불러오는 중에 오류가 발생했습니다.');
      setLoading(false);
    }
  }, [quizSetId]);

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

  // ─────────────────────────────────────────────────────
  // 3) “다음 문제 or 마지막 문제에서 한 번에 제출” 처리
  // ─────────────────────────────────────────────────────
  const handleNextOrSubmit = async () => {
    // (1) 아직 아무 선택지도 클릭하지 않았다면 무시
    if (selectedChoiceIds.length === 0) return;
    setSubmitting(true);

    // (2) 현재 question에 대한 answer 객체 생성
    const currentQuestion = questions[currentIndex];
    const answerEntry = {
      question_id: currentQuestion.id,
      // multi-select 상황을 고려해 배열 형태로 전달
      choice_ids: selectedChoiceIds.slice(), 
    };
    // (3) userAnswers에 추가
    const newUserAnswers = [...userAnswers, answerEntry];
    setUserAnswers(newUserAnswers);

    // (4) 마지막 문제인지 확인
    const isLast = currentIndex + 1 >= questions.length;

    if (!isLast) {
      // 중간 문제인 경우: 선택지 초기화 → 다음 문제로 이동
      setSelectedChoiceIds([]);
      setCurrentIndex((prev) => prev + 1);
      setSubmitting(false);
    } else {
      // 마지막 문제인 경우: 한 번에 채점 API 호출
      try {
        const response = await submitAllAnswers(quizSetId, newUserAnswers);
        // 응답 예시:
        // {
        //   quizset_id: 2,
        //   total_questions: 5,
        //   total_correct: 3,
        //   results: [
        //     { question_id: 10, is_correct: true, correct_choice_ids: [15] },
        //     { question_id: 11, is_correct: false, correct_choice_ids: [18, 22] },
        //     …
        //   ]
        // }

        // 결과 페이지로 이동 (응답 데이터를 state로 전달)
        navigate(`/quiz/${quizSetId}/result`, {
          state: { ...response.data },
        });
      } catch (err) {
        console.error(err);
        setError('퀴즈 결과를 제출하는 도중 오류가 발생했습니다.');
        setSubmitting(false);
      }
    }
  };

  // ─────────────────────────────────────────────────────
  // 4) 선택지 클릭 시 이벤트 핸들러
  // ─────────────────────────────────────────────────────
  const handleOptionClick = (choiceId) => {
    if (submitting) return; // 제출 로딩 중에는 클릭 무시

    // 현재 질문의 올바른 선택지 개수(복수정답 여부)를 확인
    const currentQuestion = questions[currentIndex];
    const correctCount = (currentQuestion.shuffledChoices || []).filter(
      (c) => c.is_correct
    ).length;

    // 4-1) 복수정답인 경우 → 클릭한 choiceId를 토글(추가/제거)하여 배열 관리
    if (correctCount > 1) {
      // 이미 배열에 있으면 제거, 없으면 추가
      if (selectedChoiceIds.includes(choiceId)) {
        setSelectedChoiceIds((prev) =>
          prev.filter((id) => id !== choiceId)
        );
      } else {
        setSelectedChoiceIds((prev) => [...prev, choiceId]);
      }
    } else {
      // 4-2) 단일정답인 경우 → 이전 선택 무시하고 “한 개만” 배열에 담음
      setSelectedChoiceIds([choiceId]);
    }
  };

  // ─────────────────────────────────────────────────────
  // 5) 로딩 / 에러 상태 UI
  // ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // ─────────────────────────────────────────────────────
  // 6) 현재 문제 & 선택지 렌더링
  // ─────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex] || {};
  const totalQuestions = questions.length;
  const currentChoices = currentQuestion.shuffledChoices || [];

  // “A, B, C, D, …” 레이블 (최대 26개)
  const ALPHABET_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <Box>
      {/* 6-1) 문제집 제목 및 카테고리 */}
      <Typography variant="h5" gutterBottom>
        {quizSet.title} ({quizSet.category})
      </Typography>

      {/* 6-2) 진행률 표시 */}
      <ProgressBar current={currentIndex + 1} total={totalQuestions} />

      {/* 6-3) 문제 텍스트 (Markdown 렌더링) */}
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          문제 {currentIndex + 1}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            <ReactMarkdown>
              {currentQuestion.question_text || ''}
            </ReactMarkdown>
          </Typography>
        </Box>
      </Paper>

      {/* 6-4) 선택지 그리드 레이아웃 (2열) */}
      <Grid container spacing={2}>
        {currentChoices.map((choiceObj, idx) => {
          // choiceObj: { id, text, order, is_correct }
          const label = ALPHABET_LABELS[idx] || `선택${idx + 1}`;
          return (
            <Grid item xs={12} sm={6} key={choiceObj.id}>
              <OptionButton
                label={label}
                content={choiceObj.text}
                // 여러 개 선택할 수 있으므로 includes()로 판별
                selected={selectedChoiceIds.includes(choiceObj.id)}
                disabled={submitting}
                onClick={() => handleOptionClick(choiceObj.id)}
              />
            </Grid>
          );
        })}
      </Grid>

      {/* 6-5) “다음 문제/제출 및 결과보기” 버튼 */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          disabled={selectedChoiceIds.length === 0 || submitting}
          onClick={handleNextOrSubmit}
          sx={{ textTransform: 'none' }} 
          // * 이 버튼 자체도 대문자 변환 제거(선택사항)
        >
          {currentIndex + 1 < totalQuestions
            ? '다음 문제'
            : '제출 및 결과보기'}
        </Button>
      </Box>
    </Box>
  );
};

export default QuizPlayPage;
