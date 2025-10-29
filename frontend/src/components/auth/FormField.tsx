import { TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import { COLORS } from "../../constants";

interface FormFieldProps extends Omit<TextFieldProps, 'sx'> {
  error?: boolean;
  helperText?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ 
  error = false, 
  helperText, 
  ...props 
}) => {
  return (
    <TextField
      {...props}
      error={error}
      helperText={helperText}
      fullWidth
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: 2,
          "& fieldset": {
            borderColor: "rgba(255, 107, 53, 0.2)",
          },
          "&:hover fieldset": {
            borderColor: "rgba(255, 107, 53, 0.4)",
          },
          "&.Mui-focused fieldset": {
            borderColor: COLORS.PRIMARY,
          },
        },
        "& .MuiInputLabel-root.Mui-focused": {
          color: COLORS.PRIMARY,
        },
      }}
    />
  );
};
