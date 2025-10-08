import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Card, 
  CardContent, 
  TextField, 
  InputAdornment,
  Paper,
  Stack
} from "@mui/material";
import { 
  Search as SearchIcon, 
  LocationOn, 
  TrendingUp, 
  Shield, 
  Home as HomeIcon, 
  People,
  ArrowForward,
  CheckCircle
} from "@mui/icons-material";
import { Link } from "react-router";

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)' }}>
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFD23F 100%)',
        color: 'white',
        py: { xs: 8, md: 12 },
        position: 'relative',
        overflow: 'hidden'
      }}>
      <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <Typography 
              variant="h1" 
              component="h1" 
              sx={{ 
                mb: 3, 
                fontSize: { xs: '2.5rem', md: '4rem' },
                fontWeight: 800,
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                fontFamily: '"Montserrat", "Roboto", sans-serif'
              }}
            >
              Transparency for Safer Housing
          </Typography>
            <Typography 
              variant="h5" 
              sx={{ 
                mb: 6, 
                fontSize: { xs: '1.1rem', md: '1.3rem' },
                fontWeight: 400,
                opacity: 0.95,
                maxWidth: '800px',
                mx: 'auto',
                lineHeight: 1.6
              }}
            >
              Explore evictions, violations, affordability data, and community reviews for NYC buildings. 
              Make informed housing decisions with confidence.
          </Typography>

            {/* Search Box */}
            <Box sx={{ 
              maxWidth: '600px', 
              mx: 'auto', 
              mb: 4,
              display: 'flex',
              gap: 2,
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              <TextField
                fullWidth
                placeholder="Enter building address or neighborhood..."
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderRadius: 3,
                    '& fieldset': {
                      borderColor: 'transparent',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'white',
                    },
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '1.1rem',
                    py: 1.5,
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#FF6B35' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button 
                variant="contained" 
                size="large"
                sx={{ 
                  minWidth: '120px',
                  height: '56px',
                  backgroundColor: 'white',
                  color: '#FF6B35',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }
                }}
              >
                Search
          </Button>
        </Box>

            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Or{" "}
              <Link to="/search" style={{ color: 'white', textDecoration: 'underline', fontWeight: 500 }}>
                explore the map
              </Link>{" "}
              to discover trends
            </Typography>
          </Box>
        </Container>
          </Box>
          
      {/* Dataset Overview Cards */}
      <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'rgba(255,255,255,0.7)' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography 
              variant="h2" 
              sx={{ 
                mb: 3, 
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                color: '#2D3748',
                fontFamily: '"Montserrat", "Roboto", sans-serif'
              }}
            >
              Comprehensive Building Data
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#4A5568',
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.6
              }}
            >
              Access transparent information across multiple datasets to understand the full picture of NYC housing
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Card sx={{ 
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255,107,53,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 16px 48px rgba(255,107,53,0.2)',
                  borderColor: 'rgba(255,107,53,0.3)',
                }
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 3, 
                    backgroundColor: 'rgba(255,107,53,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3
                  }}>
                    <TrendingUp sx={{ fontSize: 30, color: '#FF6B35' }} />
                  </Box>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: '#2D3748' }}>
              Eviction Records
            </Typography>
                  <Typography variant="body1" sx={{ mb: 3, color: '#4A5568', lineHeight: 1.6 }}>
                    Historical eviction data and trends by building and neighborhood
            </Typography>
                  <Button 
                    variant="text" 
                    sx={{ 
                      color: '#FF6B35',
                      fontWeight: 600,
                      p: 0,
                      '&:hover': {
                        backgroundColor: 'transparent',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Explore evictions →
                  </Button>
                </CardContent>
              </Card>
          </Box>
          
            <Box sx={{ flex: 1 }}>
              <Card sx={{ 
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid rgba(239,68,68,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 16px 48px rgba(239,68,68,0.2)',
                  borderColor: 'rgba(239,68,68,0.3)',
                }
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 3, 
                    backgroundColor: 'rgba(239,68,68,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3
                  }}>
                    <Shield sx={{ fontSize: 30, color: '#EF4444' }} />
                  </Box>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: '#2D3748' }}>
                    Violations
            </Typography>
                  <Typography variant="body1" sx={{ mb: 3, color: '#4A5568', lineHeight: 1.6 }}>
                    Building code violations, safety issues, and compliance records
            </Typography>
                  <Button 
                    variant="text" 
                    sx={{ 
                      color: '#EF4444',
                      fontWeight: 600,
                      p: 0,
                      '&:hover': {
                        backgroundColor: 'transparent',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    View violations →
                  </Button>
                </CardContent>
              </Card>
          </Box>
          
            <Box sx={{ flex: 1 }}>
              <Card sx={{ 
                height: '100%',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid rgba(34,197,94,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 16px 48px rgba(34,197,94,0.2)',
                  borderColor: 'rgba(34,197,94,0.3)',
                }
              }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: 3, 
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3
                  }}>
                    <HomeIcon sx={{ fontSize: 30, color: '#22C55E' }} />
                  </Box>
                  <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: '#2D3748' }}>
              Affordable Housing
            </Typography>
                  <Typography variant="body1" sx={{ mb: 3, color: '#4A5568', lineHeight: 1.6 }}>
                    Rent-stabilized units, affordable housing programs, and pricing data
                  </Typography>
                  <Button 
                    variant="text" 
                    sx={{ 
                      color: '#22C55E',
                      fontWeight: 600,
                      p: 0,
                      '&:hover': {
                        backgroundColor: 'transparent',
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Find affordable units →
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Interactive Map Section */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 8, alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  mb: 4, 
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 700,
                  color: '#2D3748',
                  fontFamily: '"Montserrat", "Roboto", sans-serif'
                }}
              >
                Interactive Neighborhood Explorer
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 4, 
                  color: '#4A5568',
                  lineHeight: 1.6,
                  fontWeight: 400
                }}
              >
                Visualize eviction and violation trends across NYC with our interactive heatmap. 
                Identify patterns, compare neighborhoods, and make data-driven housing decisions.
              </Typography>
              
              <Stack spacing={3} sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <LocationOn sx={{ color: '#FF6B35', mt: 0.5, fontSize: 24 }} />
                  <Typography sx={{ color: '#4A5568', lineHeight: 1.6 }}>
                    Real-time heatmaps showing eviction and violation density
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <TrendingUp sx={{ color: '#FF6B35', mt: 0.5, fontSize: 24 }} />
                  <Typography sx={{ color: '#4A5568', lineHeight: 1.6 }}>
                    Historical trends and neighborhood comparisons
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <SearchIcon sx={{ color: '#FF6B35', mt: 0.5, fontSize: 24 }} />
                  <Typography sx={{ color: '#4A5568', lineHeight: 1.6 }}>
                    Filter by date range, violation type, and more
                  </Typography>
                </Box>
              </Stack>

              <Button 
                component={Link}
                to="/search"
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                sx={{
                  backgroundColor: '#FF6B35',
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#E55A2B',
                  }
                }}
              >
                Explore the Map
              </Button>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Paper 
                sx={{ 
                  aspectRatio: '16/10',
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  background: 'linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <img
                  src="/interactive-map-showing-nyc-neighborhoods-with-dat.jpg"
                  alt="Interactive neighborhood explorer map"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '16px'
                  }}
                />
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Community Reviews Section */}
      <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'rgba(255,255,255,0.7)' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 8, alignItems: 'center' }}>
            <Box sx={{ flex: 1, order: { xs: 2, lg: 1 } }}>
              <Paper 
                sx={{ 
                  aspectRatio: '16/10',
                  borderRadius: 4,
                  overflow: 'hidden',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  background: 'linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <img
                  src="/community-reviews-and-ratings-interface-with-user-.jpg"
                  alt="Community reviews interface"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '16px'
                  }}
                />
              </Paper>
            </Box>

            <Box sx={{ flex: 1, order: { xs: 1, lg: 2 } }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  mb: 4, 
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 700,
                  color: '#2D3748',
                  fontFamily: '"Montserrat", "Roboto", sans-serif'
                }}
              >
                Real Tenant Experiences
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 4, 
                  color: '#4A5568',
                  lineHeight: 1.6,
                  fontWeight: 400
                }}
              >
                Read authentic reviews from current and former tenants. Share your own experiences 
                to help others make informed decisions about their housing.
              </Typography>
              
              <Stack spacing={3} sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <People sx={{ color: '#FF6B35', mt: 0.5, fontSize: 24 }} />
                  <Typography sx={{ color: '#4A5568', lineHeight: 1.6 }}>
                    Verified tenant reviews and ratings
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Shield sx={{ color: '#FF6B35', mt: 0.5, fontSize: 24 }} />
                  <Typography sx={{ color: '#4A5568', lineHeight: 1.6 }}>
                    Landlord responses and moderation
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <CheckCircle sx={{ color: '#FF6B35', mt: 0.5, fontSize: 24 }} />
                  <Typography sx={{ color: '#4A5568', lineHeight: 1.6 }}>
                    Detailed feedback on maintenance, management, and more
            </Typography>
          </Box>
              </Stack>

              <Button 
                variant="outlined"
                size="large"
                sx={{
                  borderColor: '#FF6B35',
                  color: '#FF6B35',
                  borderRadius: 3,
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#E55A2B',
                    backgroundColor: 'rgba(255,107,53,0.05)',
                  }
                }}
              >
                Read Reviews
              </Button>
          </Box>
          </Box>
        </Container>
        </Box>

        {/* CTA Section */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Paper 
            sx={{ 
              textAlign: 'center', 
              p: { xs: 6, md: 8 },
              borderRadius: 6,
              background: 'linear-gradient(135deg, rgba(255,107,53,0.05) 0%, rgba(247,147,30,0.05) 100%)',
              border: '1px solid rgba(255,107,53,0.1)',
              boxShadow: '0 16px 48px rgba(255,107,53,0.1)'
            }}
          >
            <Typography 
              variant="h2" 
              sx={{ 
                mb: 3, 
                fontSize: { xs: '2rem', md: '3rem' },
                fontWeight: 700,
                color: '#2D3748',
                fontFamily: '"Montserrat", "Roboto", sans-serif'
              }}
            >
            Join Our Community
          </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 6, 
                color: '#4A5568',
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.6,
                fontWeight: 400
              }}
            >
              Create an account to save searches, post reviews, and access personalized dashboards 
              tailored to tenants and landlords.
          </Typography>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3} 
              justifyContent="center"
            >
          <Button 
            component={Link} 
            to="/signup" 
            variant="contained" 
            size="large"
                sx={{
                  backgroundColor: '#FF6B35',
                  borderRadius: 3,
                  px: 6,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: '#E55A2B',
                  }
                }}
          >
            Sign Up Free
          </Button>
          <Button 
            component={Link} 
            to="/signin" 
            variant="outlined" 
            size="large"
                sx={{
                  borderColor: '#FF6B35',
                  color: '#FF6B35',
                  borderRadius: 3,
                  px: 6,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#E55A2B',
                    backgroundColor: 'rgba(255,107,53,0.05)',
                  }
                }}
          >
            Log In
          </Button>
            </Stack>
          </Paper>
      </Container>
        </Box>
    </Box>
  );
}
