import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // 파란색 계열
    },
    secondary: {
      main: '#f50057', // 분홍 계열
    },
    background: {
      default: '#f4f6f8',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

export default theme;
