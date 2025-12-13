import { PersonOutline } from "@mui/icons-material";
import { Box, Typography, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { SendMessageButton } from "./Message";

const UserLabel = ({
  username,
  userId,
  enableActions,
}: {
  username: string;
  userId: number;
  enableActions?: boolean;
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    enableActions && setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          border: "none",
          background: "#fff",
          cursor: enableActions ? "pointer" : "default",
          paddingLeft: 1,
        }}
        component={enableActions ? "button" : "div"}
        onClick={handleClick}
      >
        <PersonOutline color="action" sx={{ fontSize: 16 }} />
        <Typography variant="caption" color="text.secondary">
          {username}
        </Typography>
      </Box>

      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          list: {
            "aria-labelledby": "basic-button",
          },
        }}
      >
        <MenuItem>
          <SendMessageButton peerId={userId} />
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserLabel;
