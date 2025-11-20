# Admin Dashboard Analysis

## Current State

The Admin Dashboard (`frontend/src/pages/AdminDashboard.tsx`) currently displays **all dummy/mock data** and needs to be connected to real backend APIs.

## Components Analysis

### 1. **Platform Statistics Cards** (Lines 48-53, 164-236)
**Current:** Hardcoded values
- `totalUsers: 1247`
- `totalReviews: 3421`
- `pendingReports: 23`
- `buildingsTracked: 15689`

**Backend Available:**
- ✅ `CustomUser` model exists - can count users
- ✅ `CommunityReviews` model exists - can count reviews
- ✅ Building data exists - can count buildings
- ❌ No endpoint for flagged/pending reports count

**Action Required:**
- Create admin API endpoint: `GET /api/admin/stats/` to return all statistics

### 2. **Moderation Queue** (Lines 55-83, 264-376)
**Current:** Hardcoded array of 3 items with structure:
```typescript
{
  id: number,
  type: "review" | "user",
  content: string,
  author: string,
  reportedBy: number,
  createdAt: string,
  status: "pending"
}
```

**Backend Available:**
- ✅ `CommunityReviews` model has `flagged` field (can be set via `FlagReviewView`)
- ✅ Reviews can be flagged via `/api/landlord/reviews/flag/`
- ❌ No endpoint to get all flagged reviews
- ❌ No endpoint to approve/remove reviews
- ❌ No user reporting system exists

**Action Required:**
- Create admin API endpoint: `GET /api/admin/moderation-queue/` to return flagged reviews
- Create admin API endpoint: `POST /api/admin/reviews/{id}/approve/` 
- Create admin API endpoint: `POST /api/admin/reviews/{id}/remove/`
- Query reviews where `flagged = TRUE` or from `landlord_review_flags` table

### 3. **Activity Logs** (Lines 85-107, 527-584)
**Current:** Hardcoded array of admin actions
```typescript
{
  id: number,
  action: string, // "Approved review", "Removed review", "Banned user"
  admin: string,
  target: string,
  timestamp: string
}
```

**Backend Available:**
- ❌ No activity log system exists
- ❌ No admin action tracking

**Action Required:**
- Create `AdminActivityLog` model to track admin actions
- Create admin API endpoint: `GET /api/admin/activity-logs/`
- Log actions when reviews are approved/removed

### 4. **Weekly Statistics** (Lines 109-114, 382-444)
**Current:** Hardcoded values
- `reviewsApproved: 145`
- `reviewsRemoved: 12`
- `usersBanned: 3`
- `reportsResolved: 89`

**Backend Available:**
- ❌ No weekly statistics tracking

**Action Required:**
- Create admin API endpoint: `GET /api/admin/weekly-stats/`
- Query activity logs for last 7 days and aggregate

### 5. **Platform Health** (Lines 116-121, 446-522)
**Current:** Hardcoded status values
- `apiStatus: "healthy"`
- `dbStatus: "healthy"`
- `emailService: "healthy"`
- `storageUsage: 65`

**Backend Available:**
- ❌ No health check endpoints

**Action Required:**
- Create admin API endpoint: `GET /api/admin/health/`
- Implement health checks for:
  - Database connectivity
  - Email service (if configured)
  - Storage usage (if applicable)

### 6. **Action Handlers** (Lines 123-133)
**Current:** Empty TODO functions
- `handleApprove()` - TODO
- `handleRemove()` - TODO
- `handleReview()` - TODO

**Action Required:**
- Implement API calls to approve/remove reviews
- Implement navigation to review detail view

## Backend Models Available

### ✅ Existing Models:
1. **CustomUser** (`backend/apps/user/models.py`)
   - Can query total user count
   - Has email, username fields

2. **CommunityReviews** (`backend/apps/community/models.py`)
   - Has `flagged` field (may be in separate table)
   - Can query flagged reviews
   - Has `deleted_at` for soft deletes

3. **Building Data** (via `BuildingRepository`)
   - Can count total buildings tracked

### ❌ Missing Models/Features:
1. **AdminActivityLog** - Need to create
2. **User Reports** - No reporting system exists
3. **Admin User Management** - No admin role/permissions system

## Required Backend Endpoints

### Priority 1: Core Statistics
```
GET /api/admin/stats/
Response: {
  totalUsers: number,
  totalReviews: number,
  pendingReports: number,
  buildingsTracked: number
}
```

### Priority 2: Moderation Queue
```
GET /api/admin/moderation-queue/
Response: [{
  id: number,
  type: "review",
  content: string,
  author: string,
  reportedBy: number,
  createdAt: string,
  status: "pending"
}]

POST /api/admin/reviews/{id}/approve/
POST /api/admin/reviews/{id}/remove/
```

### Priority 3: Activity Logs
```
GET /api/admin/activity-logs/
Response: [{
  id: number,
  action: string,
  admin: string,
  target: string,
  timestamp: string
}]
```

### Priority 4: Weekly Stats
```
GET /api/admin/weekly-stats/
Response: {
  reviewsApproved: number,
  reviewsRemoved: number,
  usersBanned: number,
  reportsResolved: number
}
```

### Priority 5: Health Check
```
GET /api/admin/health/
Response: {
  apiStatus: "healthy" | "warning" | "error",
  dbStatus: "healthy" | "warning" | "error",
  emailService: "healthy" | "warning" | "error",
  storageUsage: number
}
```

## Implementation Plan

### Phase 1: Backend API Creation
1. Create `backend/apps/admin/` app
2. Create admin views for all endpoints
3. Create `AdminActivityLog` model
4. Add admin authentication/permissions
5. Implement statistics queries
6. Implement moderation actions

### Phase 2: Frontend Integration
1. Create `frontend/src/api/admin/` directory
2. Create API functions for all endpoints
3. Replace dummy data with API calls
4. Add loading states and error handling
5. Implement action handlers (approve/remove)
6. Add refresh functionality

### Phase 3: Testing & Polish
1. Test all API endpoints
2. Test moderation workflows
3. Add error handling
4. Add success notifications
5. Test with real data

## Notes

- The dashboard uses sessionStorage for admin authentication (`admin_authenticated`)
- Admin login is currently hardcoded in `AdminLogin.tsx` (username: "admin", password: "test1234")
- Need to implement proper admin authentication with backend
- Flagged reviews are stored in `community_reviews.flagged` or `landlord_review_flags` table
- All reviews use soft deletes (`deleted_at` field)

