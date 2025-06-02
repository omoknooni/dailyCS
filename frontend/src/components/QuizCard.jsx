import React from 'react';
import { Card, CardContent, Typography, CardActionArea } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/**
 * props:
 *  - quizSet: { id, title, description, category, ... }
 */
const QuizCard = ({ quizSet }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // 클릭 시 해당 문제집 ID의 퀴즈 플레이 페이지로 이동
    navigate(`/quiz/${quizSet.id}`);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardActionArea onClick={handleClick}>
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
      </CardActionArea>
    </Card>
  );
};

export default QuizCard;
