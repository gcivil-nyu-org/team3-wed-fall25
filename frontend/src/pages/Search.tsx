import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  Rating,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  LocationOn,
  Warning,
  Shield,
  Clear,
} from "@mui/icons-material";
import { searchBuildings } from "../api/index.js";

// Temporarily inline the BuildingSearchResult type to resolve export issue
interface BuildingSearchResult {
  bbl: string;
  address: string;
  borough: string;
  zip: string;
  units?: number;
  evictions3yr: number;
  openViolations: number;
  communityRating?: number;
  reviewCount?: number;
  riskLevel: "Low Risk" | "Moderate Risk" | "High Risk";
  rentStabilized: boolean;
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BuildingSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  
  // Filter states - only include filters that are actually available in the API
  const [selectedBorough, setSelectedBorough] = useState("All Boroughs");
  const [rentStabilized, setRentStabilized] = useState(false);
  const [evictionsFilter, setEvictionsFilter] = useState("Any");
  const [violationsFilter, setViolationsFilter] = useState("Any");
  const [zipCode, setZipCode] = useState("");

  const boroughs = ["All Boroughs", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert filter values to API parameters
      const searchParams: any = {};
      
      if (searchQuery.trim()) {
        searchParams.query = searchQuery.trim();
      }
      
      if (selectedBorough !== "All Boroughs") {
        searchParams.borough = selectedBorough;
      }
      
      if (rentStabilized) {
        searchParams.rentStabilized = true;
      }
      
      if (zipCode.trim()) {
        searchParams.zipCode = zipCode.trim();
      }
      
      // Convert evictions filter to min/max values
      if (evictionsFilter !== "Any") {
        switch (evictionsFilter) {
          case "0":
            searchParams.evictionsMin = 0;
            searchParams.evictionsMax = 0;
            break;
          case "1-2":
            searchParams.evictionsMin = 1;
            searchParams.evictionsMax = 2;
            break;
          case "3-5":
            searchParams.evictionsMin = 3;
            searchParams.evictionsMax = 5;
            break;
          case "6+":
            searchParams.evictionsMin = 6;
            break;
        }
      }
      
      // Convert violations filter to min/max values
      if (violationsFilter !== "Any") {
        switch (violationsFilter) {
          case "0":
            searchParams.violationsMin = 0;
            searchParams.violationsMax = 0;
            break;
          case "1-5":
            searchParams.violationsMin = 1;
            searchParams.violationsMax = 5;
            break;
          case "6-10":
            searchParams.violationsMin = 6;
            searchParams.violationsMax = 10;
            break;
          case "11+":
            searchParams.violationsMin = 11;
            break;
        }
      }
      
      console.log("Searching with params:", searchParams);
      const response = await searchBuildings(searchParams);
      console.log("Search response:", response);
      setSearchResults(response.data);
      setTotalResults(response.total);
    } catch (err) {
      setError("Failed to search buildings. Please try again.");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedBorough("All Boroughs");
    setRentStabilized(false);
    setEvictionsFilter("Any");
    setViolationsFilter("Any");
    setZipCode("");
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "High Risk": return "error";
      case "Moderate Risk": return "warning";
      case "Low Risk": return "success";
      default: return "default";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "High Risk": return <Warning color="error" />;
      case "Moderate Risk": return <Warning color="warning" />;
      case "Low Risk": return <Shield color="success" />;
      default: return undefined;
    }
  };

  const handleViewDetails = (bbl: string) => {
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
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom 
          sx={{ 
            fontWeight: 700, 
            color: "#2D3748",
            fontFamily: '"Montserrat", "Roboto", sans-serif',
            fontSize: { xs: '2rem', md: '3rem' }
          }}
        >
          Search Buildings
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            mb: 3, 
            color: "#4A5568",
            lineHeight: 1.6,
            fontWeight: 400
          }}
        >
          Find detailed information about NYC buildings including evictions, violations, and affordability data.
        </Typography>
        
        {/* Search Bar */}
        <Box sx={{ display: "flex", gap: 2, maxWidth: 800, mt: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by address, borough, or ZIP code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                "& fieldset": {
                  borderColor: "rgba(255, 107, 53, 0.2)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255, 107, 53, 0.4)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#FF6B35",
                },
              },
              "& .MuiInputBase-input": {
                fontSize: "1.1rem",
                py: 1.5,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#FF6B35" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading}
            sx={{ 
              minWidth: 120,
              backgroundColor: "#FF6B35",
              boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
              "&:hover": {
                backgroundColor: "#E55A2B",
                boxShadow: "0 6px 16px rgba(255, 107, 53, 0.4)",
              },
              "&:disabled": {
                backgroundColor: "rgba(255, 107, 53, 0.5)",
              },
            }}
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" }, mt: 3 }}>
        {/* Left Sidebar - Filters */}
        <Box sx={{ width: { xs: "100%", md: "300px" }, flexShrink: 0 }}>
          <Paper sx={{ 
            p: 3, 
            position: { xs: "static", md: "sticky" }, 
            top: { xs: 0, md: 20 },
            boxShadow: "0 8px 32px rgba(255, 107, 53, 0.1)",
            borderRadius: 4,
            height: "fit-content",
            zIndex: 1,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 107, 53, 0.1)"
          }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  flexGrow: 1,
                  fontWeight: 600,
                  color: "#2D3748",
                  fontFamily: '"Montserrat", "Roboto", sans-serif'
                }}
              >
                Filters
              </Typography>
              <IconButton onClick={handleClearFilters} size="small">
                <Clear />
              </IconButton>
            </Box>

            {/* Borough Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Borough</InputLabel>
              <Select
                value={selectedBorough}
                onChange={(e) => setSelectedBorough(e.target.value)}
                label="Borough"
              >
                {boroughs.map((borough) => (
                  <MenuItem key={borough} value={borough}>
                    {borough}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Affordability Filter */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Affordability
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rentStabilized}
                    onChange={(e) => setRentStabilized(e.target.checked)}
                  />
                }
                label="Rent Stabilized"
              />
            </Box>

            {/* Evictions Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Evictions (Last 3 Years)</InputLabel>
              <Select
                value={evictionsFilter}
                onChange={(e) => setEvictionsFilter(e.target.value)}
                label="Evictions (Last 3 Years)"
              >
                <MenuItem value="Any">Any</MenuItem>
                <MenuItem value="0">0</MenuItem>
                <MenuItem value="1-2">1-2</MenuItem>
                <MenuItem value="3-5">3-5</MenuItem>
                <MenuItem value="6+">6+</MenuItem>
              </Select>
            </FormControl>

            {/* Violations Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Open Violations</InputLabel>
              <Select
                value={violationsFilter}
                onChange={(e) => setViolationsFilter(e.target.value)}
                label="Open Violations"
              >
                <MenuItem value="Any">Any</MenuItem>
                <MenuItem value="0">0</MenuItem>
                <MenuItem value="1-5">1-5</MenuItem>
                <MenuItem value="6-10">6-10</MenuItem>
                <MenuItem value="11+">11+</MenuItem>
              </Select>
            </FormControl>

            {/* ZIP Code Filter */}
            <TextField
              fullWidth
              label="ZIP Code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="e.g., 10022"
              sx={{ mb: 3 }}
            />

            <Button
              variant="outlined"
              fullWidth
              onClick={handleClearFilters}
              startIcon={<Clear />}
            >
              Clear All Filters
            </Button>
          </Paper>
        </Box>

        {/* Right Side - Search Results */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          )}
          
          {searchResults.length > 0 && !loading && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6">
                Showing {searchResults.length} of {totalResults} results
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Sort by</InputLabel>
                <Select value="Most Relevant" label="Sort by">
                  <MenuItem value="Most Relevant">Most Relevant</MenuItem>
                  <MenuItem value="Lowest Risk">Lowest Risk</MenuItem>
                  <MenuItem value="Highest Rating">Highest Rating</MenuItem>
                  <MenuItem value="Most Violations">Most Violations</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Search Results */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {searchResults.map((building) => (
              <Card 
                key={building.bbl} 
                sx={{ 
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    boxShadow: 3,
                    transform: "translateY(-2px)"
                  }
                }} 
                onClick={() => handleViewDetails(building.bbl)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                      <LocationOn color="action" sx={{ mt: 0.5 }} />
                      <Box>
                        <Typography variant="h6" component="div">
                          {building.address}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {building.borough}, NY {building.zip}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(building.bbl);
                      }}
                    >
                      View Details
                    </Button>
                  </Box>

                  {/* Metrics */}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 2 }}>
                    <Box sx={{ minWidth: "120px" }}>
                      <Typography variant="body2" color="text.secondary">
                        Units
                      </Typography>
                      <Typography variant="h6">
                        {building.units || "N/A"}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: "120px" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Evictions (3yr)
                        </Typography>
                        {building.evictions3yr > 5 && <Warning color="error" fontSize="small" />}
                      </Box>
                      <Typography variant="h6">
                        {building.evictions3yr}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: "120px" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Open Violations
                        </Typography>
                        {building.openViolations > 10 && <Shield color="warning" fontSize="small" />}
                      </Box>
                      <Typography variant="h6">
                        {building.openViolations}
                      </Typography>
                    </Box>
                    <Box sx={{ minWidth: "120px" }}>
                      <Typography variant="body2" color="text.secondary">
                        Community Rating
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {building.communityRating ? (
                          <>
                            <Rating value={building.communityRating} precision={0.1} size="small" readOnly />
                            <Typography variant="body2">
                              {building.communityRating} ({building.reviewCount || 0})
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No rating available
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  {/* Tags */}
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      label={building.riskLevel}
                      color={getRiskColor(building.riskLevel)}
                      size="small"
                      icon={getRiskIcon(building.riskLevel)}
                    />
                    {building.rentStabilized && (
                      <Chip label="Rent Stabilized" color="primary" variant="outlined" size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {searchResults.length === 0 && !loading && !error && (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography variant="h6" color="text.secondary">
                No buildings found. Try adjusting your search or filters.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                You can search by BBL (10-digit number), address, borough, or ZIP code.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      </Container>
    </Box>
  );
};

export default Search;
