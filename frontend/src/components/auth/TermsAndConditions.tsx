import { FormControlLabel, Checkbox, Typography, Link } from "@mui/material";
import { COLORS } from "../../constants";

interface TermsAndConditionsProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

export const TermsAndConditions: React.FC<TermsAndConditionsProps> = ({
  checked,
  onChange,
  error
}) => {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          sx={{
            color: COLORS.PRIMARY,
            "&.Mui-checked": {
              color: COLORS.PRIMARY,
            },
          }}
        />
      }
      label={
        <Typography variant="body2" sx={{ color: error ? "error.main" : "#4A5568" }}>
          I agree to the{" "}
          <Link href="#" sx={{ color: COLORS.PRIMARY }}>
            terms and conditions
          </Link>{" "}
          and{" "}
          <Link href="#" sx={{ color: COLORS.PRIMARY }}>
            privacy policy
          </Link>{" "}
          *
          {error && (
            <Typography component="span" sx={{ color: "error.main", ml: 1 }}>
              {error}
            </Typography>
          )}
        </Typography>
      }
    />
  );
};
