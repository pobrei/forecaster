import React from 'react'
import dynamic from 'next/dynamic'
import { ComponentType } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Loading components
const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-32" />
      </CardTitle>
      <CardDescription>
        <Skeleton className="h-4 w-48" />
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
)

const MapSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-32" />
      </CardTitle>
      <CardDescription>
        <Skeleton className="h-4 w-48" />
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-96 w-full rounded-lg" />
    </CardContent>
  </Card>
)

const TimelineSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-32" />
      </CardTitle>
      <CardDescription>
        <Skeleton className="h-4 w-48" />
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

const PDFSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle>
        <Skeleton className="h-6 w-32" />
      </CardTitle>
      <CardDescription>
        <Skeleton className="h-4 w-48" />
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Lazy loaded components with proper typing
export const LazyWeatherCharts = dynamic(
  () => import('@/components/features/WeatherCharts').then(mod => ({ default: mod.WeatherCharts })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Charts don't need SSR
  }
)

export const LazyWeatherMap = dynamic(
  () => import('@/components/features/WeatherMap').then(mod => ({ default: mod.WeatherMap })),
  {
    loading: () => <MapSkeleton />,
    ssr: false, // Maps don't work with SSR
  }
)

export const LazyWeatherTimeline = dynamic(
  () => import('@/components/features/WeatherTimeline').then(mod => ({ default: mod.WeatherTimeline })),
  {
    loading: () => <TimelineSkeleton />,
    ssr: true, // Timeline can be SSR'd
  }
)

export const LazyPDFExport = dynamic(
  () => import('@/components/features/PDFExport').then(mod => ({ default: mod.PDFExport })),
  {
    loading: () => <PDFSkeleton />,
    ssr: false, // PDF generation is client-side only
  }
)

// Advanced lazy loading with intersection observer
export const LazyWeatherChartsWithIntersection = dynamic(
  () => import('@/components/features/WeatherCharts').then(mod => ({ default: mod.WeatherCharts })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)

// Preload functions for better UX
export const preloadWeatherCharts = () => {
  const componentImport = () => import('@/components/features/WeatherCharts')
  componentImport()
}

export const preloadWeatherMap = () => {
  const componentImport = () => import('@/components/features/WeatherMap')
  componentImport()
}

export const preloadPDFExport = () => {
  const componentImport = () => import('@/components/features/PDFExport')
  componentImport()
}

// Bundle splitting for chart libraries with optimized loading
export const LazyLineChart = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Line })),
  {
    loading: () => <div className="h-64 w-full bg-muted animate-pulse rounded" />,
    ssr: false,
  }
)

export const LazyBarChart = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Bar })),
  {
    loading: () => <div className="h-64 w-full bg-muted animate-pulse rounded" />,
    ssr: false,
  }
)

// Chart.js components are loaded directly in WeatherCharts component
// This avoids TypeScript issues with dynamic imports of non-React components

// OpenLayers components are loaded directly in WeatherMap component
// This avoids TypeScript issues with dynamic imports of non-React components

// Bundle splitting for map libraries - optimized
export const LazyMapComponent = dynamic(
  () => import('@/components/features/WeatherMap').then(mod => ({ default: mod.WeatherMap })),
  {
    loading: () => <div className="h-96 w-full bg-muted animate-pulse rounded" />,
    ssr: false,
  }
)

// Advanced dynamic import with retry logic
export function createLazyComponentWithRetry<T = any>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    fallback?: React.ComponentType<T>;
  } = {}
) {
  const { maxRetries = 3, retryDelay = 1000, fallback } = options;

  return dynamic(
    async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await importFn();
        } catch (error) {
          lastError = error as Error;
          console.warn(`Dynamic import attempt ${attempt + 1} failed:`, error);

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      if (fallback) {
        console.error('All dynamic import attempts failed, using fallback:', lastError);
        return { default: fallback };
      }

      throw lastError;
    },
    {
      loading: () => <div className="animate-pulse bg-muted rounded h-32" />,
      ssr: false,
    }
  );
}

// Conditional loading based on feature flags
export function ConditionalLazyComponent({
  feature,
  children
}: {
  feature: string
  children: React.ReactNode
}) {
  // This would check feature flags in a real implementation
  const isFeatureEnabled = true // Replace with actual feature flag check

  if (!isFeatureEnabled) {
    return null
  }

  return <>{children}</>
}

// Intersection Observer based lazy loading
export function LazyOnVisible({
  children,
  fallback,
  rootMargin = '50px'
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref}>
      {isVisible ? children : (fallback || <div className="h-32 bg-muted animate-pulse rounded" />)}
    </div>
  );
}

// Progressive enhancement wrapper
export function ProgressiveEnhancement({ 
  fallback, 
  children 
}: { 
  fallback: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <div>
      <noscript>{fallback}</noscript>
      <div className="js-only">{children}</div>
    </div>
  )
}

// Lazy loading with error boundaries
export function LazyWithErrorBoundary({
  component: Component,
  fallback,
  ...props
}: {
  component: ComponentType<any>
  fallback: React.ReactNode
  [key: string]: any
}) {
  try {
    return <Component {...props} />
  } catch (error) {
    console.error('Lazy component failed to load:', error)
    return <>{fallback}</>
  }
}
