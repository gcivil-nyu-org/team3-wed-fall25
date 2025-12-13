import React from "react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  Alert,
  LinearProgress,
  TextField,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  Breadcrumbs,
  Link,
  // Grid,
} from "@mui/material";
import {
  ArrowBack,
  Home,
  AttachMoney,
  RateReview,
  // Download, // Use as DownloadIcon
  // Event, // Use as EventIcon
} from "@mui/icons-material";
// Potentially use download or event icons
import {
  fetchViolationsByBBL,
  fetchComplaintsByBBL,
  fetchBuildingStats,
  fetchPlutoByBBL,
  toggleComplaintResolved,
  toggleViolationResolved,
} from "../api/landlord";
import BuildingTabsSection from "../components/BuildingTabsSection";

// TabPanel is provided in the tabs component file; no local TabPanel required here.

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
  const [pluto, setPlutoData] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState<{
    averageRent: string;
    occupancyRate: string;
    turnoverRate: string;
  }>({
    averageRent: "",
    occupancyRate: "",
    turnoverRate: "",
  });
  const [saveMessage, setSaveMessage] = useState<{
    open: boolean;
    text?: string;
    severity?: "success" | "error";
  }>({ open: false });

  useEffect(() => {
    let mounted = true;

    async function loadBuildingData() {
      if (!bbl) return;

      setLoading(true);
      setError(null);

      try {
        // Use real API calls
        const [violationsData, complaintsData, statsData, plutoData] =
          await Promise.all([
            fetchViolationsByBBL(bbl),
            fetchComplaintsByBBL(bbl),
            fetchBuildingStats(bbl),
            fetchPlutoByBBL(bbl),
          ]);

        if (!mounted) return;

        setViolations(violationsData);
        setComplaints(complaintsData);
        console.log(statsData);
        console.log(plutoData);

        setStats(statsData);

        // Normalize the PLUTO response (handle `{ data: ... }` wrappers) and store unwrapped row
        const plutoObj = plutoData
          ? ((plutoData as any).data ?? plutoData)
          : null;
        setPlutoData(plutoObj);
        console.log("pluto fetched:", plutoObj);

        setBuildingInfo({
          address: plutoObj?.address ?? statsData?.address ?? "N/A",
          bbl: bbl,
          year_built: plutoObj?.yearbuilt ?? undefined,
          building_class: plutoObj?.bldgclass ?? undefined,
          total_units: plutoObj?.unitstotal ?? plutoObj?.unitsres ?? undefined,
          stories: plutoObj?.numfloors ?? undefined,
          lot_area: plutoObj?.lotarea ?? undefined,
          owner: plutoObj?.ownername ?? undefined,
          zipcode: plutoObj?.zipcode ?? undefined,
          pluto: plutoObj,
        });
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

  // Debug: log when pluto state actually changes (setState is async)
  useEffect(() => {
    console.log("pluto state changed:", pluto);
  }, [pluto]);

  // Initialize editable fields when stats or buildingInfo load
  useEffect(() => {
    const avg = stats?.average_rent ?? buildingInfo?.average_rent ?? "";
    const occ = stats?.occupancy_rate ?? buildingInfo?.occupancy_rate ?? "";
    const turnover = stats?.turnover_rate ?? buildingInfo?.turnover_rate ?? "";
    setEditValues({
      averageRent: avg?.toString() ?? "",
      occupancyRate: occ?.toString() ?? "",
      turnoverRate: turnover?.toString() ?? "",
    });
  }, [stats, buildingInfo]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Toggle handlers: optimistic update + backend call
  const handleToggleViolation = async (
    violation_id: number | string,
    resolved: boolean
  ) => {
    // optimistic
    setViolations((prev) =>
      prev.map((v) =>
        v.violation_id === violation_id
          ? { ...v, violation_status: resolved ? "Closed" : "Open" }
          : v
      )
    );
    try {
      await toggleViolationResolved(violation_id, resolved);
    } catch (err) {
      // revert on error
      setViolations((prev) =>
        prev.map((v) =>
          v.violation_id === violation_id
            ? { ...v, violation_status: resolved ? "Open" : "Closed" }
            : v
        )
      );
      console.error("Failed to toggle violation status", err);
    }
  };

  const handleToggleComplaint = async (
    complaint_id: number | string,
    resolved: boolean
  ) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.complaint_id === complaint_id
          ? { ...c, complaint_status: resolved ? "Closed" : "Open" }
          : c
      )
    );
    try {
      await toggleComplaintResolved(complaint_id, resolved);
    } catch (err) {
      setComplaints((prev) =>
        prev.map((c) =>
          c.complaint_id === complaint_id
            ? { ...c, complaint_status: resolved ? "Open" : "Closed" }
            : c
        )
      );
      console.error("Failed to toggle complaint status", err);
    }
  };

  // Calculate trends from real data returned by the API (violations, complaints, stats)
  const trendData = (() => {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const counts: Record<
      string,
      { violations: number; evictions: number; complaints: number }
    > = {};
    monthNames.forEach(
      (m) => (counts[m] = { violations: 0, evictions: 0, complaints: 0 })
    );

    const parseMonth = (dateStr?: string | null) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return monthNames[d.getMonth()];
    };

    // Aggregate violations by available date fields
    (violations || []).forEach((v) => {
      const dateStr =
        v?.nov_issued_date ||
        v?.inspection_date ||
        v?.violation_date ||
        v?.created_at ||
        null;
      const m = parseMonth(dateStr);
      if (m) counts[m].violations += 1;
    });

    // Aggregate complaints by complaint_status_date
    (complaints || []).forEach((c) => {
      const m = parseMonth(
        c?.complaint_status_date || c?.date || c?.created_at || null
      );
      if (m) counts[m].complaints += 1;
    });

    // Assign eviction filings to the most recent month if present
    try {
      const ev = stats?.eviction_filings || 0;
      if (ev > 0) {
        const now = new Date();
        const m = monthNames[now.getMonth()];
        counts[m].evictions += ev;
      }
    } catch (e) {
      // ignore
    }

    return monthNames.map((m) => ({
      month: m,
      violations: counts[m].violations,
      evictions: counts[m].evictions,
      complaints: counts[m].complaints,
    }));
  })();

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
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)",
        py: 4,
        px: { xs: 2, sm: 3 },
        pt: { xs: 8, sm: 10 },
      }}
      // sx={{ p: { xs: 2, md: 4 } }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 3 }}>
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
            <TextField
              label="Turnover Rate (%)"
              value={editValues.turnoverRate}
              onChange={(e) =>
                setEditValues((v) => ({ ...v, turnoverRate: e.target.value }))
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
                        if (
                          editValues.averageRent &&
                          isNaN(Number(editValues.averageRent))
                        ) {
                          setSaveMessage({
                            open: true,
                            text: "Average rent must be a number",
                            severity: "error",
                          });
                          return;
                        }
                        if (
                          editValues.occupancyRate &&
                          isNaN(Number(editValues.occupancyRate))
                        ) {
                          setSaveMessage({
                            open: true,
                            text: "Occupancy rate must be a number",
                            severity: "error",
                          });
                          return;
                        }
                        if (
                          editValues.turnoverRate &&
                          isNaN(Number(editValues.turnoverRate))
                        ) {
                          setSaveMessage({
                            open: true,
                            text: "Turnover rate must be a number",
                            severity: "error",
                          });
                          return;
                        }
                        const avgNum = editValues.averageRent
                          ? parseFloat(editValues.averageRent)
                          : null;
                        const occNum = editValues.occupancyRate
                          ? parseFloat(editValues.occupancyRate)
                          : null;
                        const turnoverNum = editValues.turnoverRate
                          ? parseFloat(editValues.turnoverRate)
                          : null;
                        if (avgNum !== null && avgNum < 0) {
                          setSaveMessage({
                            open: true,
                            text: "Average rent cannot be negative",
                            severity: "error",
                          });
                          return;
                        }
                        if (occNum !== null && (occNum < 0 || occNum > 100)) {
                          setSaveMessage({
                            open: true,
                            text: "Occupancy rate must be between 0 and 100",
                            severity: "error",
                          });
                          return;
                        }
                        if (
                          turnoverNum !== null &&
                          (turnoverNum < 0 || turnoverNum > 100)
                        ) {
                          setSaveMessage({
                            open: true,
                            text: "Turnover rate must be between 0 and 100",
                            severity: "error",
                          });
                          return;
                        }

                        // call API helper
                        await (
                          await import("../api/landlord")
                        ).updateBuildingInfo(bbl || "", {
                          average_rent:
                            avgNum !== null && Number.isFinite(avgNum)
                              ? avgNum
                              : null,
                          occupancy_rate:
                            occNum !== null && Number.isFinite(occNum)
                              ? occNum
                              : null,
                          turnover_rate:
                            turnoverNum !== null && Number.isFinite(turnoverNum)
                              ? turnoverNum
                              : null,
                        });
                        // reflect locally
                        setStats((s: any) => ({
                          ...(s || {}),
                          average_rent: avg,
                          occupancy_rate: occ,
                          turnover_rate: turnoverNum,
                        }));
                        setBuildingInfo((b: any) => ({
                          ...(b || {}),
                          average_rent: avg,
                          occupancy_rate: occ,
                          turnover_rate: turnoverNum,
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
                        turnoverRate:
                          stats?.turnover_rate?.toString() ??
                          buildingInfo?.turnover_rate?.toString() ??
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
                    secondary={
                      buildingInfo?.stories ||
                      buildingInfo?.pluto?.numfloors ||
                      "N/A"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Residential Units (PLUTO)"
                    secondary={
                      buildingInfo?.pluto?.unitsres ??
                      buildingInfo?.total_units ??
                      "N/A"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Building Area (sq ft)"
                    secondary={
                      buildingInfo?.pluto?.bldgarea ??
                      buildingInfo?.lot_area ??
                      "N/A"
                    }
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
                    secondary={
                      (buildingInfo?.pluto?.ownername ?? buildingInfo?.owner) ||
                      "N/A"
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Community Reviews"
                    secondary={
                      <Button
                        variant="text"
                        onClick={() => navigate(`/reviews?bbl=${bbl}`)}
                      >
                        View Community Reviews
                      </Button>
                    }
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
              sx={{ minWidth: 180 }}
              startIcon={<RateReview />}
              onClick={() => navigate(`/reviews?bbl=${bbl}`)}
            >
              Community Reviews
            </Button>
          </Box>
        </Paper>
        {/* Tabs */}
        <BuildingTabsSection
          tabValue={tabValue}
          handleTabChange={handleTabChange}
          trendData={trendData}
          violations={violations}
          complaints={complaints}
          stats={stats}
          onToggleViolation={handleToggleViolation}
          onToggleComplaint={handleToggleComplaint}
        />
        {/* Snackbar for save messages */}
        <Snackbar
          open={saveMessage.open}
          autoHideDuration={6000}
          onClose={() =>
            setSaveMessage({ ...(saveMessage || {}), open: false })
          }
        >
          <Alert
            onClose={() =>
              setSaveMessage({ ...(saveMessage || {}), open: false })
            }
            severity={saveMessage.severity || "success"}
            sx={{ width: "100%" }}
          >
            {saveMessage.text}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
