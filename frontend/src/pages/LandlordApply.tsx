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
import { useParams, useNavigate } from "react-router";
import { LANDLORD_TYPES } from "../constants";
import type { LandlordType } from "../types";

interface FormData {
  name: string;
  email: string;
  bbl: string;
  country: string;
  landlordType: LandlordType;
  organizationName: string;
  hpdRegistration: string;
  businessPhone: string;
  agreeTerms: boolean;
}

export default function LandlordApply() {
  const { bbl } = useParams<{ bbl: string }>();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    bbl: "",
    country: "",
    landlordType: "individual_owner",
    organizationName: "",
    hpdRegistration: "",
    businessPhone: "",
    agreeTerms: false,
  });
  const [errors, setErrors] = useState<{
    organizationName?: string;
  }>({});
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

  // router navigation helper for Back button
  const navigate = useNavigate();

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

  const validateForm = (): boolean => {
    const newErrors: { organizationName?: string } = {};
    
    // Validate organization name if required
    const showOrganizationField = formData.landlordType === 'property_management' || formData.landlordType === 'corporate_landlord';
    if (showOrganizationField && !formData.organizationName.trim()) {
      newErrors.organizationName = "Organization name is required for this landlord type";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      // Call the API method with all fields
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
        bbl: bbl || "",
        country: "",
        landlordType: "individual_owner",
        organizationName: "",
        hpdRegistration: "",
        businessPhone: "",
        agreeTerms: false,
      });
      setErrors({});
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
        {/* Back button to return to previous page */}
        <Button
          onClick={() => navigate(-1)}
          variant="text"
          aria-label="Back"
          sx={{ mb: 2, alignSelf: "flex-start" }}
        >
          Back
        </Button>
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
        
        {/* Landlord Type */}
        <FormControl fullWidth margin="normal" required>
          <InputLabel id="landlord-type-label">Type of Landlord</InputLabel>
          <Select
            labelId="landlord-type-label"
            name="landlordType"
            value={formData.landlordType}
            onChange={handleSelectChange}
            label="Type of Landlord"
          >
            {LANDLORD_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type === 'individual_owner' ? 'Individual Owner' :
                 type === 'property_management' ? 'Property Management Company' :
                 type === 'real_estate_agent' ? 'Real Estate Agent' :
                 'Corporate Landlord'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Organization Name - conditional */}
        {(formData.landlordType === 'property_management' || formData.landlordType === 'corporate_landlord') && (
          <TextField
            label="Organization / Company Name"
            name="organizationName"
            value={formData.organizationName}
            onChange={handleInputChange}
            required
            margin="normal"
            error={!!errors.organizationName}
            helperText={errors.organizationName}
          />
        )}

        {/* HPD Registration */}
        <TextField
          label="HPD Registration / License Number"
          name="hpdRegistration"
          value={formData.hpdRegistration}
          onChange={handleInputChange}
          margin="normal"
          placeholder="Optional"
        />

        {/* Business Phone */}
        <TextField
          label="Business Phone Number"
          name="businessPhone"
          value={formData.businessPhone}
          onChange={handleInputChange}
          type="tel"
          margin="normal"
          placeholder="Optional"
        />

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
