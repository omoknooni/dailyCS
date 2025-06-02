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
  submitAllAnswers,
} from '../api/quizApi';
import OptionButton from '../components/OptionButton';
import ProgressBar from '../components/ProgressBar';

/**
 * 배열을 무작위로 섞는 유틸 함수 (Fisher–Yates Shuffle)
 * @param {Array} array - 랜덤하게 섞을 배열
 * @returns {Array} - 원본 배열을 복사한 후 섞은 새로운 배열
 */
const shuffleArray = (array) => {
  const arr = array.slice(); // 원본 훼손 방지
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const QuizPlayPage = () => {
  const { quizSetId } = useParams(); // URL 파라미터로부터 문제집 ID
  const navigate = useNavigate();

  // 1) 상태 정의
  const [quizSet, setQuizSet] = useState(null);
  const [questions, setQuestions] = useState([]); // 실제 화면에 보여줄 문제 배열
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0); // 0-based index
  const [submitting, setSubmitting] = useState(false);

  // selectedChoiceId: 사용자가 클릭한 선택지의 ID (choices[].id)
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);

  const [userAnswers, setUserAnswers] = useState([]);

  // 전체 문제에 대한 정답/오답 결과를 저장 (true/false)
  const [results, setResults] = useState([]);

  // 2) 문제집 정보 + 문제 목록 불러오기 (랜덤 순서 적용)
  const loadQuizData = useCallback(async () => {
    try {
      // 2-1) 문제집 정보(fetchQuizSetById) 가져오기
      const quizSetRes = await fetchQuizSetById(quizSetId);
      // 예: quizSetRes.data = { id: 2, title: '네트워크 문제집', category: 'Network', ... }
      setQuizSet(quizSetRes.data);

      // 2-2) 문제 목록(fetchQuestionsByQuizSet) 가져오기
      // 새로운 응답 구조: { quizset_id, total_question_count, questions: [ {...}, {...}, ... ] }
      const questionsRes = await fetchQuestionsByQuizSet(quizSetId);
      const rawQuestions = questionsRes.data.questions || [];

      // 2-3) 문제 순서를 무작위로 섞기
      const shuffledQuestions = shuffleArray(rawQuestions).map((question) => {
        // 각 question 내부의 choices 배열도 섞어서 새로운 필드에 담기
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
      setError('문제를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }, [quizSetId]);

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

  // 3) 답안 제출 처리 (즉시 채점 예시)
  const handleNextOrSubmit = async () => {
    if (!selectedChoiceId) return; // 선택된 선택지 ID가 없으면 무시
    setSubmitting(true);

    // 현재 문제에 대해 유저가 고른 답안
    const currentQuestion = questions[currentIndex];
    const answerEntry = {
      question_id: currentQuestion.id,
      choice_ids: [selectedChoiceId],
    };

    const newUserAnswers = [...userAnswers, answerEntry];
    setUserAnswers(newUserAnswers);

    const isLast = currentIndex + 1 >= questions.length;

    if (!isLast) {
      setSelectedChoiceId(null);
      setCurrentIndex((prev) => prev + 1);
      setSubmitting(false);
    } else {
      try {
        const response = await submitAllAnswers(quizSetId, newUserAnswers);
        navigate(`/quiz/${quizSetId}/result`, {
          state: {...response.data},
        });
      } catch (err) {
        console.error(err);
        setError("퀴즈 결과 제출 오류");
        setSubmitting(false);
      }
    }
  };

  // 4) 선택지 클릭 시 실행됨
  const handleOptionClick = (choiceId) => {
    if (submitting) return;
    setSelectedChoiceId(choiceId);
  };

  // 로딩, 에러 처리
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

  // 5) 현재 보여줄 문제 및 선택지
  const currentQuestion = questions[currentIndex] || {};
  const totalQuestions = questions.length;
  // 현재 문제의 섞인 선택지 배열
  const currentChoices = currentQuestion.shuffledChoices || [];

  // 레이블 A, B, C, D ... (선택지 개수에 맞춰 동적으로 생성 가능)
  const ALPHABET_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <Box>
      {/* 1) 문제집 제목 및 정보 */}
      <Typography variant="h5" gutterBottom>
        {quizSet.title} ({quizSet.category})
      </Typography>

      {/* 2) 진행률 표시 */}
      <ProgressBar
        current={currentIndex + 1}
        total={totalQuestions}
      />

      {/* 3) 문제 텍스트 (Markdown 렌더링) */}
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

      {/* 4) 선택지 렌더링: Grid 레이아웃(2x2 혹은 반응형) */}
      <Grid container spacing={2}>
        {currentChoices.map((choiceObj, idx) => {
          // choiceObj: { id, text, order, is_correct }
          const label = ALPHABET_LABELS[idx] || `선택${idx + 1}`;
          return (
            <Grid item xs={12} sm={6} key={choiceObj.id}>
              <OptionButton
                label={label}
                content={choiceObj.text}
                // selected인지 판별: 현재 선택된 choiceId와 비교
                selected={selectedChoiceId === choiceObj.id}
                disabled={submitting}
                // 클릭 시 해당 choiceId를 저장
                onClick={() => handleOptionClick(choiceObj.id)}
              />
            </Grid>
          );
        })}
      </Grid>

      {/* 5) 제출 버튼 */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          disabled={!selectedChoiceId || submitting}
          onClick={handleNextOrSubmit}
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
