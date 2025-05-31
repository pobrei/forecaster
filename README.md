# Forecaster

> A premium weather planning application for outdoor activities

A premium, beautifully designed Next.js application for planning routes with detailed weather forecasts. Upload GPX files, analyze weather conditions along your path, and make informed decisions for your outdoor activities with a delightful user experience.

## Features

- **GPX File Parsing**: Upload and parse GPX files to extract route data including coordinates, distance, and elevation profiles.
- **Dynamic Weather Forecasting**: Get detailed weather forecasts at custom intervals along your route.
- **Interactive Map**: Visualize your route with weather markers on an interactive OpenLayers map.
- **Weather Summary Dashboard**: Comprehensive statistics showing temperature, wind, precipitation, and atmospheric data ranges.
- **Interactive Cross-Component Selection**: Click weather points in timeline, charts, or map to center and explore data.
- **Detailed Data Visualization**: View weather patterns through interactive charts (temperature, precipitation, wind, humidity, pressure, elevation).
- **Timeline & Alerts**: Scrollable timeline of forecast points and important weather alerts (high wind, extreme heat, freezing temperatures, heavy rain).
- **PDF Export**: Generate comprehensive PDF reports of your route with weather data.
- **Premium UI/UX Design**: Clean visual hierarchy, consistent spacing, and thoughtful animations for a delightful user experience.
- **Mobile-Responsive Design**: Fully responsive layout that works on all devices.
- **Dark Mode**: Toggle between light and dark themes.
- **Security**: Rate limiting, input validation, and secure API integrations.
- **Caching**: Efficient caching system to minimize API calls and improve performance.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4 and Shadcn UI
- **Maps**: OpenLayers with custom styled controls
- **Charts**: Chart.js with custom theming
- **PDF Generation**: jsPDF and html2canvas
- **Database**: MongoDB for weather data caching
- **APIs**: OpenWeather API
- **TypeScript**: Full type safety throughout the application

## Project Status

✅ **Phase 1 Complete: Project Setup & Foundation**
- ✅ Next.js project initialized with TypeScript
- ✅ Tailwind CSS and Shadcn UI configured
- ✅ Project structure created with modular approach
- ✅ Environment configuration setup
- ✅ Basic layout and navigation created
- ✅ TypeScript types defined
- ✅ Utility functions and constants created
- ✅ Health check API endpoint implemented
- ✅ Development server running successfully

✅ **Phase 2 Complete: Core Backend Services**
- ✅ MongoDB connection and database models implemented
- ✅ Weather data caching system with automatic expiration
- ✅ OpenWeather API integration with rate limiting
- ✅ GPX file parser with validation and route processing
- ✅ API endpoints for file upload and weather forecasting
- ✅ Weather alert generation based on thresholds
- ✅ Route sampling and distance calculations
- ✅ Enhanced health check testing all services
- ✅ Error handling and comprehensive logging

✅ **Phase 3 Complete: Frontend Components & Features**
- ✅ File upload component with drag & drop functionality
- ✅ Settings panel with configurable forecast parameters
- ✅ Interactive OpenLayers map with route visualization
- ✅ Weather data charts with Chart.js (temperature, precipitation, wind, atmospheric)
- ✅ Scrollable weather timeline with detailed forecast points
- ✅ Weather alerts display and severity indicators
- ✅ Responsive design with mobile-friendly layout
- ✅ Real-time state management and API integration
- ✅ Toast notifications for user feedback
- ✅ Comprehensive error handling and loading states

✅ **Phase 4 Complete: Advanced Features**
- ✅ PDF export functionality with comprehensive weather reports
- ✅ Enhanced forecast-level caching system with TTL and statistics
- ✅ Performance optimizations with React.memo and useMemo hooks
- ✅ Settings import/export with local storage management
- ✅ Advanced performance monitoring and debugging hooks
- ✅ Optimized chart data processing for large datasets
- ✅ Intelligent cache invalidation and preloading strategies
- ✅ JSON data export for external application integration
- ✅ Enhanced health check with cache statistics
- ✅ Auto-save settings functionality

✅ **Phase 5 Complete: UI/UX Polish & PWA**
- ✅ Complete dark mode implementation with system preference detection
- ✅ Advanced animations and microinteractions with reduced motion support
- ✅ Enhanced accessibility features (ARIA labels, keyboard navigation, screen reader support)
- ✅ Progressive Web App (PWA) with service worker and offline capabilities
- ✅ App installation prompts and native app-like experience
- ✅ Loading skeletons and enhanced loading states
- ✅ Professional header with navigation and theme toggle
- ✅ Responsive design with mobile-first approach
- ✅ Custom scrollbars and selection styles
- ✅ Glass morphism effects and modern UI polish
- ✅ Accessibility hooks for font size and motion preferences
- ✅ PWA install banners and offline status indicators

🎉 **Project Complete!**
The Forecaster app is now a fully-featured, production-ready weather planning application with enterprise-level features, accessibility compliance, and modern PWA capabilities.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB connection string (for Phase 2)
- OpenWeather API key (for Phase 2)

### Installation

1. Clone the repository and navigate to the project:
   ```bash
   cd forecaster
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Edit `.env.local` with your actual credentials (when implementing Phase 2):
   ```env
   MONGODB_URI=your_mongodb_connection_string
   OPENWEATHER_API_KEY=your_openweather_api_key
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

- `GET /api/health` - Health check endpoint (tests database and weather API)
- `POST /api/upload` - Upload and parse GPX files
- `POST /api/weather` - Generate weather forecasts for routes
- `GET /api/upload` - Upload endpoint documentation
- `GET /api/weather` - Weather endpoint documentation

## Project Structure

```
forecaster/
├── src/
│   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── api/            # API routes
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/         # React components
│   │   ├── ui/            # Shadcn UI components
│   │   └── features/      # Feature-specific components (planned)
│   ├── lib/               # Utilities and services
│   │   ├── constants.ts   # Application constants
│   │   ├── format.ts      # Formatting utilities
│   │   └── utils.ts       # General utilities
│   └── types/             # TypeScript type definitions
│       └── index.ts       # Main type definitions
├── public/                # Static assets
├── .env.example          # Environment variables template
├── next.config.ts        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── package.json          # Dependencies and scripts
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing the Application

1. **Health Check**: Visit `http://localhost:3000/api/health` to verify the API is working
2. **Main Application**: Visit `http://localhost:3000` to see the landing page
3. **Build Test**: Run `npm run build` to ensure the application builds successfully

## Contributing

This project is currently in active development. Contributions will be welcome once the core features are implemented.

## License

This project is licensed under the MIT License.
