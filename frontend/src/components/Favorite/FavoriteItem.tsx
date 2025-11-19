import { useNavigate } from "react-router";
import type { CommunityFavorite } from "../../api";
import Reviews from "../Reviews";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Paper,
  Typography,
} from "@mui/material";
import DateLabel from "../DateLabel";
import { ExpandMore, LocationOn } from "@mui/icons-material";

const FavoriteItem = ({
  favorite,
  openReviews,
}: {
  favorite: CommunityFavorite;
  openReviews?: boolean;
}) => {
  const { bbl, updated_at, registration } = favorite;
  const navigate = useNavigate();

  const handleViewDetails = () => {
    navigate(`/building/${bbl}`);
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 0.5,
            flexGrow: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocationOn color="action" />
            <Box>
              {registration ? (
                <>
                  <Box>
                    <Typography variant="subtitle2" component="div">
                      {registration.house_number} {registration.street_name}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {registration.boro}, NY {registration.zip}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box>
                  <Typography variant="subtitle2" component="div">
                    Building {bbl}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registration details not available
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary">
            BBL: {bbl}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          color="primary"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
        >
          View Details
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Added to favorites on
        </Typography>{" "}
        <DateLabel date={updated_at} />
        {favorite.note && (
          <>
            <Typography variant="caption" color="text.secondary">
              •
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Note: {favorite.note}
            </Typography>
          </>
        )}
      </Box>

      <Box>
        <Accordion defaultExpanded={openReviews}>
          <AccordionSummary
            expandIcon={<ExpandMore />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            <Typography variant="subtitle1" component="span">
              Reviews
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Reviews bbl={bbl} hideTitle readonly />
          </AccordionDetails>
        </Accordion>
      </Box>
    </Paper>
  );
};

export default FavoriteItem;
