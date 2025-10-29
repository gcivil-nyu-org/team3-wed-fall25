import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { COLORS } from "../../constants";
import type { UserRole } from "../../types";

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ value, onChange }) => {
  return (
    <FormControl component="fieldset">
      <FormLabel 
        component="legend" 
        sx={{ 
          color: "#2D3748",
          fontWeight: 600,
          fontSize: "0.9rem",
          mb: 1
        }}
      >
        I am a *
      </FormLabel>
      <RadioGroup
        value={value}
        onChange={(e) => onChange(e.target.value as UserRole)}
        row
        sx={{ gap: 2 }}
      >
        <FormControlLabel 
          value="tenant" 
          control={
            <Radio 
              sx={{
                color: COLORS.PRIMARY,
                "&.Mui-checked": {
                  color: COLORS.PRIMARY,
                },
              }}
            />
          } 
          label="Tenant" 
          sx={{
            "& .MuiFormControlLabel-label": {
              color: "#4A5568",
              fontSize: "0.9rem",
            }
          }}
        />
        <FormControlLabel 
          value="landlord" 
          control={
            <Radio 
              sx={{
                color: COLORS.PRIMARY,
                "&.Mui-checked": {
                  color: COLORS.PRIMARY,
                },
              }}
            />
          } 
          label="Landlord" 
          sx={{
            "& .MuiFormControlLabel-label": {
              color: "#4A5568",
              fontSize: "0.9rem",
            }
          }}
        />
      </RadioGroup>
    </FormControl>
  );
};
