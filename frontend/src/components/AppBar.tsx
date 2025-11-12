import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import MuiAppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Business as BusinessIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { useState, type MouseEvent } from "react";
import { NavLink, useNavigate } from "react-router";
import { useAuth } from "../hooks";
import { COLORS } from "../constants";

const StyledToolbar = styled(Toolbar)(() => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(10px)",
  borderBottom: "1px solid rgba(255, 107, 53, 0.1)",
  boxShadow: "0 2px 20px rgba(255, 107, 53, 0.1)",
  padding: "12px 0",
}));

export default function AppAppBar() {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') === 'true';

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const handleProfileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Logout regular user
    logout();
    // Clear admin session if present
    if (isAdmin) {
      sessionStorage.removeItem('admin_authenticated');
      sessionStorage.removeItem('admin_username');
    }
    handleProfileMenuClose();
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  const getInitials = (firstName: string | undefined, lastName: string | undefined) => {
    if (!firstName || !lastName) return 'U';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <MuiAppBar
      position="fixed"
      enableColorOnDark
      sx={{
        boxShadow: 0,
        bgcolor: "transparent",
        backgroundImage: "none",
        zIndex: 1000,
      }}
    >
      <Container maxWidth="lg">
        <StyledToolbar variant="dense" disableGutters>
          {/* Logo and Brand */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <NavLink to="/" style={{ textDecoration: "none" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BusinessIcon sx={{ fontSize: 24, color: "#FF6B35" }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "#2D3748",
                    fontFamily: '"Montserrat", "Roboto", sans-serif',
                    fontSize: "1.1rem",
                  }}
                >
                  Housing Transparency
                </Typography>
              </Box>
            </NavLink>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
            <NavLink to="/">
              <Button
                variant="text"
                size="small"
                sx={{
                  color: "#4A5568",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                  "&:hover": {
                    color: "#FF6B35",
                    backgroundColor: "rgba(255, 107, 53, 0.05)",
                  },
                }}
              >
                Home
              </Button>
            </NavLink>
            <NavLink to="/search">
              <Button
                variant="text"
                size="small"
                sx={{
                  color: "#4A5568",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                  "&:hover": {
                    color: "#FF6B35",
                    backgroundColor: "rgba(255, 107, 53, 0.05)",
                  },
                }}
              >
                Search
              </Button>
            </NavLink>
            <NavLink to="/map">
              <Button
                variant="text"
                size="small"
                sx={{
                  color: "#4A5568",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                  "&:hover": {
                    color: "#FF6B35",
                    backgroundColor: "rgba(255, 107, 53, 0.05)",
                  },
                }}
              >
                Map
              </Button>
            </NavLink>
            <NavLink to="/community">
              <Button
                variant="text"
                size="small"
                sx={{
                  color: "#4A5568",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  fontSize: "0.85rem",
                  "&:hover": {
                    color: "#FF6B35",
                    backgroundColor: "rgba(255, 107, 53, 0.05)",
                  },
                }}
              >
                Community
              </Button>
            </NavLink>
            {user && (
              <>
                <NavLink to="/landlord/dashboard">
                  <Button
                    variant="text"
                    size="small"
                    sx={{
                      color: "#4A5568",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      fontSize: "0.85rem",
                      "&:hover": {
                        color: "#FF6B35",
                        backgroundColor: "rgba(255, 107, 53, 0.05)",
                      },
                    }}
                  >
                    My Portfolio
                  </Button>
                </NavLink>
                <NavLink to="/message">
                  <Button
                    variant="text"
                    size="small"
                    sx={{
                      color: "#4A5568",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      fontSize: "0.85rem",
                      "&:hover": {
                        color: "#FF6B35",
                        backgroundColor: "rgba(255, 107, 53, 0.05)",
                      },
                    }}
                  >
                    Messages
                  </Button>
                </NavLink>
              </>
            )}
            <Button
              variant="text"
              size="small"
              sx={{
                color: "#4A5568",
                fontWeight: 500,
                textTransform: "uppercase",
                fontSize: "0.85rem",
                "&:hover": {
                  color: "#FF6B35",
                  backgroundColor: "rgba(255, 107, 53, 0.05)",
                },
              }}
            >
              Admin
            </Button>
          </Box>

          {/* Auth Buttons / User Profile */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 1,
              alignItems: "center",
            }}
          >
            {user || isAdmin ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#4A5568",
                      fontWeight: 500,
                      fontSize: "0.85rem",
                    }}
                  >
                    Welcome, {user?.first_name || sessionStorage.getItem('admin_username') || 'User'}
                  </Typography>
                  <IconButton
                    onClick={handleProfileMenuOpen}
                    sx={{
                      p: 0.5,
                      "&:hover": {
                        backgroundColor: "rgba(255, 107, 53, 0.1)",
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: COLORS.PRIMARY,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                      }}
                    >
                      {user ? getInitials(user?.first_name, user?.last_name) : 'AD'}
                    </Avatar>
                  </IconButton>
                </Box>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleProfileMenuClose}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1,
                        minWidth: 200,
                        borderRadius: 2,
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      },
                    },
                  }}
                >
                  {user && (
                  <MenuItem onClick={handleProfileClick}>
                    <AccountCircleIcon sx={{ mr: 1, fontSize: 20 }} />
                    My Profile
                  </MenuItem>
                  )}
                  {isAdmin && (
                    <MenuItem onClick={() => { navigate('/admin/dashboard'); handleProfileMenuClose(); }}>
                      <AccountCircleIcon sx={{ mr: 1, fontSize: 20 }} />
                      Admin Dashboard
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <NavLink to="/signin">
                  <Button
                    variant="text"
                    size="small"
                    sx={{
                      color: "#4A5568",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      fontSize: "0.85rem",
                      "&:hover": {
                        color: "#FF6B35",
                        backgroundColor: "rgba(255, 107, 53, 0.05)",
                      },
                    }}
                  >
                    Sign In
                  </Button>
                </NavLink>
                <NavLink to="/signup">
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      backgroundColor: "#FF6B35",
                      color: "white",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.85rem",
                      borderRadius: 2,
                      px: 3,
                      boxShadow: "0 2px 8px rgba(255, 107, 53, 0.3)",
                      "&:hover": {
                        backgroundColor: "#E55A2B",
                        boxShadow: "0 4px 12px rgba(255, 107, 53, 0.4)",
                      },
                    }}
                  >
                    Sign Up
                  </Button>
                </NavLink>
              </>
            )}
          </Box>
          {/* Mobile Menu */}
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton
              aria-label="Menu button"
              onClick={toggleDrawer(true)}
              sx={{ color: "#4A5568" }}
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="top"
              open={open}
              onClose={toggleDrawer(false)}
              PaperProps={{
                sx: {
                  backgroundColor: "rgba(255, 255, 255, 0.98)",
                  backdropFilter: "blur(10px)",
                  borderBottom: "1px solid rgba(255, 107, 53, 0.1)",
                },
              }}
            >
              <Box sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <BusinessIcon sx={{ fontSize: 20, color: "#FF6B35" }} />
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: "#2D3748",
                        fontFamily: '"Montserrat", "Roboto", sans-serif',
                        fontSize: "1rem",
                      }}
                    >
                      Housing Transparency
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={toggleDrawer(false)}
                    sx={{ color: "#4A5568" }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    mb: 3,
                  }}
                >
                  <NavLink to="/" style={{ textDecoration: "none" }}>
                    <Button
                      fullWidth
                      variant="text"
                      sx={{
                        justifyContent: "flex-start",
                        color: "#4A5568",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.9rem",
                        "&:hover": {
                          color: "#FF6B35",
                          backgroundColor: "rgba(255, 107, 53, 0.05)",
                        },
                      }}
                    >
                      Home
                    </Button>
                  </NavLink>
                  <NavLink to="/search" style={{ textDecoration: "none" }}>
                    <Button
                      fullWidth
                      variant="text"
                      sx={{
                        justifyContent: "flex-start",
                        color: "#4A5568",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.9rem",
                        "&:hover": {
                          color: "#FF6B35",
                          backgroundColor: "rgba(255, 107, 53, 0.05)",
                        },
                      }}
                    >
                      Search
                    </Button>
                  </NavLink>
                  <NavLink to="/map" style={{ textDecoration: "none" }}>
                    <Button
                      fullWidth
                      variant="text"
                      sx={{
                        justifyContent: "flex-start",
                        color: "#4A5568",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.9rem",
                        "&:hover": {
                          color: "#FF6B35",
                          backgroundColor: "rgba(255, 107, 53, 0.05)",
                        },
                      }}
                    >
                      Map
                    </Button>
                  </NavLink>
                  <NavLink to="/community" style={{ textDecoration: "none" }}>
                    <Button
                      fullWidth
                      variant="text"
                      sx={{
                        justifyContent: "flex-start",
                        color: "#4A5568",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.9rem",
                        "&:hover": {
                          color: "#FF6B35",
                          backgroundColor: "rgba(255, 107, 53, 0.05)",
                        },
                      }}
                    >
                      Community
                    </Button>
                  </NavLink>
                  <NavLink to="/landlords" style={{ textDecoration: "none" }}>
                    <Button
                      fullWidth
                      variant="text"
                      sx={{
                        justifyContent: "flex-start",
                        color: "#4A5568",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        fontSize: "0.9rem",
                        "&:hover": {
                          color: "#FF6B35",
                          backgroundColor: "rgba(255, 107, 53, 0.05)",
                        },
                      }}
                    >
                      Landlords
                    </Button>
                  </NavLink>
                  {user && (
                    <>
                      <NavLink to="/landlord/dashboard" style={{ textDecoration: "none" }}>
                        <Button
                          fullWidth
                          variant="text"
                          sx={{
                            justifyContent: "flex-start",
                            color: "#4A5568",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            fontSize: "0.9rem",
                            "&:hover": {
                              color: "#FF6B35",
                              backgroundColor: "rgba(255, 107, 53, 0.05)",
                            },
                          }}
                        >
                          My Portfolio
                        </Button>
                      </NavLink>
                      <NavLink to="/message" style={{ textDecoration: "none" }}>
                        <Button
                          fullWidth
                          variant="text"
                          sx={{
                            justifyContent: "flex-start",
                            color: "#4A5568",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            fontSize: "0.9rem",
                            "&:hover": {
                              color: "#FF6B35",
                              backgroundColor: "rgba(255, 107, 53, 0.05)",
                            },
                          }}
                        >
                          Messages
                        </Button>
                      </NavLink>
                    </>
                  )}
                  <Button
                    fullWidth
                    variant="text"
                    sx={{
                      justifyContent: "flex-start",
                      color: "#4A5568",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      fontSize: "0.9rem",
                      "&:hover": {
                        color: "#FF6B35",
                        backgroundColor: "rgba(255, 107, 53, 0.05)",
                      },
                    }}
                  >
                    Admin
                  </Button>
                </Box>

                <Divider
                  sx={{ my: 2, borderColor: "rgba(255, 107, 53, 0.1)" }}
                />

                {user ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, backgroundColor: 'rgba(255, 107, 53, 0.05)', borderRadius: 2 }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                          backgroundColor: COLORS.PRIMARY,
                          fontSize: "1rem",
                          fontWeight: 600,
                        }}
                      >
                        {getInitials(user?.first_name, user?.last_name)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: '#1a202c' }}>
                          {user?.first_name || ''} {user?.last_name || ''}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#4a5568', fontSize: '0.875rem' }}>
                          {user?.email || ''}
                        </Typography>
                      </Box>
                    </Box>
                    <NavLink to="/profile" style={{ textDecoration: "none" }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        sx={{
                          borderColor: "#FF6B35",
                          color: "#FF6B35",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          fontSize: "0.9rem",
                          borderRadius: 2,
                          "&:hover": {
                            borderColor: "#E55A2B",
                            backgroundColor: "rgba(255, 107, 53, 0.05)",
                          },
                        }}
                      >
                        My Profile
                      </Button>
                    </NavLink>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleLogout}
                      sx={{
                        backgroundColor: "#e53e3e",
                        color: "white",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        fontSize: "0.9rem",
                        borderRadius: 2,
                        boxShadow: "0 2px 8px rgba(229, 62, 62, 0.3)",
                        "&:hover": {
                          backgroundColor: "#c53030",
                          boxShadow: "0 4px 12px rgba(229, 62, 62, 0.4)",
                        },
                      }}
                    >
                      Logout
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <NavLink to="/signin" style={{ textDecoration: "none" }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        sx={{
                          borderColor: "#FF6B35",
                          color: "#FF6B35",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          fontSize: "0.9rem",
                          borderRadius: 2,
                          "&:hover": {
                            borderColor: "#E55A2B",
                            backgroundColor: "rgba(255, 107, 53, 0.05)",
                          },
                        }}
                      >
                        Sign In
                      </Button>
                    </NavLink>
                    <NavLink to="/signup" style={{ textDecoration: "none" }}>
                      <Button
                        fullWidth
                        variant="contained"
                        sx={{
                          backgroundColor: "#FF6B35",
                          color: "white",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          fontSize: "0.9rem",
                          borderRadius: 2,
                          boxShadow: "0 2px 8px rgba(255, 107, 53, 0.3)",
                          "&:hover": {
                            backgroundColor: "#E55A2B",
                            boxShadow: "0 4px 12px rgba(255, 107, 53, 0.4)",
                          },
                        }}
                      >
                        Sign Up
                      </Button>
                    </NavLink>
                  </Box>
                )}
              </Box>
            </Drawer>
          </Box>
        </StyledToolbar>
      </Container>
    </MuiAppBar>
  );
}
