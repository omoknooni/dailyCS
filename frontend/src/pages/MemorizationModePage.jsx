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
import { fetchQuizSetById, fetchQuestionsByQuizSet } from '../api/quizApi';
import OptionButton from '../components/OptionButton';
import ProgressBar from '../components/ProgressBar';

/**
 * 배열을 무작위로 섞는 Fisher–Yates Shuffle
 * @param {Array} array
 * @returns {Array} 새롭게 섞인 복사본 배열
 */
const shuffleArray = (array) => {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const MemorizationModePage = () => {
  const { quizSetId } = useParams(); 
  const navigate = useNavigate();

  // ────────────────────────────────────────────────
  // 상태 정의
  // ────────────────────────────────────────────────
  const [quizSet, setQuizSet] = useState(null);       // 문제집 메타 정보
  const [questions, setQuestions] = useState([]);     // 문제 배열 (shuffledChoices 포함)
  const [loading, setLoading] = useState(true);       // 로딩 상태
  const [error, setError] = useState(null);           // 에러 메시지

  const [currentIndex, setCurrentIndex] = useState(0); // 0-based 현재 문제 인덱스
  const [showAnswer, setShowAnswer] = useState(false); // spacebar 누르면 true → 정답 강조

  // ────────────────────────────────────────────────
  // 1) 문제집 + 문제 목록을 불러오는 로직
  // ────────────────────────────────────────────────
  const loadQuizData = useCallback(async () => {
    try {
      // (1) 문제집 메타 정보 가져오기
      const quizSetRes = await fetchQuizSetById(quizSetId);
      setQuizSet(quizSetRes.data);

      // (2) 질문 목록 가져오기
      // 응답 예시: { quizset_id: "2", total_question_count: 5, questions: [ { id, question_text, choices: [ { id, text, order, is_correct}, … ] }, … ] }
      const questionsRes = await fetchQuestionsByQuizSet(quizSetId);
      const rawQuestions = questionsRes.data.questions || [];

      // (3) 문제 순서 랜덤 섞기 + 각 question 내부의 choices도 랜덤 섞어서 shuffledChoices 필드 추가
      const shuffledQuestions = shuffleArray(rawQuestions).map((q) => {
        const shuffledChoices = shuffleArray(q.choices || []);
        return {
          ...q,
          shuffledChoices,
        };
      });

      setQuestions(shuffledQuestions);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('암기 모드를 위한 문제를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }, [quizSetId]);

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

  // ────────────────────────────────────────────────
  // 2) 키보드 이벤트 핸들러 등록 (컴포넌트 마운트 시)  
  //    - ArrowRight: 다음 문제, ArrowLeft: 이전 문제  
  //    - Space: 정답 보이기(showAnswer = true)
  // ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (loading || error) return;

      switch (e.code) {
        case 'ArrowRight':
          e.preventDefault();
          goNextQuestion();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrevQuestion();
          break;
        case 'Space':
          e.preventDefault();
          // Space ▶ 정답 강조 (키를 누를때마다 true/false 토글)
          if (showAnswer) {
            setShowAnswer(false);
          } else {
            setShowAnswer(true);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, error, currentIndex, questions]);

  // ────────────────────────────────────────────────
  // 3) 다음/이전 문제로 이동 함수
  // ────────────────────────────────────────────────
  const goNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false); // 문제 바뀔 때 정답 숨김
    }
  };
  const goPrevQuestion = () => {
    if (currentIndex - 1 >= 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowAnswer(false);
    }
  };

  // ────────────────────────────────────────────────
  // 4) 로딩 / 에러 UI
  // ────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────
  // 5) 현재 문제/선택지 렌더링
  // ────────────────────────────────────────────────
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || {};
  const currentChoices = currentQuestion.shuffledChoices || [];

  // “A, B, C, D, …” 레이블
  const ALPHABET_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <Box>
      {/* ─────────────────────────────────────────────── 
           5-1) 문제집 제목 / 카테고리 
         ─────────────────────────────────────────────── */}
      <Typography variant="h5" gutterBottom>
        암기 모드 ▶ {quizSet.title} ({quizSet.category})
      </Typography>

      {/* ─────────────────────────────────────────────── 
           5-2) 진행률 표시 
         ─────────────────────────────────────────────── */}
      <ProgressBar current={currentIndex + 1} total={totalQuestions} />

      {/* ─────────────────────────────────────────────── 
           5-3) 문제 텍스트 (Markdown) 
         ─────────────────────────────────────────────── */}
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

      {/* ─────────────────────────────────────────────── 
           5-4) 선택지 그리드 (2열) 
           - showAnswer가 true이면 is_correct인 선택지를 강조(selected)
           - disabled를 true로 줘서 클릭 막기 
         ─────────────────────────────────────────────── */}
      <Grid container spacing={2}>
        {currentChoices.map((choiceObj, idx) => {
          const label = ALPHABET_LABELS[idx] || `선택${idx + 1}`;
          // showAnswer === true && choiceObj.is_correct === true 이면 selected
          const isSelected = showAnswer && choiceObj.is_correct;

          return (
            <Grid item xs={12} sm={6} key={choiceObj.id}>
              <OptionButton
                label={label}
                content={choiceObj.text}
                selected={isSelected}
                onClick={() => {}} // 클릭 이벤트는 사용하지 않음
              />
            </Grid>
          );
        })}
      </Grid>

      {/* ─────────────────────────────────────────────── 
           5-5) 하단 버튼(이전 / 다음)  
           - 키보드로도 조작 가능하지만, 마우스 클릭을 위해 추가 
         ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          onClick={goPrevQuestion}
          disabled={currentIndex === 0}
          sx={{ textTransform: 'none' }}
        >
          이전
        </Button>
        <Button
          variant="contained"
          onClick={goNextQuestion}
          disabled={currentIndex + 1 >= totalQuestions}
          sx={{ textTransform: 'none' }}
        >
          다음
        </Button>
      </Box>
    </Box>
  );
};

export default MemorizationModePage;
