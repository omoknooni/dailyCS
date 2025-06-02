import React from 'react';
import { Box, Typography, Link } from '@mui/material';

const Footer = () => (
  <Box
    component="footer"
    sx={{
      py: 2,
      px: 2,
      mt: 'auto',
      backgroundColor: (theme) => theme.palette.background.paper,
      textAlign: 'center',
    }}
  >
    <Typography variant="body2" color="text.secondary">
      © 2025 DailyCS. All rights reserved.
    </Typography>
  </Box>
);

export default Footer;
