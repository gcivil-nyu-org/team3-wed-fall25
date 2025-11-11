import { Box, Container, Paper, Typography } from "@mui/material";
import { Link } from "react-router";
import BusinessIcon from "@mui/icons-material/Business";
import { COLORS } from "../../constants";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, children }) => {
  return (
    <Box 
      sx={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        p: 4,
        background: "linear-gradient(135deg, #FFF8F3 0%, #FEF7ED 50%, #FDF2E9 100%)"
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
              <BusinessIcon sx={{ fontSize: 32, color: COLORS.PRIMARY }} />
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: "#2D3748",
                  fontFamily: '"Montserrat", "Roboto", sans-serif'
                }}
              >
                Housing Transparency
              </Typography>
            </Box>
          </Link>
        </Box>

        <Paper 
          sx={{ 
            p: 4, 
            borderRadius: 4,
            boxShadow: "0 16px 48px rgba(255, 107, 53, 0.1)",
            border: "1px solid rgba(255, 107, 53, 0.1)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)"
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              textAlign: "center", 
              mb: 3,
              fontWeight: 700,
              color: "#2D3748",
              fontFamily: '"Montserrat", "Roboto", sans-serif'
            }}
          >
            {title}
          </Typography>
          
          {children}
        </Paper>
      </Container>
    </Box>
  );
};
