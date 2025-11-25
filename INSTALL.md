# Local Installation Guide

This guide will help you set up the Vaulteer project locally on your machine.

## Prerequisites

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **MySQL** or **MariaDB** database server
- **Git** for cloning the repository

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/itskuzaken/Vaulteer.git
cd Vaulteer
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

### 3. Database Setup

1. Create a new MySQL database named `vaulteer_db`
2. Import the initial schema:
   ```bash
   mysql -u your_username -p vaulteer_db < schema.sql
   ```
3. Run database migrations:
   ```bash
   node run-migration.js
   ```

### 4. Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=vaulteer_db

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Firebase Configuration (if using Firebase services)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=your_client_cert_url

# Other configurations
CRON_TIMEZONE=Asia/Manila
INACTIVE_AFTER_DAYS=14
```

**Security Note:** Never commit the `.env` file to version control. It's already included in `.gitignore`.

### 5. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

### 6. Firebase Configuration (Optional)

If you're using Firebase services, place your `firebase-service-account.json` file in the `backend` directory. This file should contain your Firebase service account credentials.

**Security Note:** This file is sensitive and should never be committed to version control. It's already included in `.gitignore`.

## Running the Application

### Development Mode

1. Start the backend server:

   ```bash
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

### Production Mode

For production deployment, refer to the deployment documentation in the `docs/` folder.

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the PORT in your `.env` file or stop other processes using that port.

2. **Database connection errors**: Ensure your MySQL server is running and the credentials in `.env` are correct.

3. **Module not found errors**: Make sure you've run `npm install` in both backend and frontend directories.

4. **Firebase errors**: Verify your Firebase service account credentials are correct and the file is in the right location.

### Getting Help

If you encounter issues not covered here, please check:

- The main README.md for project overview
- GitHub Issues for known problems
- The docs/ folder for additional documentation

## Next Steps

Once your local installation is complete, you can:

- Explore the application features
- Run the test suites
- Contribute to the codebase
- Set up additional development tools (ESLint, Prettier, etc.)

Happy coding! 🚀
