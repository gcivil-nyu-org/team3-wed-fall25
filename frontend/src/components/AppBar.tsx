import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import { useState } from "react";
import { NavLink } from "react-router";

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

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  return (
    <AppBar
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
                Landlords
              </Button>
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

          {/* Auth Buttons */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              gap: 1,
              alignItems: "center",
            }}
          >
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
                  <IconButton onClick={toggleDrawer(false)} sx={{ color: "#4A5568" }}>
                    <CloseIcon />
                  </IconButton>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
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

                <Divider sx={{ my: 2, borderColor: "rgba(255, 107, 53, 0.1)" }} />

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
              </Box>
            </Drawer>
          </Box>
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
