import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Container,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  Rating,
  CircularProgress,
  Alert,
  Grid,
} from "@mui/material";
import {
  LocationOn,
  Home as HomeIcon,
} from "@mui/icons-material";
import axiosInstance from "../api/axiosInstance";
import { API_ENDPOINTS } from "../constants";

interface PublicReview {
  id: number;
  user_id: number;
  bbl: string;
  rating: number | null;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
  borough?: string;
  zip?: string;
  address?: string;
}

const PublicReviews: React.FC = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedBorough, setSelectedBorough] = useState("All Boroughs");
  const [selectedZip, setSelectedZip] = useState("");
  const [selectedBbl, setSelectedBbl] = useState("");

  const boroughs = ["All Boroughs", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedBorough !== "All Boroughs") {
        params.append("borough", selectedBorough);
      }
      if (selectedZip) {
        params.append("zip", selectedZip);
      }
      if (selectedBbl) {
        params.append("bbl", selectedBbl);
      }

      const response = await axiosInstance.get<{ data?: PublicReview[] } | PublicReview[]>(
        `${API_ENDPOINTS.COMMUNITY.REVIEWS}public/?${params.toString()}`
      );
      
      const data = (response.data as any)?.data || response.data;
      setReviews(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [selectedBorough, selectedZip, selectedBbl]);

  const handleViewBuilding = (bbl: string) => {
    navigate(`/building/${bbl}`);
  };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)",
      py: 4, 
      px: { xs: 2, sm: 3 }, 
      pt: { xs: 8, sm: 10 } 
    }}>
      <Container maxWidth="xl">
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 700, 
            color: "#2D3748",
            fontFamily: '"Montserrat", "Roboto", sans-serif',
            fontSize: { xs: '2rem', md: '3rem' },
            mb: 4
          }}
        >
          Public Reviews
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            color: "#4A5568",
            mb: 4,
            maxWidth: '800px'
          }}
        >
          Read authentic reviews from verified tenants. Filter by borough, ZIP code, or building to find reviews that matter to you.
        </Typography>

        <Grid container spacing={3}>
          {/* Filter Sidebar */}
          <Grid {...({ item: true, xs: 12, md: 3 } as any)}>
            <Paper sx={{ p: 3, position: 'sticky', top: 100 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Filters
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Borough</InputLabel>
                <Select
                  value={selectedBorough}
                  label="Borough"
                  onChange={(e) => setSelectedBorough(e.target.value)}
                >
                  {boroughs.map((borough) => (
                    <MenuItem key={borough} value={borough}>
                      {borough}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="ZIP Code"
                value={selectedZip}
                onChange={(e) => setSelectedZip(e.target.value)}
                sx={{ mb: 2 }}
                placeholder="e.g., 10001"
              />

              <TextField
                fullWidth
                label="Building BBL"
                value={selectedBbl}
                onChange={(e) => setSelectedBbl(e.target.value)}
                placeholder="e.g., 1000120001"
              />
            </Paper>
          </Grid>

          {/* Reviews List */}
          <Grid {...({ item: true, xs: 12, md: 9 } as any)}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : reviews.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  No reviews found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try adjusting your filters or check back later.
                </Typography>
              </Paper>
            ) : (
              <Box>
                <Typography variant="body1" sx={{ mb: 2, color: "#4A5568" }}>
                  Showing {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </Typography>
                {reviews.map((review) => (
                  <Card 
                    key={review.id} 
                    sx={{ 
                      mb: 2,
                      '&:hover': {
                        boxShadow: 4,
                      }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {review.title}
                        </Typography>
                        {review.rating && (
                          <Rating value={review.rating} readOnly size="small" />
                        )}
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          mb: 2, 
                          color: "#4A5568",
                          whiteSpace: "pre-line"
                        }}
                      >
                        {review.body}
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        {review.address && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <HomeIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {review.address}
                            </Typography>
                          </Box>
                        )}
                        {review.borough && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOn fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {review.borough}
                              {review.zip && `, ${review.zip}`}
                            </Typography>
                          </Box>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>

                      {review.bbl && (
                        <Box sx={{ mt: 2 }}>
                          <Typography
                            variant="body2"
                            component="button"
                            onClick={() => handleViewBuilding(review.bbl)}
                            sx={{
                              color: '#FF6B35',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              border: 'none',
                              background: 'none',
                              '&:hover': {
                                color: '#E55A2B',
                              }
                            }}
                          >
                            View Building Details →
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default PublicReviews;

