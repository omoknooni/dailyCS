import React, { useState } from 'react';
import { Box, TextField, Button, Typography, MenuItem } from '@mui/material';
import { createQuizSet } from '../api/quizApi';
import { useNavigate } from 'react-router-dom';

const categories = ['OS', 'Network', 'DB', 'Git', 'Security'];

const CreateQuizSetPage = () => {
  const navigate = useNavigate();

  // 상태 정의
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createQuizSet({ title, description, category });
      // 생성 후 메인 페이지로 이동
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('문제집 생성 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        문제집 생성
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}
      >
        <TextField
          label="문제집 제목"
          variant="outlined"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <TextField
          label="설명"
          variant="outlined"
          multiline
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <TextField
          select
          label="카테고리"
          variant="outlined"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </TextField>

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

export default CreateQuizSetPage;
