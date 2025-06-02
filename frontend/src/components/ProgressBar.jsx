import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

/**
 * props:
 *  - current: 현재 문제 번호 (1-based index)
 *  - total: 총 문제 수
 */
const ProgressBar = ({ current, total }) => {
  const percent = Math.floor((current / total) * 100);

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">
          {current} / {total} 문제
        </Typography>
        <Typography variant="body2">{percent}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={percent} />
    </Box>
  );
};

export default ProgressBar;
