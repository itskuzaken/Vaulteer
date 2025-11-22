# Vaulteer - Volunteer Management System

A full-stack web application for managing volunteers, staff, and applicants with role-based dashboards built with Next.js (frontend) and Node.js/Express (backend).

## Features

- **Role-based Authentication**: Admin, Staff, Volunteer, and Applicant roles
- **Dashboard Management**: Separate dashboards for different user roles with consistent UI design
- **User Management**: CRUD operations for users, applicants, and staff
- **Event Management**: Create, publish, archive, and manage events with streamlined UI
- **Gamification System**: Points, badges, streaks, and leaderboards to encourage engagement
- **Search & Filtering**: Advanced search and filter capabilities across users and events
- **Activity Logging**: Comprehensive audit trails for all system activities
- **Notifications**: Real-time notifications system with inbox and toast messages
- **Firebase Authentication**: Secure authentication with Google OAuth
- **MySQL Database**: Relational database for data persistence

## Tech Stack

### Frontend

- **Next.js 15.2.5** - React framework
- **React 19** - UI library
- **Tailwind CSS 4** - Styling
- **Firebase Client SDK** - Authentication
- **React Icons** - Icon library

### Backend

- **Node.js** - Runtime
- **Express.js** - Web framework
- **MySQL2** - Database driver
- **Firebase Admin SDK** - Server-side authentication
- **JWT** - Token-based authentication

### Database

- **MySQL** - Primary database
- **AWS RDS** - Cloud database hosting

### Additional Libraries

- **date-fns** - Date formatting and manipulation
- **react-icons** - Icon components
- **react-hot-toast** - Toast notifications
- **react-datepicker** - Date picker components

## Gamification System

Vaulteer includes a comprehensive gamification system to encourage volunteer participation:

### Features

- **Points System**: Earn points for various activities (event registration +10, attendance +40, hosting +25)
- **Badge System**: Unlock badges based on achievements (First Steps, Community Pillar, Weeklong Warrior)
- **Streaks**: Maintain weekly attendance streaks for bonus points
- **Leaderboards**: View top contributors and rankings
- **Real-time Updates**: Points and badges awarded instantly with notifications

### Reward Rules

- **Event Registration**: +10 points (waitlist +5)
- **Event Attendance**: +40 points
- **Event Hosting**: +25 points for published events
- **Late Cancellation**: -5 points penalty
- **Waitlist Promotion**: +8 points
- **Weekly Streaks**: +5 points per consecutive day
- **Badge Bonuses**: Additional points for unlocking achievements

### API Endpoints

- `GET /api/gamification/summary` - User gamification stats
- `GET /api/gamification/leaderboard` - Top contributors
- `POST /api/gamification/recalculate` - Admin recalculation (admin only)

- **AWS** - Cloud platform
- **Elastic Beanstalk** - Backend deployment
- **Amplify** - Frontend deployment (alternative)
- **S3 + CloudFront** - Static hosting (alternative)

## Prerequisites

- **Node.js 18+** installed locally
- **MySQL** database (local or AWS RDS)
- **Firebase Project** with Authentication enabled
- **AWS Account** (for cloud deployment)

## Quick Start

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd vaulteer
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Database Setup**
   ```bash
   mysql -u root -p < backend/schema.sql
   ```

3. **Environment Configuration**
   - Create `backend/.env` with database and Firebase settings
   - Create `frontend/.env.local` with API and Firebase config

4. **Run Development**
   ```bash
   npm run dev  # Starts frontend (3000) and backend (3001)
   ```

### Production Deployment

Vaulteer supports multiple deployment options:

- **Recommended**: AWS Elastic Beanstalk (backend) + Amplify (frontend)
- **Alternative**: EC2 + S3/CloudFront

See detailed deployment guides in the full documentation.

## API Overview

### Core Endpoints

- **Authentication**: `/api/auth/login`, `/api/auth/logout`, `/api/me`
- **Users**: `/api/users` (CRUD operations)
- **Events**: `/api/events` (full event management)
- **Gamification**: `/api/gamification/summary`, `/api/gamification/leaderboard`
- **Activity Logs**: `/api/logs`

### Key Features

- RESTful API with JWT authentication
- Role-based access control (Admin, Staff, Volunteer, Applicant)
- Real-time notifications and activity logging
- Comprehensive search and filtering

## Database Schema

Vaulteer uses MySQL with the following key tables:

- `users` - User accounts and roles
- `events` - Event management
- `event_participants` - Event registrations
- `user_gamification_stats` - Gamification data
- `achievements` - Badge definitions
- `activity_logs` - Audit trails

Run migrations with `node run-migration.js`.

## Recent Updates

### v1.1.0 - Dashboard UI Consistency & Gamification (November 2025)

- **UI Improvements**: Refactored ManageEvents component to match consistent design patterns across ViewAllStaff, ViewAllVolunteers, and ApplicationApproval dashboards
- **Event Management**: Enhanced event cards with hover effects, capacity indicators, and improved pagination
- **Gamification System**: 
  - Backend implementation complete with points, badges, and streaks
  - Database schema updated with gamification tables
  - Centralized activity logging for all gamification events
- **Activity Logging**: Refactored to use standardized logging helpers for consistent audit trails
- **Performance**: Optimized event list rendering and pagination

### v1.0.0 - Initial Release

- Complete volunteer management system with role-based dashboards
- Firebase authentication integration
- MySQL database with AWS RDS deployment
- Full CRUD operations for users, events, and applicants

## License

This project is licensed under the ISC License.

## Support

For support, please contact the development team or create an issue in the repository.</content>
<parameter name="filePath">c:\Users\Kuzaken\RedVault\README.md