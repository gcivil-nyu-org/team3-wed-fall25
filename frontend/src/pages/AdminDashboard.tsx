import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  fetchAdminStats,
  fetchFlaggedReviews,
  approveReview,
  removeReview,
  fetchWeeklyStats,
  type ModerationItem,
  type AdminStats,
  type WeeklyStats,
} from "../api/admin/adminApi";
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
} from "@mui/material";
import {
  People,
  RateReview,
  Warning,
  Business,
  CheckCircle,
  // Cancel,
  Delete,
  Visibility,
  Refresh,
  Download,
  TrendingUp,
  HealthAndSafety,
} from "@mui/icons-material";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalReviews: 0,
    pendingReports: 0,
    buildingsTracked: 0,
  });
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    reviewsApproved: 0,
    reviewsRemoved: 0,
    usersBanned: 0,
    reportsResolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Check if admin is authenticated
    const isAuthenticated = sessionStorage.getItem("admin_authenticated") === "true";
    if (!isAuthenticated) {
      navigate("/admin/login");
      return;
    }
    loadData();
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, moderationData, weeklyData] = await Promise.all([
        fetchAdminStats(),
        fetchFlaggedReviews(),
        fetchWeeklyStats(),
      ]);
      setStats(statsData);
      setModerationQueue(moderationData);
      setWeeklyStats(weeklyData);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = async (id: number) => {
    try {
      await approveReview(id);
      // Remove from queue
      setModerationQueue((queue) => queue.filter((item) => item.id !== id));
      // Update stats
      setStats((prev) => ({
        ...prev,
        pendingReports: Math.max(0, prev.pendingReports - 1),
      }));
      setWeeklyStats((prev) => ({
        ...prev,
        reviewsApproved: prev.reviewsApproved + 1,
        reportsResolved: prev.reportsResolved + 1,
      }));
    } catch (error) {
      console.error("Error approving review:", error);
      alert("Failed to approve review. Please try again.");
    }
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this review?")) {
      return;
    }
    try {
      await removeReview(id);
      // Remove from queue
      setModerationQueue((queue) => queue.filter((item) => item.id !== id));
      // Update stats
      setStats((prev) => ({
        ...prev,
        pendingReports: Math.max(0, prev.pendingReports - 1),
        totalReviews: Math.max(0, prev.totalReviews - 1),
      }));
      setWeeklyStats((prev) => ({
        ...prev,
        reviewsRemoved: prev.reviewsRemoved + 1,
        reportsResolved: prev.reportsResolved + 1,
      }));
    } catch (error) {
      console.error("Error removing review:", error);
      alert("Failed to remove review. Please try again.");
    }
  };

  const handleReview = (id: number) => {
    const item = moderationQueue.find((i) => i.id === id);
    if (item?.bbl) {
      navigate(`/building/${item.bbl}`);
    }
  };

  const platformHealth = {
    apiStatus: "healthy",
    dbStatus: "healthy",
    emailService: "healthy",
    storageUsage: 65,
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ pt: { xs: 10, md: 12 }, pb: 6 }}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
          <LinearProgress sx={{ width: "100%" }} />
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

      {/* Platform Statistics */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mb: 4 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <People sx={{ fontSize: 40, color: "#FF6B35" }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.totalUsers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
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
                    {stats.totalReviews.toLocaleString()}
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
                    {stats.pendingReports}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Reports
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
                    {stats.buildingsTracked.toLocaleString()}
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
          >
            Export Reports
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
          <Button variant="outlined" startIcon={<TrendingUp />}>
            View Analytics
          </Button>
          <Button variant="outlined" startIcon={<HealthAndSafety />}>
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
                Pending Moderation Queue
              </Typography>
              <Chip
                label={`${moderationQueue.length} pending`}
                color="warning"
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
                    <TableCell>Reports</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {moderationQueue.map((item) => (
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
                          {item.content}
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
                          {formatDate(item.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
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
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemove(item.id)}
                            title="Remove"
                          >
                            <Delete fontSize="small" />
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
                <Typography variant="body1" color="text.secondary">
                  No pending items in moderation queue
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Weekly Statistics & Activity Log */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={3}>
            {/* Weekly Moderation Statistics */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Weekly Moderation Stats
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
                    <Typography variant="body2">Reviews Approved</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {weeklyStats.reviewsApproved}
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
                    <Typography variant="body2">Reviews Removed</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {weeklyStats.reviewsRemoved}
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
                    <Typography variant="body2">Users Banned</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {weeklyStats.usersBanned}
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
                    <Typography variant="body2">Reports Resolved</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {weeklyStats.reportsResolved}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>

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
                      label={platformHealth.apiStatus}
                      color={getStatusColor(platformHealth.apiStatus) as any}
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
                      label={platformHealth.dbStatus}
                      color={getStatusColor(platformHealth.dbStatus) as any}
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
                    <Typography variant="body2">Email Service</Typography>
                    <Chip
                      label={platformHealth.emailService}
                      color={
                        getStatusColor(platformHealth.emailService) as any
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
                    <Typography variant="body2">Storage Usage</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {platformHealth.storageUsage}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={platformHealth.storageUsage}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Stack>
            </Paper>
          </Stack>
        </Box>
      </Stack>

    </Container>
  );
}

