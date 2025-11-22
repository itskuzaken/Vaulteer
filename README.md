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

Before deploying to AWS, ensure you have:

1. **AWS Account** with appropriate permissions
2. **Firebase Project** with Authentication enabled
3. **Domain name** (optional, for custom domain)
4. **Node.js 18+** installed locally for development

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd vaulteer
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Database Setup

```bash
# Create MySQL database locally or use AWS RDS
# Run the schema file
mysql -u root -p < backend/schema.sql
```

### 4. Environment Configuration

#### Backend (.env)

Create `backend/.env`:

```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=vaulteer_db
DB_CONN_LIMIT=10
FRONTEND_URL=http://localhost:3000
FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
```

#### Frontend (.env.local)

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:3001/api
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Firebase Setup

1. Download service account key from Firebase Console
2. Place `firebase-service-account.json` in `backend/` directory

### 6. Run Development Servers

```bash
# From root directory
npm run dev
```

This starts both frontend (port 3000) and backend (port 3001).

## AWS Deployment

### Option 1: Elastic Beanstalk + Amplify (Recommended)

#### 1. Database Setup (AWS RDS)

```bash
# Create RDS MySQL instance
aws rds create-db-instance \
  --db-instance-identifier vaulteer-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password your_password \
  --allocated-storage 20 \
  --vpc-security-group-ids your_sg_id \
  --db-subnet-group-name your_subnet_group
```

#### 2. Backend Deployment (Elastic Beanstalk)

```bash
cd backend

# Initialize EB application
eb init vaulteer-backend --platform node.js --region us-east-1

# Create environment
eb create vaulteer-backend-env

# Set environment variables
eb setenv NODE_ENV=production \
  DB_HOST=your-rds-endpoint.rds.amazonaws.com \
  DB_USER=admin \
  DB_PASS=your_password \
  DB_NAME=vaulteer_db \
  FRONTEND_URL=https://your-frontend-domain.com \
  FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json

# Deploy
eb deploy
```

#### 3. Frontend Deployment (AWS Amplify)

```bash
cd frontend

# Initialize Amplify app
amplify init

# Add hosting
amplify add hosting
amplify publish

# Set environment variables in Amplify Console:
# NEXT_PUBLIC_API_BASE=https://your-backend-url.elasticbeanstalk.com/api
# NEXT_PUBLIC_FIREBASE_*=your_firebase_config
```

### Option 2: EC2 + S3/CloudFront

#### Backend on EC2

```bash
# Launch EC2 instance (Amazon Linux 2)
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-groups your-sg

# SSH into instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install PM2 for process management
npm install -g pm2

# Clone and setup application
git clone your-repo-url
cd vaulteer/backend
npm install --production

# Configure environment
cp .env.example .env
# Edit .env with production values

# Start application
pm2 start server.js --name vaulteer-backend
pm2 startup
pm2 save
```

#### Frontend on S3 + CloudFront

```bash
cd frontend

# Build the application
npm run build

# Create S3 bucket
aws s3 mb s3://vaulteer-frontend --region us-east-1

# Upload build files
aws s3 sync out/ s3://vaulteer-frontend --delete

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name vaulteer-frontend.s3.amazonaws.com \
  --default-root-object index.html
```

### Environment Variables for Production

#### Backend Environment Variables

```env
NODE_ENV=production
PORT=8080
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASS=secure_password
DB_NAME=vaulteer_db
DB_CONN_LIMIT=20
FRONTEND_URL=https://your-frontend-domain.com
FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
```

#### Frontend Environment Variables (Amplify/S3)

```env
NEXT_PUBLIC_API_BASE=https://your-backend-url/api
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Database Migration

To run database migrations:

```bash
cd backend
node run-migration.js
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/me` - Get current user info

### User Management

- `GET /api/users` - List users (admin/staff only)
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Applicants

- `GET /api/applicants` - List applicants
- `PUT /api/applicants/:id/status` - Update application status

### Search

- `GET /api/users/search` - Search users with filters

### Activity Logs

- `GET /api/logs` - Get activity logs
- `POST /api/logs` - Create activity log

### Gamification

- `GET /api/gamification/summary` - Get user gamification stats
- `GET /api/gamification/leaderboard` - Get leaderboard rankings
- `POST /api/gamification/recalculate` - Recalculate user stats (admin only)

### Events

- `GET /api/events` - List events with filtering and pagination
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/publish` - Publish event
- `POST /api/events/:id/archive` - Archive event
- `POST /api/events/:id/join` - Join event
- `POST /api/events/:id/leave` - Leave event

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **Database Security**: Use strong passwords and limit database access
3. **Firebase Security**: Configure security rules in Firebase Console
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Configure CORS properly for your domains
6. **Rate Limiting**: Implement rate limiting for API endpoints

## Monitoring & Maintenance

### Health Checks

- `GET /api/health` - Application health status

### Logs

- Application logs are available in AWS CloudWatch (Elastic Beanstalk)
- Database logs can be monitored via RDS console

### Backups

- Enable automated backups in RDS
- Regular database snapshots for disaster recovery

## Troubleshooting

### Common Issues

1. **Database Connection Issues**

   - Verify RDS security group allows connections from EC2/Elastic Beanstalk
   - Check database credentials in environment variables

2. **Firebase Authentication Issues**

   - Ensure service account key is properly configured
   - Verify Firebase project settings

3. **CORS Errors**

   - Update `FRONTEND_URL` in backend environment
   - Configure CORS middleware for production domains

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed

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
