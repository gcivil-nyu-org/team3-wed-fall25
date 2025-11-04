import { Alert, AlertTitle, Button } from "@mui/material";

export interface ComplianceAlertProps {
  message: string;
  onResolve?: () => void;
  resolved?: boolean;
}

export function ComplianceAlert({ message, onResolve, resolved }: ComplianceAlertProps) {
  return (
    <Alert severity={resolved ? "success" : "error"} sx={{ mb: 2 }}
      action={
        !resolved && onResolve ? (
          <Button color="inherit" size="small" onClick={onResolve}>
            Mark Resolved
          </Button>
        ) : null
      }
    >
      <AlertTitle>{resolved ? "Resolved" : "Open Violation"}</AlertTitle>
      {message}
    </Alert>
  );
}
