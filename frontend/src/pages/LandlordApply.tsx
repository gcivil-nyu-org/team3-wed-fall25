import {
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Checkbox,
  FormControlLabel,
  Typography,
  Alert,
  Snackbar,
  type AlertColor, // Use type-only import
} from "@mui/material";
import { useState, type FormEvent, useEffect } from "react"; // Use type-only import
import * as landlordApi from "../api/landlord";
import { useParams } from "react-router";

interface FormData {
  name: string;
  email: string;
  bbl: string;
  country: string;
  agreeTerms: boolean;
}

export default function LandlordApply() {
  const { bbl } = useParams<{ bbl: string }>();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    bbl: "",
    country: "",
    agreeTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (bbl) {
      setFormData((prevData) => ({
        ...prevData,
        bbl: bbl,
      }));
    }
  }, [bbl]); // This effect runs when the bbl parameter changes

  // Separate handlers for different input types
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSelectChange = (event: any) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: checked,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Call the API method
      await landlordApi.submitApplication(formData);

      // Show success message
      setSnackbar({
        open: true,
        message: "Application submitted successfully!",
        severity: "success",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        bbl: bbl ||"",
        country: "",
        agreeTerms: false,
      });
    } catch (error) {
      // Show error message
      setSnackbar({
        open: true,
        message:
          "Failed to submit application. Please try again." +
          (error instanceof Error ? `Error: ${error.message}` : ""),
        severity: "error",
      });
      console.error("Submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: "column",
          maxWidth: 600,
          mx: "auto",
          mt: 12,
          p: 2,
          border: "1px solid #ccc",
          borderRadius: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Landlord Application
        </Typography>
        <TextField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
          margin="normal"
        />
        <TextField
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          type="email"
          required
          margin="normal"
        />
        <TextField
          label="Building BBL"
          name="bbl"
          value={formData.bbl}
          onChange={handleInputChange}
          required
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel id="country-label">Country</InputLabel>
          <Select
            labelId="country-label"
            name="country"
            value={formData.country}
            onChange={handleSelectChange}
            label="Country"
            required
          >
            <MenuItem value="USA">USA</MenuItem>
            <MenuItem value="Canada">Canada</MenuItem>
            <MenuItem value="UK">UK</MenuItem>
            <MenuItem value="Australia">Australia</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleCheckboxChange}
              required
            />
          }
          label="I agree to the terms and conditions"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Application"}
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
