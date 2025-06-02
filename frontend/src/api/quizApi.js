import axios from 'axios';

// 1) 기본 Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api', // 백엔드 API 엔드포인트 (CORS 허용 필요)
  headers: {
    'Content-Type': 'application/json',
    // 추후 JWT 토큰이 있으면 Authorization 헤더 추가 가능
  },
});

// 2) QuizSet(문제집) 관련 API
export const fetchQuizSets = () => {
  // GET /api/quizsets
  return apiClient.get('/quizsets/');
};

export const fetchQuizSetById = (quizSetId) => {
  // GET /api/quizsets/:id
  return apiClient.get(`/quizsets/${quizSetId}/`);
};

export const createQuizSet = (data) => {
  // POST /api/quizsets
  return apiClient.post('/quizsets/', data);
};

export const updateQuizSet = (quizSetId, data) => {
  // PUT /api/quizsets/:id
  return apiClient.put(`/quizsets/${quizSetId}/`, data);
};

export const deleteQuizSet = (quizSetId) => {
  // DELETE /api/quizsets/:id
  return apiClient.delete(`/quizsets/${quizSetId}/`);
};

// 3) Question(문제) 관련 API
export const fetchQuestionsByQuizSet = (quizSetId) => {
  // GET /api/quizsets/:id/questions
  return apiClient.get(`/quizsets/${quizSetId}/questions/`);
};

export const fetchQuestionById = (questionId) => {
  // GET /api/questions/:id
  return apiClient.get(`/questions/${questionId}/`);
};

export const submitAnswer = (questionId, answerData) => {
  // POST /api/questions/:id/submit
  // answerData 예: { selected: "A" } 또는 다중 정답이면 ["A","B"] 등
  return apiClient.post(`/questions/${questionId}/submit/`, answerData);
};

export const createQuestion = (data) => {
  // POST /api/questions
  return apiClient.post('/questions/', data);
};

export const updateQuestion = (questionId, data) => {
  // PUT /api/questions/:id
  return apiClient.put(`/questions/${questionId}/`, data);
};

export const deleteQuestion = (questionId) => {
  // DELETE /api/questions/:id
  return apiClient.delete(`/questions/${questionId}/`);
};

export const submitAllAnswers = (quizSetId, answers) => {
  // answers: [{ question_id: <int>, choice_ids: [<int>, …] }, …]
  return apiClient.post(`/quizsets/${quizSetId}/submit_all/`, { answers });
};
