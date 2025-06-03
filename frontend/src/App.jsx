import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';
import theme from './theme';

// 페이지 컴포넌트 import
import QuizSetListPage from './pages/QuizSetListPage';
import QuizPlayPage from './pages/QuizPlayPage';
import QuizResultPage from './pages/QuizResultPage';
import CreateQuizSetPage from './pages/CreateQuizSetPage';
import CreateQuestionPage from './pages/CreateQuestionPage';
import MemorizationModePage from './pages/MemorizationModePage';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {/* 공통 헤더 */}
        <Header />

        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Routes>
            {/* 문제집 목록 */}
            <Route path="/" element={<QuizSetListPage />} />
            {/* 문제집 생성 */}
            <Route path="/quizsets/create" element={<CreateQuizSetPage />} />
            {/* 문제 생성 */}
            <Route path="/questions/create" element={<CreateQuestionPage />} />

            {/* 문제풀기 (QuizSet ID 기반) */}
            <Route path="/quiz/:quizSetId" element={<QuizPlayPage />} />
            {/* 퀴즈 결과 (옵션) */}
            <Route path="/quiz/:quizSetId/result" element={<QuizResultPage />} />

            {/* 암기 모드 */}
            <Route path="/quiz/:quizSetId/memorization" element={<MemorizationModePage />} />
          </Routes>
        </Container>

        {/* 공통 푸터 */}
        <Footer />
      </Router>
    </ThemeProvider>
  );
}

export default App;
