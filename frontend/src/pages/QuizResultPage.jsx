import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Typography, Button, List, ListItem, ListItemText } from '@mui/material';

const QuizResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { quizSetId } = useParams();

  // QuizPlayPage에서 state로 넘겨준 전체 응답 데이터를 구조 분해
  // 예시: { quizset_id, total_questions, total_correct, results: [ { question_id, is_correct, correct_choice_ids }, … ] }
  const {
    total_questions = 0,
    total_correct = 0,
    results = [],
  } = location.state || {};

  // 정답 개수 세기
  const correctCount = results.filter((r) => r).length;


  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        퀴즈 결과
      </Typography>

      <Typography variant="h6" sx={{ mb: 2 }}>
        정답 {total_correct} / {total_questions} ({ 
          total_questions > 0 
            ? Math.round((total_correct / total_questions) * 100) 
            : 0 
          }%)
      </Typography>

      <List>
        {results.map((item) => (
          <ListItem key={item.question_id}>
            <ListItemText
              primary={`문제 ID ${item.question_id} : ${
                item.is_correct ? '정답' : '오답'
              }`}
              secondary={`올바른 Choice ID: [${item.correct_choice_ids.join(', ')}]`}
              primaryTypographyProps={{
                color: item.is_correct ? 'success.main' : 'error.main',
              }}
            />
          </ListItem>
        ))}
      </List>

      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button
          variant="contained"
          sx={{ mr: 2 }}
          onClick={() => navigate(`/quiz/${quizSetId}`)}
        >
          다시 풀기
        </Button>
        <Button variant="outlined" onClick={() => navigate('/')}>
          다른 문제집 선택
        </Button>
      </Box>
    </Box>
  );
};

export default QuizResultPage;
