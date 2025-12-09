import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from "@mui/material";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Edit as EditIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useAuth } from "../hooks";
import { COLORS } from "../constants";
import { updateProfile } from "../api/auth/authApi";
import type { User } from "../types";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editTenantType, setEditTenantType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user: authUser, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Wait for auth loading to complete
        if (authLoading) {
          return;
        }

        // Check if user is authenticated
        if (!authUser) {
          navigate("/signin");
          return;
        }

        // Use the user data from auth context
        setUser(authUser);
        setLoading(false);
      } catch (err) {
        setError("Failed to load user profile");
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [authUser, authLoading, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleEditProfile = () => {
    if (user) {
      setEditUsername(user.username || "");
      setEditTenantType(user.tenant_type || "");
      setEditDialogOpen(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      const updateData: Partial<User> = {
        username: editUsername,
      };

      // Only include tenant_type if user is a tenant
      if (user.role === "tenant") {
        updateData.tenant_type = editTenantType as
          | "student"
          | "working_professional"
          | "other";
      }

      const updatedUser = await updateProfile(updateData);
      setUser(updatedUser);
      setEditDialogOpen(false);
      setSuccessMessage("Profile updated successfully!");

      // Reload the page to refresh auth context
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error_message ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Failed to update profile";
      setError(errorMessage);
      console.error("Profile update error:", err.response?.data || err);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseDialog = () => {
    if (!saving) {
      setEditDialogOpen(false);
      setError(null);
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role === "tenant" ? "Tenant" : "Landlord";
  };

  const getTenantTypeDisplayName = (tenantType?: string) => {
    if (!tenantType) return "";
    const typeMap: Record<string, string> = {
      student: "Student",
      working_professional: "Working Professional",
      other: "Other",
    };
    return typeMap[tenantType] || tenantType;
  };

  const getInitials = (
    firstName: string | undefined,
    lastName: string | undefined
  ) => {
    if (!firstName || !lastName) return "U";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading || authLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <CircularProgress size={60} sx={{ color: COLORS.PRIMARY }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{
            backgroundColor: COLORS.PRIMARY,
            "&:hover": { backgroundColor: COLORS.PRIMARY_HOVER },
          }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
        <Alert severity="warning">
          No user data found. Please sign in again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        // maxWidth: 800,
        mx: "auto",
        minHeight: "100vh",
        py: 4,
        px: { xs: 2, sm: 3 },
        pt: { xs: 8, sm: 10 },
      }}
    >
      {/* Header */}
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: "#2D3748",
              fontFamily: '"Montserrat", "Roboto", sans-serif',
              fontSize: { xs: "2rem", md: "3rem" },
            }}
          >
            My Profile
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mb: 3,
              color: "#4A5568",
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            Manage your account information and preferences
          </Typography>
        </Box>

        {/* Profile Card */}
        <Card
          sx={{ boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)", borderRadius: 3 }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Profile Header */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  backgroundColor: COLORS.PRIMARY,
                  fontSize: "2rem",
                  fontWeight: 600,
                  mr: 3,
                }}
              >
                {getInitials(user?.first_name, user?.last_name)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: 600, color: "#1a202c", mb: 1 }}
                >
                  {user?.first_name || ""} {user?.last_name || ""}
                </Typography>
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Chip
                    label={getRoleDisplayName(user?.role || "")}
                    color="primary"
                    size="small"
                    sx={{
                      backgroundColor: COLORS.PRIMARY,
                      color: "white",
                      fontWeight: 600,
                    }}
                  />
                  {user?.tenant_type && (
                    <Chip
                      label={getTenantTypeDisplayName(user.tenant_type)}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderColor: COLORS.PRIMARY,
                        color: COLORS.PRIMARY,
                      }}
                    />
                  )}
                  {user?.is_verified && (
                    <Chip
                      label="Verified"
                      color="success"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditProfile}
                  sx={{
                    borderColor: COLORS.PRIMARY,
                    color: COLORS.PRIMARY,
                    "&:hover": {
                      borderColor: COLORS.PRIMARY_HOVER,
                      backgroundColor: "rgba(255, 107, 53, 0.04)",
                    },
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  sx={{
                    backgroundColor: "#e53e3e",
                    "&:hover": { backgroundColor: "#c53030" },
                  }}
                >
                  Logout
                </Button>
              </Box>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Profile Details */}
            <Box sx={{ display: "grid", gap: 3 }}>
              {/* Personal Information */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#1a202c", mb: 2 }}
                >
                  Personal Information
                </Typography>
                <Box sx={{ display: "grid", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <PersonIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "#4a5568", fontSize: "0.875rem" }}
                      >
                        Full Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {user?.first_name || ""} {user?.last_name || ""}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <EmailIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ color: "#4a5568", fontSize: "0.875rem" }}
                      >
                        Email Address
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>

                  {user.phone_number && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <PhoneIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#4a5568", fontSize: "0.875rem" }}
                        >
                          Phone Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {user.phone_number}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {user.role === "tenant" && user.tenant_type && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <HomeIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#4a5568", fontSize: "0.875rem" }}
                        >
                          Tenant Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {getTenantTypeDisplayName(user.tenant_type)}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {user.role === "landlord" && user.organization_name && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <BusinessIcon
                        sx={{ color: COLORS.PRIMARY, fontSize: 20 }}
                      />
                      <Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#4a5568", fontSize: "0.875rem" }}
                        >
                          Organization
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {user.organization_name}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Account Information */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "#1a202c", mb: 2 }}
                >
                  Account Information
                </Typography>
                <Box sx={{ display: "grid", gap: 2 }}>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "#4a5568", fontSize: "0.875rem" }}
                    >
                      Username
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user.username}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "#4a5568", fontSize: "0.875rem" }}
                    >
                      Member Since
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Edit Profile Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}
            >
              <TextField
                label="Username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                fullWidth
                required
              />
              {user?.role === "tenant" && (
                <FormControl fullWidth>
                  <InputLabel>Tenant Type</InputLabel>
                  <Select
                    value={editTenantType}
                    label="Tenant Type"
                    onChange={(e) => setEditTenantType(e.target.value)}
                  >
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="working_professional">
                      Working Professional
                    </MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              )}
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              variant="contained"
              disabled={saving || !editUsername.trim()}
              sx={{
                backgroundColor: COLORS.PRIMARY,
                "&:hover": { backgroundColor: COLORS.PRIMARY_HOVER },
              }}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Snackbar */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSuccessMessage(null)}
            severity="success"
            sx={{ width: "100%" }}
          >
            {successMessage}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
