# Application Management Controls - Implementation Plan

## Overview
Implement a comprehensive application lifecycle management system that allows administrators to open/close volunteer applications with deadline functionality and automatic closure.

## Requirements
1. **Toggle Control**: Button to manually open/close volunteer applications
2. **Deadline Management**: Set deadline when opening applications
3. **Automatic Closure**: Auto-close applications when deadline passes
4. **Status Display**: Show current status and deadline to applicants
5. **Activity Logging**: Track all open/close events

## Technical Implementation

### 1. Database Schema
Create `application_settings` table:
```sql
CREATE TABLE application_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  is_open BOOLEAN DEFAULT false,
  deadline DATETIME NULL,
  opened_at DATETIME NULL,
  opened_by VARCHAR(255) NULL,
  closed_at DATETIME NULL,
  closed_by VARCHAR(255) NULL,
  auto_closed BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default row
INSERT INTO application_settings (is_open) VALUES (false);
```

### 2. Backend API Endpoints
Create `backend/routes/applicationSettingsRoutes.js`:
- **GET /api/application-settings** (public) - Get current status
- **PUT /api/application-settings** (admin-only) - Update settings
- **POST /api/application-settings/open** (admin-only) - Open applications with deadline
- **POST /api/application-settings/close** (admin-only) - Close applications

### 3. Backend Controller
Create `backend/controllers/applicationSettingsController.js`:
- `getSettings()` - Fetch current settings
- `openApplications(deadline, userId)` - Open with deadline
- `closeApplications(userId, autoClose)` - Close with reason tracking
- `checkDeadline()` - Validate if past deadline

### 4. Backend Repository
Create `backend/repositories/applicationSettingsRepository.js`:
- Database query methods for CRUD operations
- Transaction support for status changes

### 5. Backend Scheduler
Create `backend/jobs/applicationDeadlineScheduler.js`:
- Cron job running every minute
- Check if deadline has passed
- Auto-close if is_open=true and deadline < NOW()
- Log auto-close events

### 6. Backend Middleware Enhancement
Update `backend/routes/applicants.js`:
- Add status check before allowing new applications
- Return 403 if applications are closed
- Include deadline information in error response

### 7. Frontend Control Panel
Create `frontend/src/components/navigation/Application/ApplicationControlPanel.js`:
- Toggle switch for open/close
- DateTimePicker for deadline selection
- Current status display with visual indicators
- Confirmation dialogs for state changes
- Real-time deadline countdown

### 8. Frontend Service
Create `frontend/src/services/applicationSettingsService.js`:
```javascript
export const getApplicationSettings = async () => { ... };
export const openApplications = async (deadline) => { ... };
export const closeApplications = async () => { ... };
```

### 9. Frontend Integration
Update `frontend/src/components/navigation/Application/ManageApplications.js`:
- Import ApplicationControlPanel component
- Place at top of page above application list
- Pass necessary props and handlers

### 10. Signup Page Updates
Update volunteer signup page:
- Fetch application settings on mount
- Show "Applications Closed" message if closed
- Display deadline and countdown if open
- Disable form submission if closed

### 11. Activity Logging
Log events via `activityLogService`:
- APPLICATION_OPENED with deadline metadata
- APPLICATION_CLOSED with manual/auto flag
- DEADLINE_UPDATED with old/new values

## Implementation Phases

### Phase 1: Database & Backend Foundation
1. Create migration for application_settings table
2. Create repository layer
3. Create controller layer
4. Create API routes with auth middleware
5. Test endpoints with Postman/Thunder Client

### Phase 2: Scheduler & Auto-Close
1. Implement deadline scheduler cron job
2. Test auto-close functionality
3. Verify activity logging for auto-close
4. Add scheduler to server.js startup

### Phase 3: Frontend Control Panel
1. Create ApplicationControlPanel component
2. Implement toggle and deadline picker UI
3. Add confirmation dialogs
4. Integrate with ManageApplications page
5. Test state management and updates

### Phase 4: Signup Integration
1. Update signup page with status checks
2. Add deadline display and countdown
3. Handle closed state gracefully
4. Test user experience flow

### Phase 5: Testing & Polish
1. End-to-end testing
2. Timezone handling verification
3. Concurrent action testing
4. Error handling and edge cases
5. Activity log verification

## Technical Considerations

### Timezone Handling
- Store all dates in UTC in database
- Convert to user timezone for display
- Use `moment-timezone` or `date-fns-tz` for conversions

### Cron Schedule
- Run every minute: `'* * * * *'`
- Consider server load and reduce frequency if needed
- Use `node-cron` library

### State Management
- Use React state for control panel
- Fetch settings on mount
- Refresh after state changes
- Consider WebSocket for real-time updates across users

### Security
- Verify admin role in auth middleware
- Prevent race conditions with database transactions
- Validate deadline is in future
- Sanitize all inputs

### Edge Cases
- Handle deadline in the past
- Concurrent open/close actions
- Scheduler failure recovery
- Database connection issues
- Missing or corrupted settings row

## Files to Create
1. `backend/migrations/create_application_settings.sql`
2. `backend/repositories/applicationSettingsRepository.js`
3. `backend/controllers/applicationSettingsController.js`
4. `backend/routes/applicationSettingsRoutes.js`
5. `backend/jobs/applicationDeadlineScheduler.js`
6. `frontend/src/services/applicationSettingsService.js`
7. `frontend/src/components/navigation/Application/ApplicationControlPanel.js`

## Files to Modify
1. `backend/server.js` - Import and start scheduler
2. `backend/routes/applicants.js` - Add status check middleware
3. `frontend/src/components/navigation/Application/ManageApplications.js` - Add control panel
4. Volunteer signup page - Add status check and display

## Success Criteria
- ✅ Admin can toggle applications open/closed
- ✅ Admin can set deadline when opening
- ✅ Applications auto-close when deadline passes
- ✅ Applicants see status and deadline on signup page
- ✅ All events are logged in activity logs
- ✅ System works across timezones
- ✅ No race conditions or data corruption
- ✅ Graceful error handling throughout

## Next Steps
Choose implementation approach:
- **Option A**: Full implementation in order (all phases)
- **Option B**: Basic toggle first, then add deadline functionality
- **Option C**: Create UI proof-of-concept first, then backend
