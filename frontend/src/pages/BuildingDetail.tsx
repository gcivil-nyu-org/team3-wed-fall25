import React from "react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Tabs,
  Tab,
  Paper,
  Alert,
  LinearProgress,
  TextField,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Breadcrumbs,
  Link,
  // Grid,
} from "@mui/material";
import {
  ArrowBack,
  Warning,
  Home,
  TrendingUp,
  Assignment,
  Error as ErrorIcon,
  CheckCircle,
  Build, // Use as BuildIcon
  Receipt, // Use as ReceiptIcon
  Description, // Use as DescriptionIcon
  AttachMoney, // Use as AttachMoneyIcon
  // Download, // Use as DownloadIcon
  // Event, // Use as EventIcon
} from "@mui/icons-material";
// Potentially use download or event icons
import {
  fetchViolationsByBBL,
  fetchComplaintsByBBL,
  fetchBuildingStats,
} from "../api/landlord";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Mock data fallback since your backend doesn't have these endpoints yet
const mockBuildingViolations = [
  {
    id: "v_1",
    bbl: "1234567890",
    message: "Broken fire escape on 3rd floor",
    resolved: false,
    type: "violation",
    violation_id: 1,
    nov_description: "Broken fire escape on 3rd floor",
    class: "C",
    rent_impairing: true,
    violation_status: "Open",
    apartment: "3B",
  },
  {
    id: "v_2",
    bbl: "1234567890",
    message: "Missing smoke detectors in common areas",
    resolved: false,
    type: "violation",
    violation_id: 2,
    nov_description: "Missing smoke detectors in common areas",
    class: "B",
    rent_impairing: false,
    violation_status: "Open",
    apartment: "",
  },
];

const mockBuildingComplaints = [
  {
    id: 1,
    bbl: "1234567890",
    type: "HEAT/HOT WATER",
    major_category: "HVAC",
    minor_category: "Heat",
    complaint_status: "Open",
    status_description: "No heat in apartment",
    house_number: "123",
    street_name: "Main St",
    apartment: "4B",
    complaint_status_date: "2024-01-18",
  },
  {
    id: 2,
    bbl: "1234567890",
    type: "PLUMBING",
    major_category: "Plumbing",
    minor_category: "Leak",
    complaint_status: "In Progress",
    status_description: "Leaking faucet in bathroom",
    house_number: "123",
    street_name: "Main St",
    apartment: "2A",
    complaint_status_date: "2024-01-16",
  },
];

const mockBuildingStats = {
  total_violations: 2,
  open_violations: 2,
  total_complaints: 5,
  open_complaints: 2,
  eviction_filings: 1,
};


export default function BuildingDetail() {
  const { bbl } = useParams<{ bbl: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [buildingInfo, setBuildingInfo] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<{ averageRent: string; occupancyRate: string }>({
    averageRent: "",
    occupancyRate: "",
  });
  const [saveMessage, setSaveMessage] = useState<{ open: boolean; text?: string; severity?: "success" | "error" }>(
    { open: false }
  );


  useEffect(() => {
    let mounted = true;

    async function loadBuildingData() {
      if (!bbl) return;

      setLoading(true);
      setError(null);

      try {
        // Use real API calls
        const [violationsData, complaintsData, statsData] = await Promise.all([
          fetchViolationsByBBL(bbl),
          fetchComplaintsByBBL(bbl),
          fetchBuildingStats(bbl),
        ]);

        if (!mounted) return;

        setViolations(violationsData);
        setComplaints(complaintsData);
        console.log(statsData);
        setStats(statsData);

        // Try to get building info from the first violation or complaint
        // const firstRecord = violationsData[0] || complaintsData[0];
        if (statsData && statsData.address) {
          setBuildingInfo({
            address: 
              statsData.address || "Address not available",
              // `${firstRecord.house_number || ""} ${firstRecord.street_name || ""}`.trim() ||
              // "Address not available",
            bbl: bbl,
          });
        } else {
          setBuildingInfo({
            address: "Building details not available",
            bbl: bbl,
          });
        }
      } catch (err) {
        console.error("Failed to load building data:", err);
        if (!mounted) return;
        setError("Failed to load building details from server.");

        // You can keep the mock data as ultimate fallback if needed
        setViolations(mockBuildingViolations);
        setComplaints(mockBuildingComplaints);
        setStats(mockBuildingStats);
        setBuildingInfo({
          address: "123 Main St, Brooklyn, NY",
          bbl: bbl,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadBuildingData();

    return () => {
      mounted = false;
    };
  }, [bbl]);

  // Initialize editable fields when stats or buildingInfo load
  useEffect(() => {
    const avg = stats?.average_rent ?? buildingInfo?.average_rent ?? "";
    const occ = stats?.occupancy_rate ?? buildingInfo?.occupancy_rate ?? "";
    setEditValues({ averageRent: avg?.toString() ?? "", occupancyRate: occ?.toString() ?? "" });
  }, [stats, buildingInfo]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  const getViolationSeverityColor = (violationClass: string) => {
    switch (violationClass) {
      case "C":
        return "error";
      case "B":
        return "warning";
      case "A":
        return "info";
      default:
        return "default";
    }
  };

  const getComplaintStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "error";
      case "in progress":
        return "warning";
      case "resolved":
        return "success";
      default:
        return "default";
    }
  };

  // Calculate trends from mock data
  const trendData = [
    { month: "Jan", violations: 3, evictions: 1, complaints: 5 },
    { month: "Feb", violations: 2, evictions: 0, complaints: 3 },
    { month: "Mar", violations: 1, evictions: 0, complaints: 2 },
    { month: "Apr", violations: 4, evictions: 1, complaints: 6 },
    { month: "May", violations: 2, evictions: 0, complaints: 4 },
    {
      month: "Jun",
      violations: violations.length,
      evictions: stats?.eviction_filings || 0,
      complaints: complaints.length,
    },
  ];

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading building details...</Typography>
      </Box>
    );
  }
  const topbarHeight = 64; // Adjust if your topbar height is different
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 , pt: `${topbarHeight + 16}px` }}>
        {/* Improved Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            color="inherit"
            onClick={() => navigate("/landlord/dashboard")} // Consistent with your button
            sx={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              "&:hover": { textDecoration: "underline" }, // Better UX
            }}
          >
            <Home sx={{ mr: 0.5 }} fontSize="small" />
            Portfolio
          </Link>
          <Typography color="text.primary">
            {buildingInfo?.address || "Building Details"}
          </Typography>
        </Breadcrumbs>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {buildingInfo?.address || "Building Details"}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              BBL: {bbl}
            </Typography>
          </Box>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/landlord/dashboard")}
            variant="outlined"
          >
            Back to Portfolio
          </Button>
        </Box>
      </Box>
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 3 }}>
        <Box
          sx={{
            width: {
              xs: "100%",
              sm: "calc(50% - 12px)",
              md: "calc(20% - 12px)",
            },
          }}
        >
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Total Violations
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {stats?.total_violations || 0}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            width: {
              xs: "100%",
              sm: "calc(50% - 12px)",
              md: "calc(20% - 12px)",
            },
          }}
        >
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Open Violations
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {stats?.open_violations || 0}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            width: {
              xs: "100%",
              sm: "calc(50% - 12px)",
              md: "calc(20% - 12px)",
            },
          }}
        >
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Total Complaints
              </Typography>
              <Typography variant="h4" component="div" color="info.main">
                {stats?.total_complaints || 0}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            width: {
              xs: "100%",
              sm: "calc(50% - 12px)",
              md: "calc(20% - 12px)",
            },
          }}
        >
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Open Complaints
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {stats?.open_complaints || 0}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box
          sx={{
            width: {
              xs: "100%",
              sm: "calc(50% - 12px)",
              md: "calc(20% - 12px)",
            },
          }}
        >
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography color="textSecondary" gutterBottom>
                Eviction Filings
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {stats?.eviction_filings || 0}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
      {/*Property Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Property Information
        </Typography>
        {/* Editable financial/occupancy fields */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <TextField
            label="Average Rent"
            value={editValues.averageRent}
            onChange={(e) =>
              setEditValues((v) => ({ ...v, averageRent: e.target.value }))
            }
            size="small"
            InputProps={{ startAdornment: <AttachMoney sx={{ mr: 1 }} /> }}
            sx={{ minWidth: 180 }}
            disabled={!editMode}
          />
          <TextField
            label="Occupancy Rate (%)"
            value={editValues.occupancyRate}
            onChange={(e) =>
              setEditValues((v) => ({ ...v, occupancyRate: e.target.value }))
            }
            size="small"
            sx={{ minWidth: 180 }}
            disabled={!editMode}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {!editMode ? (
              <Button variant="outlined" onClick={() => setEditMode(true)}>
                Edit
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={async () => {
                    // Save handler
                    try {
                      // optimistic local update
                      const avg = editValues.averageRent
                        ? parseFloat(editValues.averageRent)
                        : null;
                      const occ = editValues.occupancyRate
                        ? parseFloat(editValues.occupancyRate)
                        : null;
                          // input validation
                          if (editValues.averageRent && isNaN(Number(editValues.averageRent))) {
                            setSaveMessage({ open: true, text: "Average rent must be a number", severity: "error" });
                            return;
                          }
                          if (editValues.occupancyRate && isNaN(Number(editValues.occupancyRate))) {
                            setSaveMessage({ open: true, text: "Occupancy rate must be a number", severity: "error" });
                            return;
                          }
                          const avgNum = editValues.averageRent ? parseFloat(editValues.averageRent) : null;
                          const occNum = editValues.occupancyRate ? parseFloat(editValues.occupancyRate) : null;
                          if (avgNum !== null && avgNum < 0) {
                            setSaveMessage({ open: true, text: "Average rent cannot be negative", severity: "error" });
                            return;
                          }
                          if (occNum !== null && (occNum < 0 || occNum > 100)) {
                            setSaveMessage({ open: true, text: "Occupancy rate must be between 0 and 100", severity: "error" });
                            return;
                          }

                          // call API helper
                          await (await import("../api/landlord")).updateBuildingInfo(bbl || "", {
                            average_rent: avgNum !== null && Number.isFinite(avgNum) ? avgNum : null,
                            occupancy_rate: occNum !== null && Number.isFinite(occNum) ? occNum : null,
                          });
                      // reflect locally
                      setStats((s: any) => ({
                        ...(s || {}),
                        average_rent: avg,
                        occupancy_rate: occ,
                      }));
                      setBuildingInfo((b: any) => ({
                        ...(b || {}),
                        average_rent: avg,
                        occupancy_rate: occ,
                      }));
                      setSaveMessage({
                        open: true,
                        text: "Saved building details",
                        severity: "success",
                      });
                      setEditMode(false);
                    } catch (err: any) {
                      console.error("Failed to save building info", err);
                      setSaveMessage({
                        open: true,
                        text: "Failed to save building details",
                        severity: "error",
                      });
                    }
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    // revert edits
                    setEditMode(false);
                    setEditValues({
                      averageRent:
                        stats?.average_rent?.toString() ??
                        buildingInfo?.average_rent?.toString() ??
                        "",
                      occupancyRate:
                        stats?.occupancy_rate?.toString() ??
                        buildingInfo?.occupancy_rate?.toString() ??
                        "",
                    });
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Building Class"
                  secondary={buildingInfo?.building_class || "N/A"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Year Built"
                  secondary={buildingInfo?.year_built || "N/A"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Total Units"
                  secondary={buildingInfo?.total_units || "N/A"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Stories"
                  secondary={buildingInfo?.stories || "N/A"}
                />
              </ListItem>
            </List>
          </Box>
          <Box sx={{ flex: 1 }}>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Lot Area"
                  secondary={
                    buildingInfo?.lot_area
                      ? `${buildingInfo.lot_area} sq ft`
                      : "N/A"
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Zoning"
                  secondary={buildingInfo?.zoning || "N/A"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Owner"
                  secondary={buildingInfo?.owner || "N/A"}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Community Board"
                  secondary={buildingInfo?.community_board || "N/A"}
                />
              </ListItem>
            </List>
          </Box>
        </Box>
      </Paper>
      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <Button
            variant="outlined"
            sx={{ minWidth: 140 }}
            startIcon={<Assignment />}
            onClick={() => navigate(`/landlord/apply/${bbl}`)}
          >
            Manage Property
          </Button>
          <Button
            variant="outlined"
            sx={{ minWidth: 140 }}
            startIcon={<Receipt />}
          >
            Record Payment
          </Button>
          <Button
            variant="outlined"
            sx={{ minWidth: 140 }}
            startIcon={<Build />}
          >
            Maintenance
          </Button>
          <Button
            variant="outlined"
            sx={{ minWidth: 140 }}
            startIcon={<Description />}
          >
            Documents
          </Button>
        </Box>
      </Paper>
      {/* Tabs */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<TrendingUp />} label="Violation Trends" />
          <Tab icon={<Warning />} label="Violations" />
          <Tab icon={<Assignment />} label="Complaints" />
        </Tabs>

        {/* Violation Trends Tab */}
        <TabPanel value={tabValue} index={0}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Eviction & Violation Trends (Last 6 Months)
              </Typography>

              {/* 👇 PUT THE CHART CODE RIGHT HERE - Replace the existing Grid chart */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-end",
                  height: 200,
                  mt: 3,
                }}
              >
                {trendData.map((month) => (
                  <Box
                    key={month.month}
                    sx={{
                      flex: 1,
                      textAlign: "center",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Box
                      sx={{
                        height: `${month.violations * 15}%`,
                        bgcolor: "warning.main",
                        borderRadius: "4px 4px 0 0",
                        mb: 0.5,
                        position: "relative",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          position: "absolute",
                          top: -20,
                          left: 0,
                          right: 0,
                        }}
                      >
                        {month.violations}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        height: `${month.evictions * 30}%`,
                        bgcolor: "error.main",
                        borderRadius: "4px 4px 0 0",
                        mb: 0.5,
                        position: "relative",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          position: "absolute",
                          top: -20,
                          left: 0,
                          right: 0,
                        }}
                      >
                        {month.evictions}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        height: `${month.complaints * 10}%`,
                        bgcolor: "info.main",
                        borderRadius: "4px 4px 0 0",
                        position: "relative",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          position: "absolute",
                          top: -20,
                          left: 0,
                          right: 0,
                        }}
                      >
                        {month.complaints}
                      </Typography>
                    </Box>

                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ mt: 1 }}
                    >
                      {month.month}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Legend */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 3,
                  mt: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      bgcolor: "warning.main",
                      borderRadius: 1,
                    }}
                  />
                  <Typography variant="caption">Violations</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      bgcolor: "error.main",
                      borderRadius: 1,
                    }}
                  />
                  <Typography variant="caption">Evictions</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      bgcolor: "info.main",
                      borderRadius: 1,
                    }}
                  />
                  <Typography variant="caption">Complaints</Typography>
                </Box>
              </Box>
              {/* 👆 KEEP THE LEGEND PART TOO */}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Violations Tab */}
        <TabPanel value={tabValue} index={1}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Building Violations
                <Chip
                  label={violations.length}
                  color="primary"
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>

              {violations.length === 0 ? (
                <Alert severity="success">
                  No violations found for this building.
                </Alert>
              ) : (
                <List>
                  {violations.map((violation) => (
                    <React.Fragment key={violation.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemIcon>
                          <Warning
                            color={
                              violation.rent_impairing ? "error" : "warning"
                            }
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                              }}
                            >
                              <Typography variant="subtitle1">
                                {violation.nov_description || violation.message}
                              </Typography>
                              <Box sx={{ display: "flex", gap: 1 }}>
                                {violation.class && (
                                  <Chip
                                    label={`Class ${violation.class}`}
                                    color={
                                      getViolationSeverityColor(
                                        violation.class
                                      ) as any
                                    }
                                    size="small"
                                  />
                                )}
                                {violation.rent_impairing && (
                                  <Chip
                                    label="Rent Impairing"
                                    color="error"
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {violation.resolved ? (
                                  <Chip
                                    icon={<CheckCircle />}
                                    label="Resolved"
                                    color="success"
                                    size="small"
                                  />
                                ) : (
                                  <Chip
                                    icon={<ErrorIcon />}
                                    label="Open"
                                    color="error"
                                    size="small"
                                  />
                                )}
                              </Box>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              {violation.apartment && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  gutterBottom
                                >
                                  Apartment: {violation.apartment}
                                </Typography>
                              )}
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Status: {violation.violation_status}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {violations.length > 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Complaints Tab - SCROLLABLE */}
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tenant Complaints
                <Chip
                  label={complaints.length}
                  color="primary"
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>

              {complaints.length === 0 ? (
                <Alert severity="info">
                  No complaints found for this building.
                </Alert>
              ) : (
                <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
                  {complaints.map((complaint) => (
                    <Card
                      key={complaint.id}
                      variant="outlined"
                      sx={{
                        mb: 2,
                        borderLeft: `4px solid ${
                          complaint.major_category === "HEAT/HOT WATER"
                            ? "#f44336"
                            : complaint.major_category === "PLUMBING"
                              ? "#ff9800"
                              : "#2196f3"
                        }`,
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 1,
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {complaint.type}
                              {complaint.apartment &&
                                ` - Unit ${complaint.apartment}`}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {complaint.major_category} •{" "}
                              {complaint.minor_category}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Chip
                              label={complaint.complaint_status}
                              color={
                                getComplaintStatusColor(
                                  complaint.complaint_status
                                ) as any
                              }
                              size="small"
                            />
                          </Box>
                        </Box>

                        <Typography variant="body2" paragraph>
                          {complaint.status_description}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="caption" color="textSecondary">
                            Reported:{" "}
                            {new Date(
                              complaint.complaint_status_date
                            ).toLocaleDateString()}
                          </Typography>
                          <Button size="small" variant="contained">
                            Resolve Issue
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>
      {/* Snackbar for save messages */}
      <Snackbar
        open={saveMessage.open}
        autoHideDuration={6000}
        onClose={() => setSaveMessage({ ...(saveMessage || {}), open: false })}
      >
        <Alert
          onClose={() => setSaveMessage({ ...(saveMessage || {}), open: false })}
          severity={saveMessage.severity || "success"}
          sx={{ width: "100%" }}
        >
          {saveMessage.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}

