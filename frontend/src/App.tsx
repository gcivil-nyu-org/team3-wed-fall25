import { Routes, Route, Outlet } from "react-router";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import AppAppBar from "./components/AppBar";
import { Home, Search, SignIn, SignUp } from "./pages";

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
              <div>
                <AppAppBar />
                <Outlet />
              </div>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="search" element={<Search />} />
          </Route>
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
        </Routes>
    </ThemeProvider>
  );
}

export default App;
