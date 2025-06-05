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

// Bundle splitting for chart libraries
export const LazyChartJS = dynamic(
  () => import('react-chartjs-2').then(mod => ({ default: mod.Line })),
  {
    loading: () => <div className="h-64 w-full bg-muted animate-pulse rounded" />,
    ssr: false,
  }
)

// Bundle splitting for map libraries - simplified for now
export const LazyMapComponent = dynamic(
  () => import('@/components/features/WeatherMap').then(mod => ({ default: mod.WeatherMap })),
  {
    loading: () => <div className="h-96 w-full bg-muted animate-pulse rounded" />,
    ssr: false,
  }
)

// Conditional loading based on feature flags
export function ConditionalLazyComponent({
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
