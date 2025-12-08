import { useState } from "react";
import { Box, Button, Alert, Typography } from "@mui/material";
import { Link } from "react-router";
import { useAuth } from "../hooks";
import { 
  AuthLayout, 
  FormField, 
  RoleSelector, 
  TenantForm, 
  LandlordForm, 
  TermsAndConditions 
} from "../components/auth";
import { 
  validateEmail, 
  validatePassword, 
  validateName 
} from "../utils";
import type { 
  RegistrationFormData, 
  FormErrors
} from "../types";
import { COLORS } from "../constants";

export default function SignUp() {
  const { register, loading } = useAuth();
  
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "tenant",
    tenantType: "student",
    landlordType: "individual_owner",
    phoneNumber: "",
    organizationName: "",
    hpdRegistration: "",
    businessPhone: "",
    termsAccepted: false,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleInputChange = (field: keyof RegistrationFormData, value: any) => {
    setFormData((prev: RegistrationFormData) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev: FormErrors) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate required fields
    if (!formData.firstName) {
      newErrors.firstName = "First name is required";
    } else {
      const nameError = validateName(formData.firstName);
      if (nameError) newErrors.firstName = nameError;
    }
    
    if (!formData.lastName) {
      newErrors.lastName = "Last name is required";
    } else {
      const nameError = validateName(formData.lastName);
      if (nameError) newErrors.lastName = nameError;
    }
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        newErrors.password = passwordErrors.join(" ");
      }
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    // Role-specific validation
    if (formData.role === "tenant") {
      if (!formData.tenantType) {
        newErrors.tenant_type = "Tenant type is required";
      }
    } else if (formData.role === "landlord") {
      if (!formData.landlordType) {
        newErrors.landlord_type = "Landlord type is required";
      }
      
      if (formData.landlordType === "property_management" || formData.landlordType === "corporate_landlord") {
        if (!formData.organizationName) {
          newErrors.organization_name = "Organization name is required";
        }
      }
    }
    
    if (!formData.termsAccepted) {
      newErrors.terms = "You must agree to the terms and conditions";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setMessage(null);
    
    try {
      const userData = {
        username: `${formData.firstName.toLowerCase()}${formData.lastName.toLowerCase()}`,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        role: formData.role,
        first_name: formData.firstName,
        last_name: formData.lastName,
        ...(formData.role === "tenant" && {
          tenant_type: formData.tenantType,
          phone_number: formData.phoneNumber || undefined,
        }),
        ...(formData.role === "landlord" && {
          landlord_type: formData.landlordType,
          organization_name: formData.organizationName || undefined,
          hpd_registration_number: formData.hpdRegistration || undefined,
          business_phone: formData.businessPhone || undefined,
        }),
      };
      
      const result = await register(userData);
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: result.message || 'Registration successful! Please check your email to verify your account.' 
        });
        
        // Clear form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          role: "tenant",
          tenantType: "student",
          landlordType: "individual_owner",
          phoneNumber: "",
          organizationName: "",
          hpdRegistration: "",
          businessPhone: "",
          termsAccepted: false,
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Registration failed' });
        if (result.fieldErrors) {
          setErrors(result.fieldErrors);
        }
      }
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.message || 'Registration failed. Please try again.' 
      });
    }
  };

  return (
    <AuthLayout title="Join Our Community">
      {message && (
        <Alert 
          severity={message.type} 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            "& .MuiAlert-message": {
              fontSize: "0.9rem"
            }
          }}
        >
          {message.text}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Name Fields */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <FormField
            label="First Name"
            value={formData.firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('firstName', e.target.value)}
            required
            error={!!errors.firstName}
            helperText={errors.firstName}
          />
          <FormField
            label="Last Name"
            value={formData.lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('lastName', e.target.value)}
            required
            error={!!errors.lastName}
            helperText={errors.lastName}
          />
        </Box>

        {/* Email */}
        <FormField
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
          required
          error={!!errors.email}
          helperText={errors.email}
        />

        {/* Password Fields */}
        <FormField
          label="Password (8-12 characters)"
          type="password"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('password', e.target.value)}
          required
          error={!!errors.password}
          helperText={errors.password}
        />

        <FormField
          label="Confirm Password"
          type="password"
          value={formData.confirmPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('confirmPassword', e.target.value)}
          required
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword}
        />

        {/* Role Selection */}
        <RoleSelector
          value={formData.role}
          onChange={(role: "tenant" | "landlord") => handleInputChange('role', role)}
        />

        {/* Role-specific Forms */}
        {formData.role === "tenant" && (
          <TenantForm
            tenantType={formData.tenantType!}
            phoneNumber={formData.phoneNumber || ""}
            onTenantTypeChange={(type: "student" | "working_professional" | "other") => handleInputChange('tenantType', type)}
            onPhoneNumberChange={(phone: string) => handleInputChange('phoneNumber', phone)}
            errors={errors}
          />
        )}

        {formData.role === "landlord" && (
          <LandlordForm
            landlordType={formData.landlordType!}
            organizationName={formData.organizationName || ""}
            hpdRegistration={formData.hpdRegistration || ""}
            businessPhone={formData.businessPhone || ""}
            onLandlordTypeChange={(type: "individual_owner" | "property_management" | "real_estate_agent" | "corporate_landlord") => handleInputChange('landlordType', type)}
            onOrganizationNameChange={(name: string) => handleInputChange('organizationName', name)}
            onHpdRegistrationChange={(reg: string) => handleInputChange('hpdRegistration', reg)}
            onBusinessPhoneChange={(phone: string) => handleInputChange('businessPhone', phone)}
            errors={errors}
          />
        )}

        {/* Terms and Conditions */}
        <TermsAndConditions
          checked={formData.termsAccepted}
          onChange={(checked: boolean) => handleInputChange('termsAccepted', checked)}
          error={errors.terms}
        />

        {/* Submit Button */}
        <Button 
          type="submit" 
          variant="contained" 
          size="large" 
          fullWidth
          disabled={loading}
          sx={{
            backgroundColor: COLORS.PRIMARY,
            color: "white",
            fontWeight: 600,
            fontSize: "1.1rem",
            py: 1.5,
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
            "&:hover": {
              backgroundColor: COLORS.PRIMARY_HOVER,
              boxShadow: "0 6px 16px rgba(255, 107, 53, 0.4)",
            },
            "&:disabled": {
              backgroundColor: "rgba(255, 107, 53, 0.5)",
            },
          }}
        >
          {loading ? "Creating Account..." : "Create Account"}
        </Button>
      </Box>

      <Box sx={{ textAlign: "center", mt: 3 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: "#4A5568",
            fontSize: "0.9rem"
          }}
        >
          Already have an account?{" "}
          <Link 
            to="/signin" 
            style={{ 
              color: COLORS.PRIMARY, 
              textDecoration: "none", 
              fontWeight: 600
            }}
          >
            Log in
          </Link>
        </Typography>
      </Box>
    </AuthLayout>
  );
}