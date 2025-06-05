"use client";

import React, { Component, ReactNode, useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertTriangle,
  RefreshCw,
  WifiOff,
  Download,
  FileText,
  MapPin,
  BarChart3
} from 'lucide-react'
import { logError } from '@/lib/error-tracking'

// Error Boundary for graceful error handling
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: Record<string, unknown>) => void
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: Record<string, unknown>) {
    this.setState({ errorInfo })
    logError(error, { errorBoundary: true, ...errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
        />
      )
    }

    return this.props.children
  }
}

// Generic error fallback component
interface ErrorFallbackProps {
  error?: Error
  onRetry?: () => void
  title?: string
  description?: string
}

export function ErrorFallback({ 
  error, 
  onRetry, 
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again."
}: ErrorFallbackProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert>
            <AlertDescription className="text-sm font-mono">
              {error.message}
            </AlertDescription>
          </Alert>
        )}
        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Network status component
export function NetworkStatus() {
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setShowOfflineMessage(false)
    }

    const handleOffline = () => {
      setShowOfflineMessage(true)
    }

    if (!navigator.onLine) {
      setShowOfflineMessage(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showOfflineMessage) return null

  return (
    <Alert className="fixed top-4 right-4 w-auto z-50">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        You're offline. Some features may not work properly.
      </AlertDescription>
    </Alert>
  )
}

// Fallback for when JavaScript is disabled
export function NoScriptFallback() {
  return (
    <noscript>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>JavaScript Required</CardTitle>
            <CardDescription>
              Forecaster requires JavaScript to function properly. Please enable JavaScript in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This application provides weather forecasting for outdoor activities.
                To use all features, please enable JavaScript.
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  GPX Upload
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Interactive Maps
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Weather Charts
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  PDF Export
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </noscript>
  )
}

// Fallback for unsupported browsers
export function UnsupportedBrowserFallback() {
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    // Check for required features
    const requiredFeatures = [
      'fetch',
      'Promise',
      'Map',
      'Set',
      'WeakMap',
      'WeakSet',
    ]

    const missingFeatures = requiredFeatures.filter(feature => !(feature in window))
    
    if (missingFeatures.length > 0) {
      setShowWarning(true)
    }
  }, [])

  if (!showWarning) return null

  return (
    <Alert className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        Your browser may not support all features of this application. 
        For the best experience, please use a modern browser like Chrome, Firefox, Safari, or Edge.
      </AlertDescription>
    </Alert>
  )
}

// Fallback for when APIs are unavailable
interface APIFallbackProps {
  apiName: string
  children: ReactNode
  fallbackContent?: ReactNode
}

export function APIFallback({ apiName, children, fallbackContent }: APIFallbackProps) {
  const [apiAvailable, setApiAvailable] = useState(true)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAPI = async () => {
      try {
        const response = await fetch('/api/health', { 
          method: 'GET',
          cache: 'no-cache' 
        })
        setApiAvailable(response.ok)
      } catch {
        setApiAvailable(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkAPI()
  }, [])

  if (isChecking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Checking {apiName} availability...
        </CardContent>
      </Card>
    )
  }

  if (!apiAvailable) {
    return fallbackContent || (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {apiName} is currently unavailable. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  return <>{children}</>
}

// Progressive enhancement wrapper
interface ProgressiveEnhancementProps {
  feature: string
  children: ReactNode
  fallback: ReactNode
}

export function ProgressiveEnhancement({ 
  feature, 
  children, 
  fallback 
}: ProgressiveEnhancementProps) {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if feature is supported
    const checkFeatureSupport = () => {
      switch (feature) {
        case 'geolocation':
          return 'geolocation' in navigator
        case 'webgl':
          try {
            const canvas = document.createElement('canvas')
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
          } catch {
            return false
          }
        case 'indexeddb':
          return 'indexedDB' in window
        case 'serviceworker':
          return 'serviceWorker' in navigator
        case 'webassembly':
          return 'WebAssembly' in window
        default:
          return true
      }
    }

    setIsSupported(checkFeatureSupport())
  }, [feature])

  return isSupported ? <>{children}</> : <>{fallback}</>
}

// Lazy loading fallback
interface LazyFallbackProps {
  isLoading: boolean
  error?: Error
  children: ReactNode
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
}

export function LazyFallback({ 
  isLoading, 
  error, 
  children, 
  loadingComponent,
  errorComponent 
}: LazyFallbackProps) {
  if (error) {
    return errorComponent || (
      <ErrorFallback 
        error={error} 
        title="Failed to load component"
        description="This component could not be loaded. Please refresh the page."
      />
    )
  }

  if (isLoading) {
    return loadingComponent || (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading component...
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}

// Feature detection hook
export function useFeatureDetection(feature: string): boolean {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    const checkSupport = () => {
      switch (feature) {
        case 'touch':
          return 'ontouchstart' in window || navigator.maxTouchPoints > 0
        case 'hover':
          return window.matchMedia('(hover: hover)').matches
        case 'reduced-motion':
          return window.matchMedia('(prefers-reduced-motion: reduce)').matches
        case 'dark-mode':
          return window.matchMedia('(prefers-color-scheme: dark)').matches
        case 'high-contrast':
          return window.matchMedia('(prefers-contrast: high)').matches
        default:
          return false
      }
    }

    setIsSupported(checkSupport())

    // Listen for changes
    const mediaQuery = window.matchMedia(`(${feature})`)
    const handler = () => setIsSupported(checkSupport())
    
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [feature])

  return isSupported
}
