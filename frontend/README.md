# Frontend - DFW Christmas Lights Finder

React + TypeScript frontend application built with Vite.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test:run

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your AWS Cognito and API details

## Development

The app runs on http://localhost:5173 by default.

## Project Structure

```
src/
├── assets/         # Static assets (images, styles)
├── components/     # Reusable React components
├── contexts/       # React contexts (Auth, etc.)
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── services/       # API services
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

## Features Implemented

- ✅ Authentication (Cognito integration)
- ✅ Routing (React Router)
- ✅ API service layer
- ✅ TypeScript types
- ✅ Tailwind CSS styling
- ✅ Map integration (Leaflet) with custom markers
- ✅ Location popups with details
- ✅ "Near me" geolocation
- ✅ Loading states
- ✅ Real API data fetching
- ✅ Location detail page with Get Directions
- ✅ Submit location suggestions with address autocomplete
- ✅ Admin dashboard (approve/reject suggestions)
- ✅ Route planner (up to 20 stops, optimize, reorder)
- ✅ PDF route generation with QR codes
- ✅ Multi-app navigation (Google Maps, Apple Maps, Waze)
- ✅ User feedback system (likes, favorites, reports)
- ✅ Photo uploads with HEIC/HEIF support
- ✅ Photo gallery with carousel and lightbox
- ✅ User profiles with submission history
- ✅ Location popups with full details (photos, tags, actions)
- ✅ Route sharing (save, share, discover community routes)
- ✅ Route detail page with map and numbered stops
- ✅ Route leaderboard (top routes and route creators)
- ✅ Like and save routes
- ✅ Routes tab on profile page

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router v6
- TanStack Query (React Query)
- Axios
- AWS Cognito
- Leaflet (maps)
