import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from "@mui/material";
import { FormField } from "./FormField";
import { TENANT_TYPES } from "../../constants";
import type { TenantType } from "../../types";

interface TenantFormProps {
  tenantType: TenantType;
  phoneNumber: string;
  onTenantTypeChange: (type: TenantType) => void;
  onPhoneNumberChange: (phone: string) => void;
  errors: {
    tenant_type?: string;
    phone_number?: string;
  };
}

export const TenantForm: React.FC<TenantFormProps> = ({
  tenantType,
  phoneNumber,
  onTenantTypeChange,
  onPhoneNumberChange,
  errors
}) => {
  return (
    <>
      <FormControl fullWidth error={!!errors.tenant_type}>
        <InputLabel>Type of Tenant *</InputLabel>
        <Select
          value={tenantType}
          onChange={(e) => onTenantTypeChange(e.target.value as TenantType)}
          label="Type of Tenant *"
        >
          {TENANT_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type === 'student' ? 'Student' : 
               type === 'working_professional' ? 'Working Professional' : 
               'Other'}
            </MenuItem>
          ))}
        </Select>
        {errors.tenant_type && <FormHelperText>{errors.tenant_type}</FormHelperText>}
      </FormControl>

      <FormField
        label="Phone Number"
        type="tel"
        value={phoneNumber}
        onChange={(e) => onPhoneNumberChange(e.target.value)}
        error={!!errors.phone_number}
        helperText={errors.phone_number}
        placeholder="Optional"
      />
    </>
  );
};
