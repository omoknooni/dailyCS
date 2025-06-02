import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { fetchQuizSets, createQuestion } from '../api/quizApi';
import { useNavigate, useLocation } from 'react-router-dom';

const CreateQuestionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedQuizSetId = location.state?.quizSetId || ''; // 만약 문제집 ID가 state로 전달됐다면

  // 상태 정의
  const [quizSets, setQuizSets] = useState([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [errorSets, setErrorSets] = useState(null);

  const [quizSetId, setQuizSetId] = useState(preselectedQuizSetId);
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A'); // 단일 정답 예시
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // 문제집 목록 불러오기
  useEffect(() => {
    fetchQuizSets()
      .then((res) => {
        setQuizSets(res.data);
        setLoadingSets(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorSets('문제집 목록을 불러오는 중 오류 발생');
        setLoadingSets(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quizSetId) {
      setError('먼저 문제집을 선택해주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      await createQuestion({
        quiz_set: quizSetId,
        question_text: questionText,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_answer: correctAnswer,
        explanation,
      });
      // 생성 후, 해당 문제집 풀기 페이지로 돌아가거나 목록으로
      navigate(`/quiz/${quizSetId}`);
    } catch (err) {
      console.error(err);
      setError('문제 생성 중 오류 발생');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSets) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (errorSets) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography color="error">{errorSets}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        문제 생성
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}
      >
        {/* 1) 문제집 선택 (드롭다운) */}
        <TextField
          select
          label="문제집 선택"
          value={quizSetId}
          onChange={(e) => setQuizSetId(e.target.value)}
        >
          {quizSets.map((set) => (
            <MenuItem key={set.id} value={set.id}>
              {set.title}
            </MenuItem>
          ))}
        </TextField>

        {/* 2) 문제 텍스트 (Markdown 가능) */}
        <TextField
          label="문제 내용 (Markdown)"
          variant="outlined"
          multiline
          rows={4}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          required
        />

        {/* 3) 선택지 A ~ D */}
        <TextField
          label="선택지 A (Markdown)"
          variant="outlined"
          multiline
          rows={2}
          value={optionA}
          onChange={(e) => setOptionA(e.target.value)}
          required
        />
        <TextField
          label="선택지 B (Markdown)"
          variant="outlined"
          multiline
          rows={2}
          value={optionB}
          onChange={(e) => setOptionB(e.target.value)}
          required
        />
        <TextField
          label="선택지 C (Markdown)"
          variant="outlined"
          multiline
          rows={2}
          value={optionC}
          onChange={(e) => setOptionC(e.target.value)}
          required
        />
        <TextField
          label="선택지 D (Markdown)"
          variant="outlined"
          multiline
          rows={2}
          value={optionD}
          onChange={(e) => setOptionD(e.target.value)}
          required
        />

        {/* 4) 정답 (단일 정답만 처리 예시) */}
        <TextField
          select
          label="정답 (단일)"
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
        >
          {['A', 'B', 'C', 'D'].map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>

        {/* 5) 해설(선택사항) */}
        <TextField
          label="해설 (Markdown, 선택사항)"
          variant="outlined"
          multiline
          rows={3}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{ mr: 2 }}
          >
            {submitting ? '생성 중...' : '생성'}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            취소
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default CreateQuestionPage;
