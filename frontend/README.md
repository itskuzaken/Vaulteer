# Vaulteer Frontend

The frontend application for the Vaulteer volunteer management system, built with Next.js 15.

## Features

- **Role-based Dashboards**: Separate interfaces for Admin, Staff, Volunteer, and Applicant roles
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Real-time Updates**: Live data synchronization
- **Search & Filtering**: Advanced user search and filtering capabilities
- **Modal Management**: Comprehensive modal system for user interactions
- **Firebase Authentication**: Secure authentication with Google OAuth

## Tech Stack

- **Next.js 15.2.5** - React framework with App Router
- **React 19** - UI library
- **Tailwind CSS 4** - Utility-first CSS framework
- **Firebase Client SDK** - Authentication and real-time database
- **React Icons** - Icon components
- **IonIcons** - Additional icon library

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (see root README)

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

Create `.env.local` in the frontend directory:

```env
NEXT_PUBLIC_API_BASE=http://localhost:3001/api
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Role-based dashboard pages
│   ├── volunteer/         # Volunteer-specific pages
│   ├── layout.js          # Root layout
│   ├── page.js            # Home page
│   └── globals.css        # Global styles
├── components/            # Reusable React components
│   ├── card/             # User cards
│   ├── filter/           # Filter components
│   ├── layout/           # Layout components
│   ├── modals/           # Modal dialogs
│   ├── navigation/       # Navigation components
│   ├── search/           # Search components
│   ├── sidebar/          # Sidebar components
│   └── ui/               # UI primitives
├── config/               # Configuration files
├── hooks/                # Custom React hooks
├── services/             # API service functions
├── styles/               # Additional stylesheets
└── utils/                # Utility functions
```

## Key Components

### Dashboards

- **AdminDashboard**: Full system management
- **StaffDashboard**: Limited management capabilities
- **VolunteerDashboard**: Personal volunteer tools
- **ApplicantDashboard**: Application status tracking

### Sidebars

- **AdminSidebar**: Complete navigation menu
- **StaffSidebar**: Restricted navigation
- **VolunteerSidebar**: Volunteer-specific options

### Services

- **authService**: Authentication handling
- **userService**: User CRUD operations
- **applicantService**: Applicant management
- **searchService**: Search functionality

## Styling

The application uses Tailwind CSS with custom design tokens defined in `globals.css`. Key styling patterns:

- **Color Tokens**: Role-based color schemes
- **Responsive Breakpoints**: Mobile-first approach
- **Component Variants**: Consistent component styling
- **Dark Mode Support**: Built-in theme switching

## Authentication Flow

1. **Login**: Firebase Google OAuth
2. **Role Detection**: Automatic role assignment
3. **Dashboard Redirect**: Role-based routing
4. **Token Management**: JWT token handling

## API Integration

The frontend communicates with the backend API through service functions. Key endpoints:

- `/api/me` - Current user information
- `/api/users` - User management
- `/api/applicants` - Applicant operations
- `/api/search` - Search functionality

## Deployment

### AWS Amplify (Recommended)

1. Connect repository to AWS Amplify
2. Set build settings:
   - Build command: `npm run build`
   - Build output: `out`
   - Environment variables: Set all `NEXT_PUBLIC_*` variables

### Manual S3 Deployment

```bash
npm run build
aws s3 sync out/ s3://your-bucket-name --delete
```

## Development Guidelines

### Code Style

- Use ESLint configuration
- Follow React best practices
- Use TypeScript for new components (planned)

### Component Patterns

- Functional components with hooks
- Custom hooks for shared logic
- Service layer for API calls
- Consistent prop interfaces

### State Management

- React hooks for local state
- Context API for global state
- Firebase for real-time data

## Testing

```bash
npm run lint
```

## Contributing

1. Follow the established code patterns
2. Test components thoroughly
3. Update documentation as needed
4. Ensure responsive design works

## Related Documentation

- [Root README](../README.md) - Full project documentation
- [Backend README](../backend/README.md) - Backend API documentation
