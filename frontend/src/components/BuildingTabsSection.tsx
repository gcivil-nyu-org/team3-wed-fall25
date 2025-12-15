import React from "react";
import { Box, Card, CardContent, Paper, Tabs, Tab, Typography, List, ListItem, ListItemText, Divider, Button } from "@mui/material";
import { TrendingUp, Warning, Assignment } from "@mui/icons-material";

interface Props {
  tabValue: number;
  handleTabChange: (e: React.SyntheticEvent, newValue: number) => void;
  trendData: Array<any>;
  violations: any[];
  complaints: any[];
  stats: any;
  onToggleViolation?: (violation_id: number | string, resolved: boolean) => Promise<void> | void;
  onToggleComplaint?: (complaint_id: number | string, resolved: boolean) => Promise<void> | void;
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Helper: map violation class -> color
const getViolationSeverityColor = (violationClass: string) => {
  switch ((violationClass || "").toUpperCase()) {
    case "C":
      return "error";
    case "B":
      return "warning";
    case "A":
      return "info";
    default:
      return "textSecondary";
  }
};

// Helper: map complaint status -> color
const getComplaintStatusColor = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s.includes("open")) return "error";
  if (s.includes("in progress") || s.includes("in-progress")) return "warning";
  if (s.includes("resolved") || s.includes("close")) return "success";
  return "textSecondary";
};

export default function BuildingTabsSection({ tabValue, handleTabChange, trendData, violations, complaints, onToggleViolation, onToggleComplaint }: Props) {
  return (
    <Paper>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab icon={<TrendingUp />} label="Violation Trends" />
        <Tab icon={<Warning />} label="Violations" />
        <Tab icon={<Assignment />} label="Complaints" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Eviction & Violation Trends (Monthly)
            </Typography>

            {/* Render a consistent 12-month axis. Fill missing months with zeros. */}
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end", height: 200, mt: 3 }}>
              {(() => {
                const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                const map = new Map<string, any>(trendData.map((d: any) => [d.month, d]));
                return monthNames.map((mn) => {
                  const month = map.get(mn) ?? { month: mn, violations: 0, evictions: 0, complaints: 0 };
                  return (
                    <Box key={mn} sx={{ flex: 1, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                      <Box sx={{ height: `${(month.violations || 0) * 15}%`, bgcolor: "warning.main", borderRadius: "4px 4px 0 0", mb: 0.5, position: "relative" }}>
                        {(month.violations || 0) > 0 && (
                          <Typography variant="caption" sx={{ position: "absolute", top: -20, left: 0, right: 0 }}>{month.violations}</Typography>
                        )}
                      </Box>

                      <Box sx={{ height: `${(month.evictions || 0) * 30}%`, bgcolor: "error.main", borderRadius: "4px 4px 0 0", mb: 0.5, position: "relative" }}>
                        {(month.evictions || 0) > 0 && (
                          <Typography variant="caption" sx={{ position: "absolute", top: -20, left: 0, right: 0 }}>{month.evictions}</Typography>
                        )}
                      </Box>

                      <Box sx={{ height: `${(month.complaints || 0) * 10}%`, bgcolor: "info.main", borderRadius: "4px 4px 0 0", position: "relative" }}>
                        {(month.complaints || 0) > 0 && (
                          <Typography variant="caption" sx={{ position: "absolute", top: -20, left: 0, right: 0 }}>{month.complaints}</Typography>
                        )}
                      </Box>

                      <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>{mn}</Typography>
                    </Box>
                  );
                });
              })()}
            </Box>

            <Box sx={{ display: "flex", justifyContent: "center", gap: 3, mt: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: "warning.main", borderRadius: 1 }} />
                <Typography variant="caption">Violations</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: "error.main", borderRadius: 1 }} />
                <Typography variant="caption">Evictions</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: "info.main", borderRadius: 1 }} />
                <Typography variant="caption">Complaints</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Building Violations
              <Box component="span" sx={{ ml: 1, fontSize: 12 }}>{violations.length}</Box>
            </Typography>

            {violations.length === 0 ? (
              <Typography variant="body2">No violations found for this building.</Typography>
            ) : (
              <List>
                {violations.map((violation) => (
                  <React.Fragment key={violation.id || violation.violation_id}>
                    <ListItem alignItems="flex-start" secondaryAction={
                      <Button size="small" variant="contained" onClick={() => onToggleViolation && onToggleViolation(violation.violation_id, !(violation.violation_status || '').toLowerCase().includes('clos'))}>
                        {((violation.violation_status || '').toLowerCase().includes('clos') ? 'Unresolve' : 'Resolve')}
                      </Button>
                    }>
                      <ListItemText
                        primary={violation.nov_description || violation.message}
                        secondary={
                          <Typography variant="body2" color={getViolationSeverityColor(violation.class || (violation["class"] || ""))}>
                            {`Status: ${violation.violation_status || ""}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {violations.length > 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tenant Complaints
              <Box component="span" sx={{ ml: 1, fontSize: 12 }}>{complaints.length}</Box>
            </Typography>

            {complaints.length === 0 ? (
              <Typography variant="body2">No complaints found for this building.</Typography>
            ) : (
              <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
                {complaints.map((complaint) => (
                  <Card
                    key={complaint.id || complaint.complaint_id}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {complaint.type}
                        {complaint.apartment ? ` - Unit ${complaint.apartment}` : ''}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {complaint.major_category} • {complaint.minor_category}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {complaint.status_description}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="textSecondary">Reported: {complaint.complaint_status_date ? new Date(complaint.complaint_status_date).toLocaleDateString() : ''}</Typography>
                        <Typography variant="caption" color={getComplaintStatusColor(complaint.complaint_status || (complaint["complaint_status"] || ""))} sx={{ mr: 1 }}>{complaint.complaint_status || ''}</Typography>
                        <Box>
                          <Button size="small" variant="contained" onClick={() => onToggleComplaint && onToggleComplaint(complaint.complaint_id ?? complaint.id, (complaint.complaint_status || '').toLowerCase() !== 'closed' && (complaint.complaint_status || '').toLowerCase() !== 'resolved')}>
                            {((complaint.complaint_status || '').toLowerCase().includes('clos') || (complaint.complaint_status || '').toLowerCase().includes('resolv')) ? 'Unresolve' : 'Resolve'}
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </Paper>
  );
}
