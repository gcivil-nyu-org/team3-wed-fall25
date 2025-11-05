import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { BrowserRouter } from "react-router";
import App from "./App.tsx";

// Use basename based on environment - match Vite's base path
// In dev: Vite base is '/', so basename is ''
// In production: Vite base is '/static/_app/', so basename is '/static/_app/'
const basename = import.meta.env.DEV ? "" : "/static/_app/";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
