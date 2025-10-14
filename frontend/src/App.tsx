import { Routes, Route, Outlet } from "react-router";
import { Box } from "@mui/material";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import AppAppBar from "./components/AppBar";
import { SiteFooter } from "./components/SiteFooter";
import { Home, Search, SignIn, SignUp, Building } from "./pages";
import LandlordDashboard from "./pages/LandlordDashboard";

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
            <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              <AppAppBar />
              <Box component="main" sx={{ flex: 1 }}>
                <Outlet />
              </Box>
              <SiteFooter />
            </Box>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="building/:bbl" element={<Building />} />
          <Route path="landlord/dashboard" element={<LandlordDashboard />} />
        </Route>
        <Route path="signin" element={<SignIn />} />
        <Route path="signup" element={<SignUp />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
