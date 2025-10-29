// API endpoint constants

export const API_ENDPOINTS = {
  AUTH: {
    PROFILE: '/auth/profile',
    LOGIN: '/auth/login/',
    REGISTER: '/auth/signup/',
    VERIFY_EMAIL: '/auth/verify-email/',
    RESEND_VERIFICATION: '/auth/resend-verification/',
  },
  BUILDING: {
    DETAILS: '/building/',
    SEARCH: '/buildings/search/',
  },
  NEIGHBORHOOD: {
    STATS: '/neighborhood/stats/',
    HEATMAP: '/neighborhood/heatmap/',
    BOROUGH_SUMMARY: '/neighborhood/borough-summary/',
    TRENDS: '/neighborhood/trends/',
  },
  COMMUNITY: {
    REVIEWS: '/community/reviews/',
    REVIEW_COMMENTS: '/community/review-comments/',
    FAVORITES: '/community/favorites/',
    MESSAGES_INBOX: '/community/messages/inbox/',
    MESSAGES_OUTBOX: '/community/messages/outbox/',
    MESSAGES_SEND: '/community/messages/send/',
    MESSAGES_MARK_READ: '/community/messages',
    MESSAGES_DELETE: '/community/messages',
  },
} as const;
