import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Divider,
  Chip,
  Alert,
  CircularProgress,
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
import type { User } from "../types";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user: authUser, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        console.log('Profile page - authLoading:', authLoading, 'authUser:', authUser);
        
        // Wait for auth loading to complete
        if (authLoading) {
          console.log('Profile page - Auth still loading, waiting...');
          return;
        }
        
        // Check if user is authenticated
        if (!authUser) {
          console.log('Profile page - No authUser after loading complete, redirecting to signin');
          navigate('/signin');
          return;
        }

        // Use the user data from auth context
        console.log('Profile page - Setting user:', authUser);
        setUser(authUser);
        setLoading(false);
      } catch (err) {
        console.error('Profile page - Error loading profile:', err);
        setError('Failed to load user profile');
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [authUser, authLoading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEditProfile = () => {
    // Navigate to edit profile page (to be implemented)
    console.log('Edit profile clicked');
  };

  const getRoleDisplayName = (role: string) => {
    return role === 'tenant' ? 'Tenant' : 'Landlord';
  };

  const getTenantTypeDisplayName = (tenantType?: string) => {
    if (!tenantType) return '';
    const typeMap: Record<string, string> = {
      'student': 'Student',
      'working_professional': 'Working Professional',
      'other': 'Other'
    };
    return typeMap[tenantType] || tenantType;
  };

  const getInitials = (firstName: string | undefined, lastName: string | undefined) => {
    if (!firstName || !lastName) return 'U';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading || authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress size={60} sx={{ color: COLORS.PRIMARY }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{
            backgroundColor: COLORS.PRIMARY,
            '&:hover': { backgroundColor: COLORS.PRIMARY_HOVER },
          }}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="warning">
          No user data found. Please sign in again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a202c', mb: 1 }}>
          My Profile
        </Typography>
        <Typography variant="body1" sx={{ color: '#4a5568' }}>
          Manage your account information and preferences
        </Typography>
      </Box>

      {/* Profile Card */}
      <Card sx={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Profile Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                backgroundColor: COLORS.PRIMARY,
                fontSize: '2rem',
                fontWeight: 600,
                mr: 3,
              }}
            >
              {getInitials(user?.first_name, user?.last_name)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a202c', mb: 1 }}>
                {user?.first_name || ''} {user?.last_name || ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={getRoleDisplayName(user?.role || '')}
                  color="primary"
                  size="small"
                  sx={{
                    backgroundColor: COLORS.PRIMARY,
                    color: 'white',
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={handleEditProfile}
                sx={{
                  borderColor: COLORS.PRIMARY,
                  color: COLORS.PRIMARY,
                  '&:hover': {
                    borderColor: COLORS.PRIMARY_HOVER,
                    backgroundColor: 'rgba(255, 107, 53, 0.04)',
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
                  backgroundColor: '#e53e3e',
                  '&:hover': { backgroundColor: '#c53030' },
                }}
              >
                Logout
              </Button>
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Profile Details */}
          <Box sx={{ display: 'grid', gap: 3 }}>
            {/* Personal Information */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c', mb: 2 }}>
                Personal Information
              </Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PersonIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
                      Full Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user?.first_name || ''} {user?.last_name || ''}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EmailIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
                      Email Address
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user.email}
                    </Typography>
                  </Box>
                </Box>

                {user.phone_number && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <PhoneIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
                        Phone Number
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {user.phone_number}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {user.role === 'tenant' && user.tenant_type && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <HomeIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
                        Tenant Type
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {getTenantTypeDisplayName(user.tenant_type)}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {user.role === 'landlord' && user.organization_name && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <BusinessIcon sx={{ color: COLORS.PRIMARY, fontSize: 20 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
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
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a202c', mb: 2 }}>
                Account Information
              </Typography>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
                    Username
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user.username}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
                    Member Since
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
