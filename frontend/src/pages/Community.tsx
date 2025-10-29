import React from 'react';
import { Typography, Container, Paper } from '@mui/material';

const Community: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          Community
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Community features coming soon!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This page will contain community-related functionality and features.
        </Typography>
      </Paper>
    </Container>
  );
};

export default Community;
