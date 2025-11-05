import { Routes, Route, Outlet, Navigate } from "react-router";
import { Box } from "@mui/material";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import AppAppBar from "./components/AppBar";
import { SiteFooter } from "./components/SiteFooter";

import LandlordApply from "./pages/LandlordApply";
import LandlordDashboard from "./pages/LandlordDashboard";
import BuildingDetail from "./pages/BuildingDetail";
import {
  Home,
  Search,
  SignIn,
  SignUp,
  Building,
  Community,
  Message,
  Profile,
  Landlords,
} from "./pages";
import TenantDashboard from "./pages/TenantDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import SimplifiedMap from "./pages/SimplifiedMap";
import VerifyEmail from "./pages/VerifyEmail";

function App() {
  return (
    <ThemeProvider
      theme={createTheme({
        palette: {
          mode: "light",
        },
      })}
    >
      <CssBaseline enableColorScheme />
      <Routes>
        <Route
          path="/"
          element={
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
              }}
            >
              <AppAppBar />
              <Box component="main" sx={{ flex: 1 }}>
                <Outlet />
              </Box>
              <SiteFooter />
            </Box>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="dashboard" element={<TenantDashboard />} />
          <Route path="search" element={<Search />} />
          <Route path="map" element={<SimplifiedMap />} />
          <Route path="community" element={<Community />} />
          <Route path="landlords" element={<Landlords />} />
          <Route path="building/:bbl" element={<Building />} />
          <Route path="landlord/dashboard" element={<LandlordDashboard />} />
          <Route path="landlord/apply" element={<LandlordApply />} />
          <Route path="landlord/building/:bbl" element={<BuildingDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="message" element={<Message />} />
        </Route>
        <Route path="admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="admin/login" element={<AdminLogin />} />
        <Route
          path="admin/dashboard"
          element={
            <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              <AppAppBar />
              <Box component="main" sx={{ flex: 1 }}>
                <AdminDashboard />
              </Box>
              <SiteFooter />
            </Box>
          }
        />
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        {/* Catch-all route for unmatched paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
