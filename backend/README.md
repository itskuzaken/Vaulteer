# Vaulteer Backend

The backend API for the Vaulteer volunteer management system, built with Node.js and Express.js.

## Features

- **RESTful API**: Complete REST API for volunteer management
- **Role-based Access Control**: JWT-based authentication with role permissions
- **Database Integration**: MySQL database with connection pooling
- **Firebase Authentication**: Server-side Firebase token verification
- **Activity Logging**: Comprehensive activity tracking
- **Error Handling**: Centralized error handling middleware
- **CORS Support**: Configurable CORS for frontend integration

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js 5.1.0** - Web application framework
- **MySQL2** - MySQL database driver
- **Firebase Admin SDK** - Server-side authentication
- **JWT** - JSON Web Tokens for session management
- **Dotenv** - Environment variable management

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL database (local or AWS RDS)
- Firebase project with service account key

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Create `.env` file in the backend directory:

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

### Database Setup

1. Create MySQL database:

```sql
CREATE DATABASE vaulteer_db;
```

2. Run schema:

```bash
mysql -u root -p vaulteer_db < schema.sql
```

3. (Optional) Run migrations:

```bash
node run-migration.js
```

### Firebase Setup

1. Create Firebase project
2. Enable Authentication with Google provider
3. Create service account and download key
4. Place `firebase-service-account.json` in backend directory

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on port 3001 by default.

## API Endpoints

### Authentication

- `GET /api/health` - Health check
- `GET /api` - API information

### User Management

- `GET /api/me` - Current user profile
- `GET /api/users` - List all users (admin/staff)
- `POST /api/users` - Create user (admin)
- `PUT /api/users/:id` - Update user (admin/staff)
- `DELETE /api/users/:id` - Delete user (admin)

### Applicants

- `GET /api/applicants` - List applicants
- `PUT /api/applicants/:id/status` - Update application status

### Search

- `GET /api/users/search` - Search users with filters

### Activity Logs

- `GET /api/logs` - Get activity logs
- `POST /api/logs` - Create activity log

### Notifications

- `GET /api/notifications` - Get notifications
- `POST /api/notifications` - Create notification

### Profile

- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

## Project Structure

```
backend/
├── config/               # Configuration files
│   └── env.js           # Environment variable validation
├── controllers/         # Route controllers (business logic)
├── db/                  # Database configuration
│   └── pool.js         # MySQL connection pool
├── middleware/          # Express middleware
│   ├── authenticateToken.js    # JWT authentication
│   ├── corsConfig.js          # CORS configuration
│   └── errorHandler.js        # Error handling
├── repositories/        # Data access layer
│   ├── applicantRepository.js
│   └── userRepository.js
├── routes/              # API route definitions
│   ├── applicants.js
│   ├── users.js
│   ├── searchRoutes.js
│   └── meRoute.js
├── services/            # Business logic services
├── utils/               # Utility functions
├── migrations/          # Database migrations
├── schema/              # Database schema files
├── server.js            # Main application entry point
├── package.json
└── .env                 # Environment variables (gitignored)
```

## Authentication Flow

1. **Client Login**: Frontend authenticates with Firebase
2. **Token Exchange**: Client sends Firebase ID token to backend
3. **Token Verification**: Backend verifies token with Firebase Admin SDK
4. **User Lookup**: Backend queries user in database
5. **JWT Issuance**: Backend issues JWT for session management
6. **Role Assignment**: JWT contains user role for authorization

## Database Schema

### Core Tables

- `roles` - User roles (admin, staff, volunteer, applicant)
- `users` - User accounts with Firebase UID
- `applicants` - Volunteer applications

### Key Relationships

- Users belong to roles
- Applicants are linked to users
- Activity logs track user actions

## Middleware

### Authentication Middleware

- Verifies JWT tokens
- Extracts user information
- Enforces role-based access

### CORS Middleware

- Configures allowed origins
- Handles preflight requests
- Supports local development

### Error Handler

- Catches unhandled errors
- Formats error responses
- Logs errors appropriately

## Deployment

### AWS Elastic Beanstalk

1. Initialize EB application:

```bash
eb init vaulteer-backend --platform node.js --region us-east-1
```

2. Create environment:

```bash
eb create production
```

3. Set environment variables:

```bash
eb setenv NODE_ENV=production \
  DB_HOST=your-rds-endpoint.rds.amazonaws.com \
  DB_USER=admin \
  DB_PASS=secure_password \
  DB_NAME=vaulteer_db \
  FRONTEND_URL=https://your-frontend-domain.com
```

4. Deploy:

```bash
eb deploy
```

### Environment Variables for Production

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

## Security Considerations

1. **Token Validation**: All requests validate JWT tokens
2. **Role-based Access**: Endpoints check user permissions
3. **Input Validation**: Sanitize all user inputs
4. **SQL Injection Prevention**: Use parameterized queries
5. **CORS Configuration**: Restrict origins in production
6. **Environment Variables**: Never commit secrets

## Monitoring

### Health Checks

- `GET /api/health` returns application status
- Includes environment and timestamp
- Can be used for load balancer health checks

### Logging

- Console logging for development
- Structured logging for production
- Activity logs stored in database

## Development Guidelines

### Code Style

- Use async/await for asynchronous operations
- Follow Express.js best practices
- Implement proper error handling
- Write descriptive commit messages

### API Design

- RESTful endpoint naming
- Consistent response formats
- Proper HTTP status codes
- Comprehensive error messages

### Database Operations

- Use connection pooling
- Implement transactions for complex operations
- Handle connection errors gracefully
- Validate data before insertion

## Testing

```bash
npm test
```

## Contributing

1. Follow established patterns
2. Add proper error handling
3. Update API documentation
4. Test endpoints thoroughly

## Related Documentation

- [Root README](../README.md) - Full project documentation
- [Frontend README](../frontend/README.md) - Frontend documentation
