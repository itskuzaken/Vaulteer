# Bagani Community Development Center Landing Page

A modern, mobile-first responsive landing page built with Next.js, React, and Tailwind CSS.

## 🎨 Features

- **Mobile-First Design**: Optimized for all screen sizes (320px to 2560px+)
- **8 Main Sections**: Hero, News & Updates, About, Programs, Events, Get Involved, Contact, Footer
- **Interactive Components**: Smooth scrolling navigation, search/filter functionality, event calendar
- **Bagani Brand Colors**: Custom color palette integrated with Tailwind CSS
- **Dark Mode Support**: Full dark mode compatibility
- **Accessible**: WCAG 2.1 AA compliant with proper ARIA labels
- **Performance Optimized**: Lazy loading, code splitting, optimized images

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies (if not already installed):
```bash
npm install
```

3. Add placeholder images to the `public` folder:
   - `/public/baganibcd_logo_handles.svg` - Main logo
   - `/public/news/*.jpg` - News article images
   - `/public/events/*.jpg` - Event images
   - `/public/placeholder-news.jpg` - Fallback news image

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000/bagani](http://localhost:3000/bagani) in your browser.

## 📁 Project Structure

```
frontend/src/components/landing/
├── BaganiLandingPage.js          # Main container component
├── sections/                      # Page sections
│   ├── NavigationBar.js          # Sticky navigation with mobile menu
│   ├── HeroSection.js            # Full-screen hero with news ticker
│   ├── NewsUpdatesSection.js     # News feed with search/filter
│   ├── AboutSection.js           # Mission, vision, features
│   ├── ProgramsSection.js        # Program cards grid
│   ├── EventsSection.js          # Events with calendar view
│   ├── GetInvolvedSection.js     # Volunteer/membership CTAs
│   ├── ContactSection.js         # Contact form and info
│   └── Footer.js                 # Footer with newsletter signup
└── ui/                           # Reusable UI components
    ├── NewsCard.js               # News article card
    ├── ProgramCard.js            # Program offering card
    ├── EventCard.js              # Event card with date badge
    ├── CategoryFilter.js         # Category filter chips
    └── SectionHeading.js         # Consistent section headings
```

## 🎨 Brand Colors

The Bagani brand colors are configured in `tailwind.config.js`:

- **Bagani Red**: `#8B0000` (Dark red/maroon)
  - Usage: `bg-bagani-red`, `text-bagani-red`, `border-bagani-red`
  - Variants: `bagani-red-light`, `bagani-red-dark`

- **Bagani Blue**: `#1E40AF` (Deep blue)
  - Usage: `bg-bagani-blue`, `text-bagani-blue`, `border-bagani-blue`
  - Variants: `bagani-blue-light`, `bagani-blue-dark`

- **Bagani Yellow**: `#F59E0B` (Amber/gold)
  - Usage: `bg-bagani-yellow`, `text-bagani-yellow`, `border-bagani-yellow`
  - Variants: `bagani-yellow-light`

- **Bagani Gray**: Neutral grays
  - Usage: `bg-bagani-gray`, `text-bagani-gray`
  - Variants: `bagani-gray-light`, `bagani-gray-dark`

## 📱 Responsive Breakpoints

- **Mobile**: 320px - 639px (base styles)
- **Small (sm)**: 640px+ (tablets portrait)
- **Medium (md)**: 768px+ (tablets landscape)
- **Large (lg)**: 1024px+ (small desktops)
- **Extra Large (xl)**: 1280px+ (desktops)
- **2XL**: 1536px+ (large desktops)

## 🔧 Customization

### Adding News Items

Edit the `newsData` array in `NewsUpdatesSection.js`:

```javascript
const newsData = [
  {
    id: 1,
    title: 'Your News Title',
    excerpt: 'Brief description...',
    category: 'Announcements', // or Events, Programs, Community
    date: '2024-02-01',
    readTime: 4,
    image: '/news/your-image.jpg',
    slug: 'your-news-slug',
    featured: false, // Set to true for featured news
  },
  // ... more news items
];
```

### Adding Programs

Edit the `programs` array in `ProgramsSection.js`:

```javascript
const programs = [
  {
    icon: <IoIconName className="w-full h-full" />,
    title: 'Program Name',
    description: 'Program description...',
    features: [
      'Feature 1',
      'Feature 2',
      // ... more features
    ],
    link: '/programs/program-slug',
    color: 'bagani-red', // or bagani-blue, bagani-yellow
  },
  // ... more programs
];
```

### Adding Events

Edit the `events` array in `EventsSection.js`:

```javascript
const events = [
  {
    id: 1,
    title: 'Event Name',
    date: '2024-02-10',
    time: '3:00 PM - 5:00 PM',
    location: 'Event Location',
    description: 'Event description...',
    attendees: 45,
    image: '/events/event-image.jpg',
    category: 'Community Event',
    rsvpLink: '/rsvp/event-slug'
  },
  // ... more events
];
```

## 🌐 API Integration

Currently, all data is hardcoded in the components. To integrate with an API:

1. Create API endpoints for news, programs, and events
2. Use `fetch` or a library like `axios` in `useEffect` hooks
3. Replace static data arrays with API responses
4. Add loading states and error handling

Example for NewsUpdatesSection:

```javascript
const [newsData, setNewsData] = useState([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  fetch('/api/news')
    .then(res => res.json())
    .then(data => {
      setNewsData(data);
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Error fetching news:', error);
      setIsLoading(false);
    });
}, []);
```

## 📝 Contact Form

The contact form in `ContactSection.js` currently simulates submission. To connect it to a backend:

1. Update the `handleSubmit` function:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } else {
      setSubmitStatus('error');
    }
  } catch (error) {
    setSubmitStatus('error');
  } finally {
    setIsSubmitting(false);
  }
};
```

## 🖼️ Images

Place the following images in the `public` folder:

### Required:
- `/baganibcd_logo_handles.svg` - Main logo (SVG recommended)

### Optional (will use placeholders if missing):
- `/news/*.jpg` - News article images
- `/events/*.jpg` - Event images
- `/placeholder-news.jpg` - Fallback image

Recommended image sizes:
- News images: 800x600px
- Event images: 800x600px
- Logo: SVG or 200x200px PNG

## 🎯 Next Steps

1. ✅ Add actual logo and images
2. ✅ Connect to backend API for dynamic content
3. ✅ Implement actual form submission
4. ✅ Add Google Maps integration to ContactSection
5. ✅ Set up analytics tracking
6. ✅ Add proper SEO meta tags
7. ✅ Test across different devices and browsers
8. ✅ Optimize images with next/image
9. ✅ Add error boundaries
10. ✅ Implement loading skeletons

## 🐛 Troubleshooting

### Styles not applying
- Ensure Tailwind CSS is properly configured in `postcss.config.mjs`
- Check that `tailwind.config.js` content paths include all component files
- Run `npm run dev` to restart the development server

### Components not rendering
- Verify all imports are correct
- Check browser console for JavaScript errors
- Ensure all required props are passed to components

### Images not loading
- Confirm images exist in the `public` folder
- Check file paths and extensions
- Use Next.js Image component for optimization

## 📄 License

Copyright © 2024 Bagani Community Development Center. All rights reserved.

## 🤝 Contributing

For questions or contributions, please contact the development team.
