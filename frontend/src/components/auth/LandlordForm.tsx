import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from "@mui/material";
import { FormField } from "./FormField";
import { LANDLORD_TYPES } from "../../constants";
import type { LandlordType } from "../../types";

interface LandlordFormProps {
  landlordType: LandlordType;
  organizationName: string;
  hpdRegistration: string;
  businessPhone: string;
  onLandlordTypeChange: (type: LandlordType) => void;
  onOrganizationNameChange: (name: string) => void;
  onHpdRegistrationChange: (reg: string) => void;
  onBusinessPhoneChange: (phone: string) => void;
  errors: {
    landlord_type?: string;
    organization_name?: string;
    hpd_registration_number?: string;
    business_phone?: string;
  };
}

export const LandlordForm: React.FC<LandlordFormProps> = ({
  landlordType,
  organizationName,
  hpdRegistration,
  businessPhone,
  onLandlordTypeChange,
  onOrganizationNameChange,
  onHpdRegistrationChange,
  onBusinessPhoneChange,
  errors
}) => {
  const showOrganizationField = landlordType === 'property_management' || landlordType === 'corporate_landlord';

  return (
    <>
      <FormControl fullWidth error={!!errors.landlord_type}>
        <InputLabel>Type of Landlord *</InputLabel>
        <Select
          value={landlordType}
          onChange={(e) => onLandlordTypeChange(e.target.value as LandlordType)}
          label="Type of Landlord *"
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
        {errors.landlord_type && <FormHelperText>{errors.landlord_type}</FormHelperText>}
      </FormControl>

      {showOrganizationField && (
        <FormField
          label="Organization / Company Name *"
          type="text"
          value={organizationName}
          onChange={(e) => onOrganizationNameChange(e.target.value)}
          required
          error={!!errors.organization_name}
          helperText={errors.organization_name}
        />
      )}

      <FormField
        label="HPD Registration / License Number"
        type="text"
        value={hpdRegistration}
        onChange={(e) => onHpdRegistrationChange(e.target.value)}
        error={!!errors.hpd_registration_number}
        helperText={errors.hpd_registration_number}
        placeholder="Optional"
      />

      <FormField
        label="Business Phone Number"
        type="tel"
        value={businessPhone}
        onChange={(e) => onBusinessPhoneChange(e.target.value)}
        error={!!errors.business_phone}
        helperText={errors.business_phone}
        placeholder="Optional"
      />
    </>
  );
};
