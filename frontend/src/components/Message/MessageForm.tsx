import { Box, TextareaAutosize, Button } from "@mui/material";
import { sendMessage, type CommunityInbox } from "../../api";
import type { AxiosError } from "axios";
import { useState } from "react";

const MessageForm = ({
  peerId,
  onSuccess,
}: {
  peerId: CommunityInbox["peer"]["id"];
  onSuccess(): void;
}) => {
  const [body, setBody] = useState<string>("");

  const handleSubmit = async () => {
    if (!!body) {
      try {
        await sendMessage(peerId, body);

        setBody("");
        onSuccess();

        alert("Sent");
      } catch (e) {
        alert((e as AxiosError).message);
      }
    }
  };

  return (
    <Box sx={{ p: 1, mb: 2 }}>
      <TextareaAutosize
        minRows={5}
        style={{ width: "100%" }}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Box sx={{ textAlign: "right" }}>
        <Button size="small" variant="contained" onClick={handleSubmit}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

export default MessageForm;
