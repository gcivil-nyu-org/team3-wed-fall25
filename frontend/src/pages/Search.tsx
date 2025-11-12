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
  
  // Filter states
  const [selectedBorough, setSelectedBorough] = useState("All Boroughs");
  const [rentStabilized, setRentStabilized] = useState(false);
  const [affordableHousing, setAffordableHousing] = useState(false);
  const [riskLevel, setRiskLevel] = useState("Any");
  const [violationClass, setViolationClass] = useState("Any");
  const [rentImpairing, setRentImpairing] = useState("Any");
  const [complaintCategory, setComplaintCategory] = useState("Any");
  const [recentActivity, setRecentActivity] = useState("Any");
  const [sortBy, setSortBy] = useState("Most Relevant");

  const boroughs = ["All Boroughs", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

  const handleSearch = async (customFilters?: {
    sortBy?: string;
    borough?: string;
    rentStabilized?: boolean;
    affordableHousing?: boolean;
    riskLevel?: string;
    violationClass?: string;
    rentImpairing?: string;
    complaintCategory?: string;
    recentActivity?: string;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the main search query (address or zip code)
      const query = searchQuery.trim();
      
      if (!query) {
        setError("Please enter an address or zip code to search.");
        setLoading(false);
        return;
      }
      
      // Use custom filter values if provided, otherwise use state
      const currentBorough = customFilters?.borough !== undefined ? customFilters.borough : selectedBorough;
      const currentRentStabilized = customFilters?.rentStabilized !== undefined ? customFilters.rentStabilized : rentStabilized;
      const currentAffordableHousing = customFilters?.affordableHousing !== undefined ? customFilters.affordableHousing : affordableHousing;
      const currentRiskLevel = customFilters?.riskLevel !== undefined ? customFilters.riskLevel : riskLevel;
      const currentViolationClass = customFilters?.violationClass !== undefined ? customFilters.violationClass : violationClass;
      const currentRentImpairing = customFilters?.rentImpairing !== undefined ? customFilters.rentImpairing : rentImpairing;
      const currentComplaintCategory = customFilters?.complaintCategory !== undefined ? customFilters.complaintCategory : complaintCategory;
      const currentRecentActivity = customFilters?.recentActivity !== undefined ? customFilters.recentActivity : recentActivity;
      const currentSortBy = customFilters?.sortBy !== undefined ? customFilters.sortBy : sortBy;
      
      // Build search parameters for the new endpoint
      const searchParams: any = {
        query: query,
        limit: 10, // Always return 10 results
      };
      
      // Add borough filter if selected
      if (currentBorough !== "All Boroughs") {
        searchParams.borough = currentBorough;
        console.log("[DEBUG Search] Adding borough filter:", currentBorough);
      }
      
      // Add rent stabilized filter
      if (currentRentStabilized) {
        searchParams.rent_stabilized = "true";
      }
      
      // Add affordable housing filter
      if (currentAffordableHousing) {
        searchParams.affordable_housing = "true";
      }
      
      // Add risk level filter
      if (currentRiskLevel !== "Any") {
        searchParams.risk_level = currentRiskLevel;
      }
      
      // Add violation class filter
      if (currentViolationClass !== "Any") {
        searchParams.violation_class = currentViolationClass;
      }
      
      // Add rent impairing filter
      if (currentRentImpairing === "Yes") {
        searchParams.rent_impairing = "true";
      } else if (currentRentImpairing === "No") {
        searchParams.rent_impairing = "false";
      }
      
      // Add complaint category filter
      if (currentComplaintCategory !== "Any") {
        searchParams.complaint_category = currentComplaintCategory;
      }
      
      // Add recent activity filter
      if (currentRecentActivity !== "Any") {
        const daysMap: Record<string, number> = {
          "30": 30,
          "90": 90,
          "180": 180,
        };
        if (daysMap[currentRecentActivity]) {
          searchParams.recent_activity_days = daysMap[currentRecentActivity].toString();
        }
      }
      
      // Add sort by parameter
      if (currentSortBy) {
        searchParams.sort_by = currentSortBy;
      }
      
      const response = await searchBuildings(searchParams);
      setSearchResults(response.data || []);
      setTotalResults(response.total || 0);
    } catch (err) {
      setError("Failed to search buildings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedBorough("All Boroughs");
    setRentStabilized(false);
    setAffordableHousing(false);
    setRiskLevel("Any");
    setViolationClass("Any");
    setRentImpairing("Any");
    setComplaintCategory("Any");
    setRecentActivity("Any");
    // Trigger search if there's a query with cleared filter values
    if (searchQuery.trim()) {
      handleSearch({
        borough: "All Boroughs",
        rentStabilized: false,
        affordableHousing: false,
        riskLevel: "Any",
        violationClass: "Any",
        rentImpairing: "Any",
        complaintCategory: "Any",
        recentActivity: "Any",
      });
    }
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
            onClick={() => handleSearch()}
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
                onChange={(e) => {
                  const newBorough = e.target.value;
                  setSelectedBorough(newBorough);
                  if (searchQuery.trim()) {
                    handleSearch({ borough: newBorough });
                  }
                }}
                label="Borough"
              >
                {boroughs.map((borough) => (
                  <MenuItem key={borough} value={borough}>
                    {borough}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Affordability Filters */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
                Affordability
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rentStabilized}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setRentStabilized(newValue);
                      if (searchQuery.trim()) {
                        handleSearch({ rentStabilized: newValue });
                      }
                    }}
                  />
                }
                label="Rent Stabilized"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={affordableHousing}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setAffordableHousing(newValue);
                      if (searchQuery.trim()) {
                        handleSearch({ affordableHousing: newValue });
                      }
                    }}
                  />
                }
                label="Affordable Housing"
              />
            </Box>

            {/* Risk Level Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Risk Level</InputLabel>
              <Select
                value={riskLevel}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setRiskLevel(newValue);
                  if (searchQuery.trim()) {
                    handleSearch({ riskLevel: newValue });
                  }
                }}
                label="Risk Level"
              >
                <MenuItem value="Any">Any Risk Level</MenuItem>
                <MenuItem value="High">High Risk</MenuItem>
                <MenuItem value="Moderate">Moderate Risk</MenuItem>
                <MenuItem value="Low">Low Risk</MenuItem>
              </Select>
            </FormControl>

            {/* Violation Filters */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
                Violation Filters
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Violation Class</InputLabel>
                <Select
                  value={violationClass}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setViolationClass(newValue);
                    if (searchQuery.trim()) {
                      handleSearch({ violationClass: newValue });
                    }
                  }}
                  label="Violation Class"
                >
                  <MenuItem value="Any">Any Class</MenuItem>
                  <MenuItem value="A">Class A (Most Serious)</MenuItem>
                  <MenuItem value="B">Class B</MenuItem>
                  <MenuItem value="C">Class C</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Rent Impairing</InputLabel>
                <Select
                  value={rentImpairing}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setRentImpairing(newValue);
                    if (searchQuery.trim()) {
                      handleSearch({ rentImpairing: newValue });
                    }
                  }}
                  label="Rent Impairing"
                >
                  <MenuItem value="Any">Any</MenuItem>
                  <MenuItem value="Yes">Has Rent Impairing Violations</MenuItem>
                  <MenuItem value="No">No Rent Impairing Violations</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Complaint Category Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Complaint Category</InputLabel>
              <Select
                value={complaintCategory}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setComplaintCategory(newValue);
                  if (searchQuery.trim()) {
                    handleSearch({ complaintCategory: newValue });
                  }
                }}
                label="Complaint Category"
              >
                <MenuItem value="Any">Any Category</MenuItem>
                <MenuItem value="HEAT/HOT WATER">Heat/Hot Water</MenuItem>
                <MenuItem value="PLUMBING">Plumbing</MenuItem>
                <MenuItem value="ELECTRIC">Electric</MenuItem>
                <MenuItem value="GENERAL CONSTRUCTION">General Construction</MenuItem>
                <MenuItem value="PAINT/PLASTER">Paint/Plaster</MenuItem>
              </Select>
            </FormControl>

            {/* Recent Activity Filter */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Recent Activity</InputLabel>
              <Select
                value={recentActivity}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setRecentActivity(newValue);
                  if (searchQuery.trim()) {
                    handleSearch({ recentActivity: newValue });
                  }
                }}
                label="Recent Activity"
              >
                <MenuItem value="Any">Any Time</MenuItem>
                <MenuItem value="30">Last 30 Days</MenuItem>
                <MenuItem value="90">Last 90 Days</MenuItem>
                <MenuItem value="180">Last 6 Months</MenuItem>
              </Select>
            </FormControl>

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
                <Select 
                  value={sortBy} 
                  label="Sort by"
                  onChange={(e) => {
                    const newSortBy = e.target.value;
                    setSortBy(newSortBy);
                    // Trigger new search with updated sort
                    if (searchQuery.trim()) {
                      handleSearch({ sortBy: newSortBy });
                    }
                  }}
                >
                  <MenuItem value="Most Relevant">Most Relevant</MenuItem>
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
