import React from 'react';
import { Button, Typography, Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';

/**
 * props:
 *  - label: 'A', 'B', 'C', 'D'
 *  - content: Markdown 형식의 선택지 텍스트
 *  - selected: boolean (현재 선택된 상태인지)
 *  - disabled: boolean (풀이 완료 후 선택 불가하게 할 때)
 *  - onClick: 선택 시 호출될 함수
 */
const OptionButton = ({ label, content, selected, disabled, onClick }) => {
  return (
    <Button
      variant={selected ? 'contained' : 'outlined'}
      color={selected ? 'primary' : 'inherit'}
      fullWidth
      onClick={onClick}
      disabled={disabled}
      sx={{
        textAlign: 'left',
        height: '100%',
        p: 2,
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      <Box sx={{ mr: 1, minWidth: 24 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {label}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2">
          <ReactMarkdown>{content || ''}</ReactMarkdown>
        </Typography>
      </Box>
    </Button>
  );
};

export default OptionButton;
