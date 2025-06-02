import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Header = () => {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          DailyCS Quiz
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            sx={{ textTransform: 'none' }}
          >
            문제집 목록
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/quizsets/create"
            sx={{ textTransform: 'none' }}
          >
            문제집 생성
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
