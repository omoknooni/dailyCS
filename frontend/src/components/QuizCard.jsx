import React from 'react';
import { Card, CardContent, Typography, CardActions, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const QuizCard = ({ quizSet }) => {
  const navigate = useNavigate();
  
  const goPlay = () => {
    navigate(`/quiz/${quizSet.id}`);
  };
  const goMemorize = () => {
    navigate(`/quiz/${quizSet.id}/memorization`);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {quizSet.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          카테고리: {quizSet.category} | 문제 수: {quizSet.question_count || '?'}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
        >
          {quizSet.description}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={goPlay} sx={{ textTransform: 'none' }}>
          문제 풀기
        </Button>
        <Button size="small" onClick={goMemorize} sx={{ textTransform: 'none' }}>
          암기 모드
        </Button>
      </CardActions>
    </Card>
  );
};

export default QuizCard;
