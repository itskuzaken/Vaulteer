# Volunteer Signup Form - Backend Implementation

## Overview

Implemented a complete backend system to persist volunteer signup form submissions to the database with full transactional integrity.

## Implementation Details

### 1. Backend Repository Function

**File**: `backend/repositories/applicantRepository.js`

Added `createApplicantWithProfile()` function that:

- Creates or updates user record in `users` table
- Creates applicant record in `applicants` table with "pending" status
- Creates comprehensive profile in `user_profiles` table
- Creates work or student profile based on current status
- Links volunteer days, working/school days, roles, and trainings
- Uses database transactions for atomicity (all-or-nothing)
- Handles duplicate submissions gracefully
- Rolls back on any error

### 2. Backend API Endpoint

**File**: `backend/routes/applicants.js`

Added `POST /api/applicants` endpoint that:

- Accepts `{ user: {...}, form: {...} }` structure
- Validates required fields (user uid/name/email, form fields)
- Validates declaration commitment is "agree"
- Calls `createApplicantWithProfile()` repository function
- Returns 201 on success, appropriate error codes on failure
- Handles duplicate applications (409 Conflict)

### 3. Frontend Integration

**File**: `frontend/src/app/volunteer/signup/page.js`

Updated signup form to:

- Get current Firebase authenticated user
- Submit form data to POST `/api/applicants`
- Show loading state during submission
- Display error messages if submission fails
- Clear localStorage only on successful submission
- Disable buttons during submission

## Database Schema

The implementation creates records in the following tables:

1. **users** - Basic user authentication info
2. **applicants** - Application record with status
3. **user_profiles** - Complete volunteer profile data
4. **user_work_profile** - Work details (if Working Professional)
5. **user_working_days** - Work schedule days
6. **user_student_profile** - Student details (if Student)
7. **user_school_days** - School schedule days
8. **user_available_days** - Volunteer availability days
9. **user_profile_roles** - Volunteer role preferences
10. **user_profile_trainings** - Training certifications

## Data Flow

```
User fills form → Signs in with Google → Submits form
       ↓
Frontend validates → Calls POST /api/applicants with user + form data
       ↓
Backend validates → Creates transaction → Inserts all records
       ↓
Success: Returns 201 → Frontend shows success message
Failure: Returns error → Frontend displays error to user
```

## Testing Instructions

### Prerequisites

1. Backend server running on port 3001
2. MySQL database accessible
3. Firebase authentication configured

### Test Steps

1. **Start the backend server**:

   ```powershell
   cd backend
   node server.js
   ```

2. **Start the frontend**:

   ```powershell
   cd frontend
   npm run dev
   ```

3. **Test submission**:

   - Navigate to `/volunteer/signup`
   - Fill in all 8 steps of the form
   - Sign in with Google when prompted (Firebase)
   - Submit the form
   - Verify success message appears

4. **Verify database records**:

   ```sql
   -- Check user was created
   SELECT * FROM users WHERE email = 'test@example.com';

   -- Check applicant record
   SELECT a.*, s.status_name
   FROM applicants a
   JOIN application_statuses s ON a.status_id = s.status_id
   WHERE user_id = <user_id>;

   -- Check profile
   SELECT * FROM user_profiles WHERE user_id = <user_id>;

   -- Check related tables
   SELECT * FROM user_available_days WHERE profile_id = <profile_id>;
   SELECT * FROM user_profile_roles WHERE profile_id = <profile_id>;
   SELECT * FROM user_profile_trainings WHERE profile_id = <profile_id>;
   ```

5. **Test duplicate submission**:

   - Try submitting again with same user
   - Should receive 409 Conflict error
   - Error message should say "Application already submitted"

6. **Test validation**:
   - Try submitting without required fields
   - Should receive 400 Bad Request
   - Error should list missing fields

## Error Handling

The implementation handles:

- Missing required fields (400)
- Duplicate applications (409)
- Database errors (500)
- Authentication errors (400)
- Transaction rollback on any failure

## Security Considerations

- User must be authenticated via Firebase
- Backend validates all required fields
- SQL injection prevented via parameterized queries
- Transaction ensures data consistency
- No sensitive data exposed in error messages

## Future Enhancements

Potential improvements:

1. Add email confirmation after submission
2. Send notification to admins
3. Add file upload for documents
4. Implement application editing before approval
5. Add automated validation rules
6. Implement rate limiting

## Files Modified

1. `backend/repositories/applicantRepository.js` - Added createApplicantWithProfile()
2. `backend/routes/applicants.js` - Added POST endpoint
3. `frontend/src/app/volunteer/signup/page.js` - Updated submission logic

## Status

✅ Backend endpoint created
✅ Repository function implemented
✅ Frontend integration complete
✅ Error handling added
✅ Validation implemented
⏳ End-to-end testing pending
