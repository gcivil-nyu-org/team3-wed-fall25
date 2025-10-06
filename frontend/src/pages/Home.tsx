import { Box, Typography, Button, Container } from "@mui/material";
import { Link } from "react-router";

export default function Home() {
  return (
    <Box sx={{ padding: 4, marginTop: 8 }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" component="h1" sx={{ mb: 3, color: 'primary.main' }}>
            Housing Transparency
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, color: 'text.secondary' }}>
            Explore NYC building data, evictions, violations, and community reviews
          </Typography>
          <Button variant="contained" size="large" sx={{ mr: 2 }}>
            Search Buildings
          </Button>
          <Button variant="outlined" size="large">
            View Map
          </Button>
        </Box>

        {/* Simple Cards */}
        <Box sx={{ display: 'flex', gap: 3, mb: 6, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 300, p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Eviction Records
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Historical eviction data and trends
            </Typography>
            <Button variant="text">Explore →</Button>
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 300, p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Building Violations
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Safety issues and compliance records
            </Typography>
            <Button variant="text">View →</Button>
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 300, p: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Affordable Housing
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Rent-stabilized units and pricing data
            </Typography>
            <Button variant="text">Find →</Button>
          </Box>
        </Box>

        {/* CTA Section */}
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Join Our Community
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Create an account to save searches and access personalized dashboards
          </Typography>
          <Button 
            component={Link} 
            to="/signup" 
            variant="contained" 
            size="large"
            sx={{ mr: 2 }}
          >
            Sign Up Free
          </Button>
          <Button 
            component={Link} 
            to="/signin" 
            variant="outlined" 
            size="large"
          >
            Log In
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
