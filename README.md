# Vaulteer

A full-stack web application built with Node.js/Express backend and Next.js frontend, featuring user management capabilities.

## 🏗️ Project Structure

```
vaulteer/
├── backend/                 # Node.js Express API server
│   ├── server.js           # Main server entry point
│   ├── controllers/        # API controllers
│   ├── lib/               # Database utilities
│   ├── routes/            # API routes
│   └── package.json       # Backend dependencies
├── frontend/              # Next.js React application  
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   └── services/     # API service layers
│   └── package.json      # Frontend dependencies
└── package.json          # Root package with concurrent scripts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MySQL** database (configured via .env)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/itskuzaken/Vaulteer.git
   cd Vaulteer
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   
   Create `.env` file in the `backend/` directory:
   ```env
   PORT=3306
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=vaulteer_db
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start both:
   - **Backend**: http://localhost:3306
   - **Frontend**: http://localhost:3000

## 📱 Available Scripts

### Root Directory

- `npm run dev` - Start both backend and frontend in development mode
- `npm start` - Start both services in production mode
- `npm run install:all` - Install dependencies for all projects
- `npm run backend:dev` - Start backend only (development)
- `npm run backend:start` - Start backend only (production)
- `npm run frontend:dev` - Start frontend only (development)
- `npm run frontend:start` - Start frontend only (production)

### Backend Directory (`cd backend`)

- `npm run dev` - Start with nodemon (auto-restart on changes)
- `npm start` - Start production server

### Frontend Directory (`cd frontend`)

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MySQL2** - Database driver
- **CORS** - Cross-origin requests
- **dotenv** - Environment variables
- **nodemon** - Development auto-restart

### Frontend
- **Next.js 15.4.6** - React framework with App Router
- **React 19.1.0** - UI library
- **Tailwind CSS 4** - Utility-first CSS framework
- **ESLint** - Code linting

## 🚀 Deployment

### Development Deployment

1. **Local Development**
   ```bash
   npm run dev
   ```
   - Backend: http://localhost:3306
   - Frontend: http://localhost:3000

### Production Deployment

#### Option 1: Traditional Hosting

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start production servers**
   ```bash
   # From root directory
   npm start
   ```

#### Option 2: Railway Deployment

1. **Deploy backend to Railway**
   ```bash
   cd backend
   # Connect to Railway and deploy
   railway login
   railway init
   railway up
   ```

2. **Deploy frontend to Vercel/Netlify**
   ```bash
   cd frontend
   # Follow platform-specific deployment guides
   ```

#### Option 3: Docker Deployment

Create `docker-compose.yml` in root:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3306:3306"
    environment:
      - NODE_ENV=production
    
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

Run with:
```bash
docker-compose up --build
```

### Environment Configuration

#### Production Environment Variables

**Backend (.env)**:
```env
NODE_ENV=production
PORT=3306
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
DB_NAME=your_production_db_name
FRONTEND_URL=https://your-frontend-domain.com
```

**Frontend**:
- Configure `NEXT_PUBLIC_API_URL` to point to production backend
- Set up build environment on hosting platform

## 🗃️ Database Setup

1. **Create MySQL database**
   ```sql
   CREATE DATABASE vaulteer_db;
   ```

2. **Run migrations** (if available)
   ```bash
   cd backend
   npm run migrate
   ```

## 🔧 Development Notes

- **Hot Reload**: Both frontend and backend support hot reload in development
- **API Endpoints**: Backend API available at `/api/*` routes
- **CORS**: Configured to allow frontend origin in development
- **Build**: Frontend requires `next build` before production start

## 📝 API Documentation

### Users API

- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Author

**itskuzaken** - [GitHub Profile](https://github.com/itskuzaken)

---

**🚀 Happy Coding!**