# Forecaster Development Workflow

## Git Branch Strategy

### Main Branch (`main`)
- **Purpose**: Production-ready code for Vercel deployments
- **Protection**: Only update when deploying to production
- **Stability**: All code must be tested and stable

### Development Branch (`development`)
- **Purpose**: Active development and feature work
- **Usage**: All new features, bug fixes, and experiments
- **Workflow**: Create feature branches from `development`, merge back via PR

### Workflow Process
1. **Feature Development**: `development` → `feature/feature-name` → PR to `development`
2. **Production Deployment**: `development` → PR to `main` → Deploy to Vercel
3. **Hotfixes**: `main` → `hotfix/issue-name` → PR to both `main` and `development`

## Current System Limits

### Weather API Request Limits
- **Safe limit**: 80-100 points per request
- **Maximum theoretical**: 150-200 points (with 25s timeout)
- **Recommended**: 50-100 points for reliable performance
- **Timeout limits**: 
  - Small routes (≤100 points): 10s timeout, 3 retries
  - Large routes (>100 points): 25s timeout, 1 retry

### GPX File Constraints
- **Max file size**: 5MB
- **Max waypoints**: 2,000 points
- **Supported formats**: `.gpx` files only
- **MIME types**: `application/gpx+xml`, `text/xml`, `application/xml`

### Vercel Deployment Limits
- **Hobby plan**: 10 second function timeout
- **Pro plan**: 30 second function timeout (currently using 25s)
- **Memory**: 1024MB default
- **Request size**: 4.5MB max

### OpenWeather API Limits
- **Rate limit**: 60 requests per minute
- **Cache duration**: 1 hour
- **Batch processing**: 10 points per batch with 500ms delay

## Performance Optimization

### Current Implementation
- **Route sampling**: Points sampled based on forecast interval (default 5km)
- **Caching**: MongoDB caching for routes and forecasts
- **Batch processing**: Weather requests processed in batches of 10
- **Progressive loading**: Fallback to regular endpoint (progressive not implemented)

### Recommendations for Large Routes
1. **Increase forecast interval**: Use 10km or 20km intervals for long routes
2. **Route splitting**: Consider splitting very long routes into segments
3. **Caching strategy**: Leverage MongoDB caching for repeated requests
4. **Progressive implementation**: Future work to implement true progressive loading

## Development Guidelines

### Before Starting Development
```bash
git checkout development
git pull origin development
git checkout -b feature/your-feature-name
```

### Before Deploying to Production
1. Ensure all tests pass
2. Test on development branch thoroughly
3. Create PR from `development` to `main`
4. Deploy to Vercel from `main` branch

### Code Quality Standards
- Fix all ESLint/TypeScript errors
- Maintain hydration compatibility (SSR/CSR)
- Add proper error handling and validation
- Include appropriate logging for debugging
- Test file upload and weather generation flows

## Recent Fixes (v1.0.1)
- ✅ Fixed hydration mismatch errors
- ✅ Fixed "chunkForecasts is not iterable" error
- ✅ Improved file upload reliability
- ✅ Enhanced error handling and validation
- ✅ Simplified component architecture
- ✅ Added proper client-side state management

## Future Development Priorities
1. **Progressive Weather Loading**: Implement true chunked weather requests
2. **Enhanced Caching**: Improve cache hit rates and performance
3. **Route Optimization**: Better route sampling algorithms
4. **Mobile Optimization**: Touch-friendly interactions
5. **PWA Features**: Offline support and app installation
6. **Advanced Visualizations**: Enhanced charts and maps
7. **Export Features**: PDF generation improvements
