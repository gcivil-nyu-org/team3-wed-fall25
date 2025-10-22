import { useState } from "react";
import { Box, Button, Typography, Alert } from "@mui/material";
import { fetchProfile } from "../api/auth";

export default function AuthTest() {
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testProfileEndpoint = async () => {
    setLoading(true);
    setResult("Testing...");
    
    try {
      const response = await fetchProfile();
      setResult(`✅ SUCCESS: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error: any) {
      setResult(`❌ ERROR: ${error.response?.status} - ${error.response?.data?.error_message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, border: 1, borderColor: "divider", borderRadius: 2, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        JWT Authentication Test
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Testing /auth/profile endpoint to verify JWT token handling
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={testProfileEndpoint}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? "Testing..." : "Test Profile Endpoint"}
      </Button>
      
      {result && (
        <Alert severity={result.includes("SUCCESS") ? "success" : "error"}>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>
            {result}
          </pre>
        </Alert>
      )}
    </Box>
  );
}
