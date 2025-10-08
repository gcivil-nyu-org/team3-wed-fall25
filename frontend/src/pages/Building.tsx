import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Button,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { fetchBuilding } from "../api/index.js";

// Temporarily inline the BuildingData type to resolve export issue
interface BuildingData {
  bbl: string;
  registration: {
    bbl: string;
    bin: number;
    boro_id: number;
    boro: string;
    block: number;
    lot: number;
    house_number: string;
    street_name: string;
    zip: string;
    community_board: number;
    last_registration_date: string;
    registration_end_date: string;
    registration_id: number;
    building_id: number;
  };
  rent_stabilized: {
    bbl: string;
    borough: string;
    block: number;
    lot: number;
    zip: string;
    city: string;
    status: string;
    source_year: number;
  };
  contacts: Array<{
    registration_contact_id: number;
    registration_id: number;
    type: string;
    contact_description: string;
    first_name: string;
    last_name: string;
    corporation_name: string | null;
    business_house_number: string | null;
    business_street_name: string | null;
    business_city: string | null;
    business_state: string | null;
    business_zip: string | null;
    business_apartment: string | null;
  }>;
  affordable: any[];
  complaints: Array<{
    complaint_id: number;
    bbl: string;
    borough: string;
    block: number;
    lot: number;
    problem_id: number;
    unit_type: string;
    space_type: string;
    type: string;
    major_category: string;
    minor_category: string;
    complaint_status: string;
    complaint_status_date: string | null;
    problem_status: string;
    problem_status_date: string;
    status_description: string;
    house_number: string;
    street_name: string;
    post_code: string;
    apartment: string;
  }>;
  violations: Array<{
    violation_id: number;
    bbl: string;
    bin: number | null;
    block: number;
    lot: number;
    boro: string;
    nov_description: string;
    nov_type: string;
    class_: string;
    rent_impairing: boolean;
    violation_status: string;
    current_status: string;
    current_status_id: number;
    current_status_date: string;
    inspection_date: string;
    nov_issued_date: string;
    approved_date: string;
    house_number: string;
    street_name: string;
    apartment: string | null;
    story: string | null;
  }>;
  acris_master: Record<string, any>;
  acris_legals: Record<string, any>;
  acris_parties: Record<string, any>;
  evictions: Array<{
    docket_number: string;
    court_index_number: string;
    bbl: string;
    bin: number;
    borough: string;
    eviction_zip: string;
    eviction_address: string;
    eviction_apt_num: string;
    community_board: number;
    council_district: number;
    census_tract: string;
    nta: string;
    latitude: string;
    longitude: string;
    executed_date: string;
    residential_commercial_ind: string;
    ejectment: string;
    eviction_possession: string;
    marshal_first_name: string;
    marshal_last_name: string;
  }>;
  counts: {
    contacts: number;
    affordable: number;
    complaints: number;
    violations: number;
    evictions: number;
    acris_docs: number;
    acris_legals: number;
    acris_parties: number;
  };
}

const BuildingHeader: React.FC<{ building: BuildingData }> = ({ building }) => {
  const { registration, rent_stabilized, counts } = building;
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 4, 
        mb: 4,
        borderRadius: 4,
        boxShadow: "0 8px 32px rgba(255, 107, 53, 0.1)",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 107, 53, 0.1)"
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{
              fontWeight: 700,
              color: "#2D3748",
              fontFamily: '"Montserrat", "Roboto", sans-serif'
            }}
          >
            {registration.house_number} {registration.street_name}
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 1,
              color: "#4A5568",
              fontWeight: 500
            }}
          >
            {registration.boro}, NY {registration.zip}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: "#718096",
              fontSize: "0.9rem"
            }}
          >
            BBL: {registration.bbl} | BIN: {registration.bin}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {rent_stabilized.status === "RENT_STABILIZED" && (
            <Chip 
              label="Rent Stabilized" 
              sx={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "#3B82F6",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                fontWeight: 600
              }}
            />
          )}
          <Chip 
            label={`${counts.violations} Violations`} 
            sx={{
              backgroundColor: counts.violations > 10 ? "#EF4444" : counts.violations > 5 ? "#F59E0B" : "#22C55E",
              color: "white",
              fontWeight: 600
            }}
          />
          <Chip 
            label={`${counts.evictions} Evictions`} 
            sx={{
              backgroundColor: counts.evictions > 5 ? "#EF4444" : counts.evictions > 2 ? "#F59E0B" : "#22C55E",
              color: "white",
              fontWeight: 600
            }}
          />
        </Box>
      </Box>
      
      <Box sx={{ 
        display: "flex", 
        flexWrap: "wrap", 
        gap: 4 
      }}>
        <Box sx={{ minWidth: "120px" }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: "#4A5568",
              fontWeight: 500,
              mb: 0.5
            }}
          >
            Complaints
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              color: "#FF6B35",
              fontWeight: 700
            }}
          >
            {counts.complaints}
          </Typography>
        </Box>
        <Box sx={{ minWidth: "120px" }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: "#4A5568",
              fontWeight: 500,
              mb: 0.5
            }}
          >
            Violations
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              color: "#EF4444",
              fontWeight: 700
            }}
          >
            {counts.violations}
          </Typography>
        </Box>
        <Box sx={{ minWidth: "120px" }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: "#4A5568",
              fontWeight: 500,
              mb: 0.5
            }}
          >
            Evictions
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              color: "#22C55E",
              fontWeight: 700
            }}
          >
            {counts.evictions}
          </Typography>
        </Box>
        <Box sx={{ minWidth: "120px" }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: "#4A5568",
              fontWeight: 500,
              mb: 0.5
            }}
          >
            Contacts
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              color: "#3B82F6",
              fontWeight: 700
            }}
          >
            {counts.contacts}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

const BuildingTabs: React.FC<{ building: BuildingData }> = ({ building }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { contacts, complaints, violations, evictions } = building;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "contacts", label: "Contacts" },
    { id: "complaints", label: "Complaints" },
    { id: "violations", label: "Violations" },
    { id: "evictions", label: "Evictions" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <Box>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{
                fontWeight: 600,
                color: "#2D3748",
                fontFamily: '"Montserrat", "Roboto", sans-serif',
                mb: 3
              }}
            >
              Building Overview
            </Typography>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 3 }}>
              <Paper 
                sx={{ 
                  p: 3, 
                  flex: 1,
                  borderRadius: 3,
                  boxShadow: "0 4px 16px rgba(255, 107, 53, 0.08)",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(255, 107, 53, 0.1)"
                }}
              >
                <Typography 
                  variant="subtitle1" 
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: "#2D3748",
                    mb: 2
                  }}
                >
                  Registration Information
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="body2" sx={{ color: "#4A5568" }}>
                    <strong style={{ color: "#2D3748" }}>Registration ID:</strong> {building.registration.registration_id}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#4A5568" }}>
                    <strong style={{ color: "#2D3748" }}>Last Registration:</strong> {new Date(building.registration.last_registration_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#4A5568" }}>
                    <strong style={{ color: "#2D3748" }}>Registration End:</strong> {new Date(building.registration.registration_end_date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#4A5568" }}>
                    <strong style={{ color: "#2D3748" }}>Community Board:</strong> {building.registration.community_board}
                  </Typography>
                </Box>
              </Paper>
              <Paper 
                sx={{ 
                  p: 3, 
                  flex: 1,
                  borderRadius: 3,
                  boxShadow: "0 4px 16px rgba(255, 107, 53, 0.08)",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(255, 107, 53, 0.1)"
                }}
              >
                <Typography 
                  variant="subtitle1" 
                  gutterBottom
                  sx={{
                    fontWeight: 600,
                    color: "#2D3748",
                    mb: 2
                  }}
                >
                  Rent Stabilization
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="body2" sx={{ color: "#4A5568" }}>
                    <strong style={{ color: "#2D3748" }}>Status:</strong> {building.rent_stabilized.status}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#4A5568" }}>
                    <strong style={{ color: "#2D3748" }}>Source Year:</strong> {building.rent_stabilized.source_year}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        );
      
      case "contacts":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Building Contacts ({contacts.length})
            </Typography>
            {contacts.map((contact, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1">
                  {contact.first_name} {contact.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {contact.type} - {contact.contact_description}
                </Typography>
                {contact.corporation_name && (
                  <Typography variant="body2">
                    <strong>Corporation:</strong> {contact.corporation_name}
                  </Typography>
                )}
                {contact.business_house_number && contact.business_street_name && (
                  <Typography variant="body2">
                    <strong>Business Address:</strong> {contact.business_house_number} {contact.business_street_name}, {contact.business_city}, {contact.business_state} {contact.business_zip}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        );
      
      case "complaints":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Recent Complaints ({complaints.length})
            </Typography>
            {complaints.slice(0, 5).map((complaint, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box>
                    <Typography variant="subtitle1">
                      {complaint.major_category} - {complaint.minor_category}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {complaint.type} | {complaint.unit_type} | {complaint.space_type}
                    </Typography>
                    <Typography variant="body2">
                      {complaint.apartment && `Apartment: ${complaint.apartment}`}
                    </Typography>
                  </Box>
                  <Chip 
                    label={complaint.complaint_status} 
                    color={complaint.complaint_status === "CLOSE" ? "success" : "warning"}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {complaint.status_description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(complaint.problem_status_date).toLocaleDateString()}
                </Typography>
              </Paper>
            ))}
          </Box>
        );
      
      case "violations":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Recent Violations ({violations.length})
            </Typography>
            {violations.slice(0, 5).map((violation, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">
                      Class {violation.class_} Violation
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {violation.nov_description.substring(0, 200)}...
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {violation.story && `Story: ${violation.story}`}
                    </Typography>
                  </Box>
                  <Box sx={{ ml: 2, textAlign: "right" }}>
                    <Chip 
                      label={violation.violation_status} 
                      color={violation.violation_status === "Close" ? "success" : "error"}
                      size="small"
                    />
                    {violation.rent_impairing && (
                      <Chip 
                        label="Rent Impairing" 
                        color="error" 
                        size="small"
                        sx={{ mt: 1, display: "block" }}
                      />
                    )}
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Issued: {new Date(violation.nov_issued_date).toLocaleDateString()}
                </Typography>
              </Paper>
            ))}
          </Box>
        );
      
      case "evictions":
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Recent Evictions ({evictions.length})
            </Typography>
            {evictions.slice(0, 5).map((eviction, index) => (
              <Paper key={index} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1">
                  Docket #{eviction.docket_number}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {eviction.eviction_address} - {eviction.eviction_apt_num}
                </Typography>
                <Typography variant="body2">
                  <strong>Executed:</strong> {new Date(eviction.executed_date).toLocaleDateString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Marshal:</strong> {eviction.marshal_first_name} {eviction.marshal_last_name}
                </Typography>
                <Typography variant="body2">
                  <strong>Type:</strong> {eviction.residential_commercial_ind} | {eviction.ejectment} | {eviction.eviction_possession}
                </Typography>
              </Paper>
            ))}
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: "rgba(255, 107, 53, 0.1)", 
        mb: 3 
      }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? "contained" : "text"}
              sx={{ 
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                py: 1,
                ...(activeTab === tab.id ? {
                  backgroundColor: "#FF6B35",
                  color: "white",
                  boxShadow: "0 2px 8px rgba(255, 107, 53, 0.3)",
                  "&:hover": {
                    backgroundColor: "#E55A2B",
                  }
                } : {
                  color: "#4A5568",
                  "&:hover": {
                    backgroundColor: "rgba(255, 107, 53, 0.05)",
                    color: "#FF6B35",
                  }
                })
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>
      </Box>
      {renderTabContent()}
    </Box>
  );
};

const Building: React.FC = () => {
  const { bbl } = useParams<{ bbl: string }>();
  const navigate = useNavigate();
  const [building, setBuilding] = useState<BuildingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBuilding = async () => {
      if (!bbl) {
        setError("No BBL provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchBuilding(bbl);
        setBuilding(data);
      } catch (err) {
        setError("Failed to load building data");
        console.error("Error loading building:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBuilding();
  }, [bbl]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !building) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Building not found"}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/search")}
          variant="outlined"
        >
          Back to Search
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)",
      py: 4, 
      pt: { xs: 8, sm: 10 } 
    }}>
      <Container maxWidth="lg">
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/search")}
          variant="outlined"
          sx={{ 
            mb: 3,
            borderColor: "#FF6B35",
            color: "#FF6B35",
            "&:hover": {
              borderColor: "#E55A2B",
              backgroundColor: "rgba(255, 107, 53, 0.05)",
            }
          }}
        >
          Back to Search
        </Button>
        
        <BuildingHeader building={building} />
        <BuildingTabs building={building} />
      </Container>
    </Box>
  );
};

export default Building;
