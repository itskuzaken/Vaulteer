# User Profile Module

A modular, fully-featured user profile management system for the RedVault application.

## 📁 Folder Structure

```
components/UserProfile/
├── index.js                   # Main profile component (orchestrates all sections)
├── ProfileAPI.js              # All API calls and data fetching
├── ProfileUtils.js            # Utility functions (validation, formatting, etc.)
├── ProfileHeader.js           # Profile header with edit/save/cancel buttons
├── PersonalDetails.js         # Personal information section
├── WorkProfile.js             # Work-related profile data
├── StudentProfile.js          # Student-related profile data
├── Trainings.js               # Training & certifications management
├── AvailableDays.js           # Availability schedule management
├── ActivitySummary.js         # User activity statistics
└── Achievements.js            # User achievements display
```

## 🎯 Features

### ✅ Editable Sections (when Edit Mode is ON)

- **Personal Details** - Name, birthdate, gender, contact, city, social media
- **Work Profile** - Position, company, industry, shift, skills, working days
- **Student Profile** - School, course, graduation year, skills, school days
- **Trainings** - Checkbox selection of completed trainings
- **Available Days** - Day-of-week availability selection

### 🔒 Read-Only Fields (always)

- Full Name (from user account)
- Email Address (from user account)
- Account Status
- Role
- Member Since Date
- Activity Summary
- Achievements

## 🚀 Usage

### Import the Component

```jsx
import UserProfile from "@/components/UserProfile";

export default function ProfilePage() {
  return <UserProfile />;
}
```

### Edit Mode Flow

1. User clicks **Edit Profile** button
2. All editable sections show input fields
3. User makes changes
4. Click **Save** to submit all changes
5. Click **Cancel** to discard changes and revert

## 🔧 Component Architecture

### Main Component (`index.js`)

- Manages global state (edit mode, loading, errors)
- Handles data fetching and updates
- Coordinates all child components
- Implements save/cancel logic

### Child Components

Each section is a self-contained component that:

- Receives data as props
- Displays read-only view by default
- Shows edit mode when `isEditing` is true
- Calls `onChange` callback when data changes

### API Layer (`ProfileAPI.js`)

Centralized API functions:

- `getCurrentUserId()` - Get authenticated user ID
- `fetchComprehensiveProfile()` - Get all profile data
- `fetchActivitySummary()` - Get activity stats
- `updatePersonalProfile()` - Update personal details
- `updateWorkProfile()` - Update work data
- `updateStudentProfile()` - Update student data
- `updateTrainings()` - Update training selections
- `updateAvailableDays()` - Update availability
- `updateWorkingDays()` - Update working days
- `updateSchoolDays()` - Update school days

### Utility Layer (`ProfileUtils.js`)

Helper functions:

- `isValidEmail()` - Email validation
- `isValidPhone()` - Phone number validation
- `formatDate()` - Date formatting for display
- `formatDateForInput()` - Date formatting for inputs
- `calculateProfileCompletion()` - Completion percentage
- `removeDuplicates()` - Remove duplicate entries
- `validateRequiredFields()` - Required field validation

## 📊 Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
Update Local Edit State
    ↓
User Clicks Save
    ↓
Validate All Data
    ↓
Call API Functions (parallel)
    ↓
Reload Fresh Data
    ↓
Update UI & Show Success
```

## ✨ Key Benefits

### 1. **Modularity**

- Each section is independent
- Easy to add/remove sections
- Reusable components

### 2. **Maintainability**

- Clear separation of concerns
- Centralized API calls
- Shared utility functions

### 3. **User Experience**

- Single edit mode for entire profile
- Validation before save
- Cancel to discard changes
- Success/error feedback

### 4. **Performance**

- Parallel API calls on save
- Optimistic UI updates
- Efficient re-renders

## 🎨 Styling

All components use Tailwind CSS with:

- Dark mode support
- Responsive design (mobile-first)
- Consistent color scheme:
  - Red: Primary actions
  - Green: Work profile
  - Blue: Student profile
  - Purple: Trainings
  - Orange: Availability
  - Yellow: Achievements

## 🔐 Security

- All API calls require Firebase authentication
- Token-based authorization
- User can only edit their own profile
- Backend validates all updates

## 🧪 Testing Checklist

- [ ] Profile loads correctly
- [ ] Edit mode activates all sections
- [ ] Personal details can be edited
- [ ] Work profile updates successfully
- [ ] Student profile updates successfully
- [ ] Trainings can be selected/deselected
- [ ] Available days can be toggled
- [ ] Working days can be toggled
- [ ] School days can be toggled
- [ ] Save validates required fields
- [ ] Cancel reverts all changes
- [ ] Success message shows after save
- [ ] Error handling works
- [ ] Dark mode displays correctly
- [ ] Mobile responsive layout works

## 📝 Future Enhancements

- [ ] Profile picture upload
- [ ] Drag-and-drop training reordering
- [ ] Rich text editor for skills
- [ ] Achievement claiming system
- [ ] Profile visibility settings
- [ ] Export profile as PDF
