import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Rating,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Favorite,
  FavoriteBorder,
  Star,
  StarBorder,
  Comment,
  Message,
  Send,
  Delete,
  Edit,
  Add,
  LocationOn,
  Person,
} from '@mui/icons-material';
import { useProfile } from '../hooks/useProfile';
import {
  fetchFavorites,
  addFavorite,
  removeFavorite,
  fetchReviews,
  createReview,
  deleteReview,
  fetchReviewComments,
  createReviewComment,
  deleteReviewComment,
  fetchInboxMessages,
  fetchOutboxMessages,
  sendMessage,
  markMessageAsRead,
  deleteMessage,
  type CommunityFavorite,
  type CommunityReview,
  type CommunityReviewComment,
  type CommunityMessage,
} from '../api/index';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`community-tabpanel-${index}`}
      aria-labelledby={`community-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Community: React.FC = () => {
  const { profile, isLoading: profileLoading } = useProfile();
  const [tabValue, setTabValue] = useState(0);
  const [favorites, setFavorites] = useState<CommunityFavorite[]>([]);
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedBbl, setSelectedBbl] = useState<string>('');
  const [newReview, setNewReview] = useState({ title: '', body: '', rating: 0 });
  const [newMessage, setNewMessage] = useState({ receiverId: 0, body: '', bbl: '' });

  // Load data based on active tab
  useEffect(() => {
    if (profile && !profileLoading) {
      loadTabData();
    }
  }, [tabValue, profile, profileLoading]);

  const loadTabData = async () => {
    if (!profile) return;
    
    setLoading(true);
    setError(null);
    
    try {
      switch (tabValue) {
        case 0: // Favorites
          const favoritesData = await fetchFavorites();
          setFavorites(favoritesData);
          break;
        case 1: // Reviews
          // For now, show empty state - in real app, you'd fetch user's reviews
          setReviews([]);
          break;
        case 2: // Messages
          const [inboxData, outboxData] = await Promise.all([
            fetchInboxMessages(),
            fetchOutboxMessages()
          ]);
          setMessages([...inboxData, ...outboxData].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
          break;
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddFavorite = async (bbl: string, note?: string) => {
    try {
      const newFavorite = await addFavorite(bbl, note);
      setFavorites(prev => [newFavorite, ...prev]);
    } catch (err) {
      setError('Failed to add favorite. Please try again.');
    }
  };

  const handleRemoveFavorite = async (favoriteId: number) => {
    try {
      await removeFavorite(favoriteId);
      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
    } catch (err) {
      setError('Failed to remove favorite. Please try again.');
    }
  };

  const handleCreateReview = async () => {
    try {
      const review = await createReview(
        selectedBbl,
        newReview.title,
        newReview.body,
        newReview.rating > 0 ? newReview.rating : undefined
      );
      setReviews(prev => [review, ...prev]);
      setReviewDialogOpen(false);
      setNewReview({ title: '', body: '', rating: 0 });
      setSelectedBbl('');
    } catch (err) {
      setError('Failed to create review. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    try {
      const message = await sendMessage(
        newMessage.receiverId,
        newMessage.body,
        newMessage.bbl || undefined
      );
      setMessages(prev => [message, ...prev]);
      setMessageDialogOpen(false);
      setNewMessage({ receiverId: 0, body: '', bbl: '' });
    } catch (err) {
      setError('Failed to send message. Please try again.');
    }
  };

  if (profileLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading...</Typography>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">
          Please sign in to access community features.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom 
        sx={{ 
          fontWeight: 700, 
          color: "#2D3748",
          fontFamily: '"Montserrat", "Roboto", sans-serif',
          mb: 4
        }}
      >
        Community Hub
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="community tabs">
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Favorite />
                  <span>My Favorites</span>
                  {favorites.length > 0 && (
                    <Chip label={favorites.length} size="small" color="primary" />
                  )}
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Star />
                  <span>Reviews</span>
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Message />
                  <span>Messages</span>
                  {messages.filter(m => !m.read_at && m.receiver_id === profile.id).length > 0 && (
                    <Badge 
                      badgeContent={messages.filter(m => !m.read_at && m.receiver_id === profile.id).length} 
                      color="error"
                    >
                      <Message />
                    </Badge>
                  )}
                </Box>
              } 
            />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Saved Buildings
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => {
                const bbl = prompt('Enter BBL (10-digit number):');
                const note = prompt('Add a note (optional):');
                if (bbl && bbl.match(/^\d{10}$/)) {
                  handleAddFavorite(bbl, note || undefined);
                } else if (bbl) {
                  setError('Please enter a valid 10-digit BBL number.');
                }
              }}
            >
              Add Building
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : favorites.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <FavoriteBorder sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No saved buildings yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Save buildings you're interested in to keep track of them here.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {favorites.map((favorite) => (
                <Card key={favorite.id} sx={{ display: 'flex', alignItems: 'center' }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LocationOn color="action" />
                      <Typography variant="h6">BBL: {favorite.bbl}</Typography>
                    </Box>
                    {favorite.note && (
                      <Typography variant="body2" color="text.secondary">
                        Note: {favorite.note}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Added {new Date(favorite.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => window.open(`/building/${favorite.bbl}`, '_blank')}
                    >
                      View Details
                    </Button>
                    <IconButton
                      color="error"
                      onClick={() => handleRemoveFavorite(favorite.id)}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Building Reviews
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                const bbl = prompt('Enter BBL for the building you want to review:');
                if (bbl && bbl.match(/^\d{10}$/)) {
                  setSelectedBbl(bbl);
                  setReviewDialogOpen(true);
                } else if (bbl) {
                  setError('Please enter a valid 10-digit BBL number.');
                }
              }}
            >
              Write Review
            </Button>
          </Box>

          <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
            <Star sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No reviews yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Write reviews about buildings to help other tenants make informed decisions.
            </Typography>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Messages
            </Typography>
            <Button
              variant="contained"
              startIcon={<Send />}
              onClick={() => {
                const receiverId = prompt('Enter receiver user ID:');
                const bbl = prompt('Enter BBL (optional):');
                if (receiverId && !isNaN(Number(receiverId))) {
                  setNewMessage({ 
                    receiverId: Number(receiverId), 
                    body: '', 
                    bbl: bbl || '' 
                  });
                  setMessageDialogOpen(true);
                } else if (receiverId) {
                  setError('Please enter a valid user ID number.');
                }
              }}
            >
              Send Message
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Message sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No messages yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connect with other tenants to share experiences and information.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {messages.map((message) => (
                <Card key={message.id} sx={{ opacity: message.read_at ? 0.7 : 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        <Person />
                      </Avatar>
                      <Typography variant="subtitle2">
                        {message.sender_id === profile.id ? 'You' : `User ${message.sender_id}`}
                        {message.receiver_id === profile.id ? ' → You' : ` → User ${message.receiver_id}`}
                      </Typography>
                      {!message.read_at && message.receiver_id === profile.id && (
                        <Chip label="Unread" size="small" color="primary" />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {message.body}
                    </Typography>
                    {message.bbl && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          BBL: {message.bbl}
                        </Typography>
                      </Box>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(message.created_at).toLocaleString()}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    {!message.read_at && message.receiver_id === profile.id && (
                      <Button
                        size="small"
                        onClick={async () => {
                          try {
                            await markMessageAsRead(message.id);
                            setMessages(prev => prev.map(m => 
                              m.id === message.id ? { ...m, read_at: new Date().toISOString() } : m
                            ));
                          } catch (err) {
                            setError('Failed to mark message as read.');
                          }
                        }}
                      >
                        Mark as Read
                      </Button>
                    )}
                    <IconButton
                      color="error"
                      onClick={async () => {
                        try {
                          await deleteMessage(message.id);
                          setMessages(prev => prev.filter(m => m.id !== message.id));
                        } catch (err) {
                          setError('Failed to delete message.');
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          )}
        </TabPanel>
      </Paper>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Write a Review</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={newReview.title}
            onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Rating (optional)
            </Typography>
            <Rating
              value={newReview.rating}
              onChange={(event, newValue) => {
                setNewReview(prev => ({ ...prev, rating: newValue || 0 }));
              }}
            />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Review"
            value={newReview.body}
            onChange={(e) => setNewReview(prev => ({ ...prev, body: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateReview}
            variant="contained"
            disabled={!newReview.title || !newReview.body}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Send Message</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Receiver User ID"
            type="number"
            value={newMessage.receiverId || ''}
            onChange={(e) => setNewMessage(prev => ({ ...prev, receiverId: Number(e.target.value) }))}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="BBL (optional)"
            value={newMessage.bbl}
            onChange={(e) => setNewMessage(prev => ({ ...prev, bbl: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message"
            value={newMessage.body}
            onChange={(e) => setNewMessage(prev => ({ ...prev, body: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSendMessage}
            variant="contained"
            disabled={!newMessage.receiverId || !newMessage.body}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Community;
