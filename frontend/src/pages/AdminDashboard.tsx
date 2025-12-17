import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  People,
  RateReview,
  Warning,
  Business,
  CheckCircle,
  Delete,
  Visibility,
  Refresh,
  Download,
  TrendingUp,
  HealthAndSafety,
  Gavel,
  Report,
  Storage,
  Cloud,
  Schedule,
  Analytics,
} from "@mui/icons-material";
import {
  fetchAdminStats,
  fetchFlaggedReviews,
  fetchPlatformHealth,
  approveReview,
  deleteReview,
  type AdminStats,
  type FlaggedReview,
  type PlatformHealth,
} from "../api/admin";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Real data state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [moderationQueue, setModerationQueue] = useState<FlaggedReview[]>([]);
  const [platformHealth, setPlatformHealth] = useState<PlatformHealth | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  // Export reports as CSV
  const handleExportReports = () => {
    if (!stats) {
      setSnackbar({
        open: true,
        message: "No data to export",
        severity: "error",
      });
      return;
    }

    const csvContent = [
      ["Platform Statistics Report"],
      ["Generated", new Date().toISOString()],
      [],
      ["Metric", "Value"],
      ["Total Users", stats.totalUsers],
      ["Tenants", stats.tenantCount],
      ["Landlords", stats.landlordCount],
      ["Total Reviews", stats.totalReviews],
      ["Flagged Reviews", stats.pendingReports],
      ["Buildings Tracked", stats.buildingsTracked],
      ["Total Violations", stats.totalViolations],
      ["Total Evictions", stats.totalEvictions],
      ["Total Complaints", stats.totalComplaints],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "Report exported successfully",
      severity: "success",
    });
  };

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsData, flaggedData, healthData] = await Promise.all([
        fetchAdminStats(),
        fetchFlaggedReviews(),
        fetchPlatformHealth(),
      ]);

      setStats(statsData);
      setModerationQueue(Array.isArray(flaggedData) ? flaggedData : []);
      setPlatformHealth(healthData);
    } catch (err) {
      console.error("Failed to load admin data:", err);
      setError("Failed to load admin data. Some features may be unavailable.");
      // Set fallback stats
      setStats({
        totalUsers: 0,
        tenantCount: 0,
        landlordCount: 0,
        totalReviews: 0,
        pendingReports: 0,
        buildingsTracked: 0,
        totalViolations: 0,
        totalEvictions: 0,
        totalComplaints: 0,
      });
      setModerationQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if admin is authenticated
    const isAuthenticated =
      sessionStorage.getItem("admin_authenticated") === "true";
    if (!isAuthenticated) {
      navigate("/admin/login");
      return;
    }

    loadData();
  }, [navigate, loadData]);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await approveReview(id);
      // Remove from queue
      setModerationQueue((prev: FlaggedReview[]) => prev.filter((item: FlaggedReview) => item.id !== id));
      // Update pending count
      if (stats) {
        setStats({ ...stats, pendingReports: stats.pendingReports - 1 });
      }
      setSnackbar({
        open: true,
        message: "Review approved successfully",
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to approve review:", err);
      setSnackbar({
        open: true,
        message: "Failed to approve review",
        severity: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (id: number) => {
    setActionLoading(id);
    try {
      await deleteReview(id);
      // Remove from queue
      setModerationQueue((prev: FlaggedReview[]) => prev.filter((item: FlaggedReview) => item.id !== id));
      // Update counts
      if (stats) {
        setStats({
          ...stats,
          pendingReports: stats.pendingReports - 1,
          totalReviews: stats.totalReviews - 1,
        });
      }
      setSnackbar({
        open: true,
        message: "Review removed successfully",
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to remove review:", err);
      setSnackbar({
        open: true,
        message: "Failed to remove review",
        severity: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReview = (id: number) => {
    // Could navigate to a detail view
    console.log("Review detail:", id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "success";
      case "warning":
        return "warning";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ pt: { xs: 10, md: 12 }, pb: 6 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 8,
          }}
        >
          <CircularProgress size={48} />
          <Typography sx={{ mt: 2 }}>Loading admin dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pt: { xs: 10, md: 12 }, pb: 6 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: "#4A5568" }}>
          Platform overview, moderation tools, and system monitoring
        </Typography>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Platform Statistics */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <People sx={{ fontSize: 40, color: "#FF6B35" }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatNumber(stats?.totalUsers || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats?.tenantCount || 0} tenants, {stats?.landlordCount || 0} landlords
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <RateReview sx={{ fontSize: 40, color: "#22C55E" }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatNumber(stats?.totalReviews || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Reviews
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Warning sx={{ fontSize: 40, color: "#EF4444" }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.pendingReports || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Flagged Reviews
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Business sx={{ fontSize: 40, color: "#3B82F6" }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {formatNumber(stats?.buildingsTracked || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Buildings Tracked
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Dataset Statistics */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ height: "100%", bgcolor: "#FEF3C7" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Report sx={{ fontSize: 32, color: "#D97706" }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {formatNumber(stats?.totalViolations || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Violations in Database
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ height: "100%", bgcolor: "#FEE2E2" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Gavel sx={{ fontSize: 32, color: "#DC2626" }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {formatNumber(stats?.totalEvictions || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Evictions in Database
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ height: "100%", bgcolor: "#DBEAFE" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Warning sx={{ fontSize: 32, color: "#2563EB" }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {formatNumber(stats?.totalComplaints || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Complaints in Database
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Quick Actions
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Button
            variant="contained"
            startIcon={<Download />}
            sx={{ backgroundColor: "#FF6B35" }}
            onClick={handleExportReports}
          >
            Export Reports
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadData}
          >
            Refresh Data
          </Button>
          <Button
            variant="outlined"
            startIcon={<TrendingUp />}
            onClick={() => setAnalyticsOpen(true)}
          >
            View Analytics
          </Button>
          <Button
            variant="outlined"
            startIcon={<HealthAndSafety />}
            onClick={() => setStatusOpen(true)}
          >
            System Status
          </Button>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
        {/* Pending Moderation Queue */}
        <Box sx={{ flex: 2, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Flagged Reviews Queue
              </Typography>
              <Chip
                label={`${moderationQueue.length} pending`}
                color={moderationQueue.length > 0 ? "warning" : "success"}
                size="small"
              />
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Content</TableCell>
                    <TableCell>Author</TableCell>
                    <TableCell>Flags</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {moderationQueue.map((item: FlaggedReview) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Chip
                          label={item.type}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {item.title || item.content}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.85rem">
                          {item.author}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.reportedBy}
                          size="small"
                          color="error"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="0.85rem">
                          {item.createdAt ? formatDate(item.createdAt) : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={1}
                          justifyContent="flex-end"
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleReview(item.id)}
                            title="Review"
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(item.id)}
                            title="Approve"
                            disabled={actionLoading === item.id}
                          >
                            {actionLoading === item.id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <CheckCircle fontSize="small" />
                            )}
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemove(item.id)}
                            title="Remove"
                            disabled={actionLoading === item.id}
                          >
                            {actionLoading === item.id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <Delete fontSize="small" />
                            )}
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {moderationQueue.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CheckCircle
                  sx={{ fontSize: 48, color: "#22C55E", mb: 1 }}
                />
                <Typography variant="body1" color="text.secondary">
                  No flagged reviews in moderation queue
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Platform Health */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={3}>
            {/* Platform Health */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Platform Health
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">API Status</Typography>
                    <Chip
                      label={platformHealth?.apiStatus || "unknown"}
                      color={
                        getStatusColor(
                          platformHealth?.apiStatus || "unknown"
                        ) as any
                      }
                      size="small"
                    />
                  </Box>
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Database Status</Typography>
                    <Chip
                      label={platformHealth?.dbStatus || "unknown"}
                      color={
                        getStatusColor(
                          platformHealth?.dbStatus || "unknown"
                        ) as any
                      }
                      size="small"
                    />
                  </Box>
                </Box>
                {platformHealth?.timestamp && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Last checked: {formatDate(platformHealth.timestamp)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Paper>

            {/* Data Summary */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Data Summary
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Tenants</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(stats?.tenantCount || 0)}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Landlords</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(stats?.landlordCount || 0)}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Buildings</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(stats?.buildingsTracked || 0)}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Reviews</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(stats?.totalReviews || 0)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>

            {/* Dataset Health */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Dataset Counts
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Violations</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(stats?.totalViolations || 0)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      ((stats?.totalViolations || 0) / 1000000) * 100,
                      100
                    )}
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                    color="warning"
                  />
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Evictions</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(stats?.totalEvictions || 0)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      ((stats?.totalEvictions || 0) / 100000) * 100,
                      100
                    )}
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                    color="error"
                  />
                </Box>
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">Complaints</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatNumber(stats?.totalComplaints || 0)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      ((stats?.totalComplaints || 0) / 1000000) * 100,
                      100
                    )}
                    sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                    color="info"
                  />
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Stack>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Analytics Dialog */}
      <Dialog
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Analytics color="primary" />
          Platform Analytics
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon>
                <People color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="User Distribution"
                secondary={`${stats?.tenantCount || 0} tenants (${stats?.totalUsers ? Math.round((stats.tenantCount / stats.totalUsers) * 100) : 0}%) · ${stats?.landlordCount || 0} landlords (${stats?.totalUsers ? Math.round((stats.landlordCount / stats.totalUsers) * 100) : 0}%)`}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <RateReview color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Review Activity"
                secondary={`${stats?.totalReviews || 0} total reviews · ${stats?.pendingReports || 0} flagged (${stats?.totalReviews ? Math.round((stats.pendingReports / stats.totalReviews) * 100) : 0}% flag rate)`}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Business color="info" />
              </ListItemIcon>
              <ListItemText
                primary="Building Coverage"
                secondary={`${formatNumber(stats?.buildingsTracked || 0)} buildings with location data`}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Warning color="warning" />
              </ListItemIcon>
              <ListItemText
                primary="Violation Density"
                secondary={`${stats?.buildingsTracked ? Math.round((stats.totalViolations || 0) / stats.buildingsTracked) : 0} avg violations per building`}
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Gavel color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Eviction Rate"
                secondary={`${stats?.buildingsTracked ? ((stats.totalEvictions || 0) / stats.buildingsTracked).toFixed(2) : 0} avg evictions per building`}
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalyticsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* System Status Dialog */}
      <Dialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HealthAndSafety color="primary" />
          System Status
        </DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon>
                <Cloud
                  color={
                    platformHealth?.apiStatus === "healthy" ? "success" : "error"
                  }
                />
              </ListItemIcon>
              <ListItemText
                primary="API Status"
                secondary={
                  <Chip
                    label={platformHealth?.apiStatus || "Unknown"}
                    color={
                      platformHealth?.apiStatus === "healthy"
                        ? "success"
                        : "error"
                    }
                    size="small"
                  />
                }
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Storage
                  color={
                    platformHealth?.dbStatus === "healthy" ? "success" : "error"
                  }
                />
              </ListItemIcon>
              <ListItemText
                primary="Database Status"
                secondary={
                  <Chip
                    label={platformHealth?.dbStatus || "Unknown"}
                    color={
                      platformHealth?.dbStatus === "healthy" ? "success" : "error"
                    }
                    size="small"
                  />
                }
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <Schedule color="info" />
              </ListItemIcon>
              <ListItemText
                primary="Last Updated"
                secondary={
                  platformHealth?.timestamp
                    ? new Date(platformHealth.timestamp).toLocaleString()
                    : "Unknown"
                }
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={loadData} startIcon={<Refresh />}>
            Refresh Status
          </Button>
          <Button onClick={() => setStatusOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
