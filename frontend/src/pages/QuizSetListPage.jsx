import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { fetchQuizSets } from '../api/quizApi';
import QuizCard from '../components/QuizCard';
import { Link as RouterLink } from 'react-router-dom';

const QuizSetListPage = () => {
  const [quizSets, setQuizSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQuizSets()
      .then((res) => {
        // API 응답에서 quizsets 데이터 추출
        // 예: { data: [{ id, title, description, category, question_count }, …] }
        setQuizSets(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('문제집을 불러오는 중에 오류가 발생했습니다.');
        setLoading(false);
      });
  }, []);

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        문제집 목록
      </Typography>

      {quizSets.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography>생성된 문제집이 없습니다.</Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/quizsets/create"
            sx={{ mt: 2 }}
          >
            문제집 생성하기
          </Button>
        </Box>
      )}

      {quizSets.map((quizSet) => (
        <QuizCard key={quizSet.id} quizSet={quizSet} />
      ))}
    </Box>
  );
};

export default QuizSetListPage;
