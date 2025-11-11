import { Box, Container, Typography, Link as MuiLink, Button } from "@mui/material";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../hooks";
import BusinessIcon from "@mui/icons-material/Business";

export function SiteFooter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('admin_authenticated') === 'true';

  const handleLogout = () => {
    logout();
    if (isAdmin) {
      sessionStorage.removeItem('admin_authenticated');
      sessionStorage.removeItem('admin_username');
    }
    navigate("/");
  };

  return (
    <Box
      component="footer"
      sx={{
        borderTop: "1px solid rgba(255, 107, 53, 0.1)",
        backgroundColor: "rgba(255, 248, 243, 0.5)",
        backdropFilter: "blur(10px)",
        mt: "auto",
      }}
    >
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" },
            gap: 4,
          }}
        >
          {/* Brand Section */}
          <Box>
            <Link to="/" style={{ textDecoration: "none" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
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
            </Link>
            <Typography
              variant="body2"
              sx={{
                color: "#4A5568",
                maxWidth: "400px",
                lineHeight: 1.6,
                fontSize: "0.9rem",
              }}
            >
              Empowering tenants and landlords with transparent access to NYC building data, eviction records,
              violations, and community reviews.
            </Typography>
          </Box>

          {/* Explore Section */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "#2D3748",
                fontFamily: '"Montserrat", "Roboto", sans-serif',
                fontSize: "0.9rem",
                mb: 2,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Explore
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Link to="/search" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "#4A5568",
                    fontSize: "0.85rem",
                    "&:hover": {
                      color: "#FF6B35",
                    },
                    transition: "color 0.2s ease",
                  }}
                >
                  Search Buildings
                </Typography>
              </Link>
              <MuiLink
                href="#"
                sx={{
                  color: "#4A5568",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  "&:hover": {
                    color: "#FF6B35",
                  },
                  transition: "color 0.2s ease",
                }}
              >
                Neighborhood Explorer
              </MuiLink>
              <MuiLink
                href="#"
                sx={{
                  color: "#4A5568",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  "&:hover": {
                    color: "#FF6B35",
                  },
                  transition: "color 0.2s ease",
                }}
              >
                Community Reviews
              </MuiLink>
            </Box>
          </Box>

          {/* Account Section */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "#2D3748",
                fontFamily: '"Montserrat", "Roboto", sans-serif',
                fontSize: "0.9rem",
                mb: 2,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Account
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {user || isAdmin ? (
                <>
                  {user && (
                    <>
                      <Link to="/profile" style={{ textDecoration: "none" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#4A5568",
                            fontSize: "0.85rem",
                            "&:hover": {
                              color: "#FF6B35",
                            },
                            transition: "color 0.2s ease",
                          }}
                        >
                          My Profile
                        </Typography>
                      </Link>
                      <Link to="/dashboard" style={{ textDecoration: "none" }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#4A5568",
                            fontSize: "0.85rem",
                            "&:hover": {
                              color: "#FF6B35",
                            },
                            transition: "color 0.2s ease",
                          }}
                        >
                          Dashboard
                        </Typography>
                      </Link>
                    </>
                  )}
                  {isAdmin && (
                    <Link to="/admin/dashboard" style={{ textDecoration: "none" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#4A5568",
                          fontSize: "0.85rem",
                          "&:hover": {
                            color: "#FF6B35",
                          },
                          transition: "color 0.2s ease",
                        }}
                      >
                        Admin Dashboard
                      </Typography>
                    </Link>
                  )}
                  <Link to="/admin/login" style={{ textDecoration: "none" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#4A5568",
                        fontSize: "0.85rem",
                        "&:hover": {
                          color: "#FF6B35",
                        },
                        transition: "color 0.2s ease",
                      }}
                    >
                      Admin
                    </Typography>
                  </Link>
                  <Button
                    onClick={handleLogout}
                    variant="text"
                    sx={{
                      p: 0,
                      width: "fit-content",
                      color: "#e53e3e",
                      textTransform: "none",
                      fontSize: "0.85rem",
                      "&:hover": { textDecoration: "underline", background: "transparent" },
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/signin" style={{ textDecoration: "none" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#4A5568",
                        fontSize: "0.85rem",
                        "&:hover": {
                          color: "#FF6B35",
                        },
                        transition: "color 0.2s ease",
                      }}
                    >
                      Log in
                    </Typography>
                  </Link>
                  <Link to="/signup" style={{ textDecoration: "none" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#4A5568",
                        fontSize: "0.85rem",
                        "&:hover": {
                          color: "#FF6B35",
                        },
                        transition: "color 0.2s ease",
                      }}
                    >
                      Sign up
                    </Typography>
                  </Link>
                  <Link to="/admin/login" style={{ textDecoration: "none" }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#4A5568",
                        fontSize: "0.85rem",
                        "&:hover": {
                          color: "#FF6B35",
                        },
                        transition: "color 0.2s ease",
                      }}
                    >
                      Admin
                    </Typography>
                  </Link>
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* Copyright Section */}
        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: "1px solid rgba(255, 107, 53, 0.1)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "#4A5568",
              fontSize: "0.8rem",
            }}
          >
            © {new Date().getFullYear()} Housing Transparency. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
