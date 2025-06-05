"use client";

import { track } from '@vercel/analytics'
import { env } from './env'
import { logInfo } from './error-tracking'

// Analytics event types
export enum AnalyticsEvent {
  // User actions
  ROUTE_UPLOADED = 'route_uploaded',
  WEATHER_GENERATED = 'weather_generated',
  PDF_EXPORTED = 'pdf_exported',
  SETTINGS_CHANGED = 'settings_changed',
  
  // User engagement
  CHART_INTERACTION = 'chart_interaction',
  MAP_INTERACTION = 'map_interaction',
  TIMELINE_INTERACTION = 'timeline_interaction',
  
  // Performance
  PAGE_LOAD = 'page_load',
  API_RESPONSE_TIME = 'api_response_time',
  CACHE_HIT = 'cache_hit',
  CACHE_MISS = 'cache_miss',
  
  // Errors
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  VALIDATION_ERROR = 'validation_error',
  
  // PWA
  PWA_INSTALLED = 'pwa_installed',
  OFFLINE_USAGE = 'offline_usage',
  BACKGROUND_SYNC = 'background_sync',
}

// Analytics properties interface
interface AnalyticsProperties {
  [key: string]: string | number | boolean | undefined
}

// User properties for segmentation
interface UserProperties {
  userId?: string
  sessionId?: string
  userAgent?: string
  screenResolution?: string
  timezone?: string
  language?: string
  isReturningUser?: boolean
}

// Performance metrics
interface PerformanceMetrics {
  loadTime?: number
  renderTime?: number
  apiResponseTime?: number
  cacheHitRate?: number
  errorRate?: number
}

class AnalyticsManager {
  private isEnabled: boolean
  private sessionId: string
  private userProperties: UserProperties
  private performanceMetrics: PerformanceMetrics = {}

  constructor() {
    this.isEnabled = !!env.NEXT_PUBLIC_ANALYTICS_ID && env.NODE_ENV === 'production'
    this.sessionId = this.generateSessionId()
    this.userProperties = this.collectUserProperties()
    
    if (this.isEnabled) {
      this.initializeAnalytics()
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private collectUserProperties(): UserProperties {
    if (typeof window === 'undefined') return {}

    return {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      isReturningUser: localStorage.getItem('forecaster_returning_user') === 'true',
    }
  }

  private initializeAnalytics() {
    // Mark user as returning for next visit
    localStorage.setItem('forecaster_returning_user', 'true')
    
    // Track page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigation) {
            this.trackPerformance('page_load', {
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              firstPaint: this.getFirstPaint(),
            })
          }
        }, 0)
      })
    }
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint')
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
    return firstPaint?.startTime || 0
  }

  public trackEvent(
    event: AnalyticsEvent,
    properties: AnalyticsProperties = {}
  ): void {
    if (!this.isEnabled) {
      logInfo('Analytics tracking (disabled)', { event, properties })
      return
    }

    const eventData = {
      ...properties,
      ...this.userProperties,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.pathname : '',
    }

    try {
      // Track with Vercel Analytics
      track(event, eventData)
      
      logInfo('Analytics event tracked', { event, properties: eventData })
    } catch (error) {
      console.error('Analytics tracking failed:', error)
    }
  }

  public trackPerformance(
    metric: string,
    data: Record<string, number>
  ): void {
    this.performanceMetrics = { ...this.performanceMetrics, ...data }
    
    this.trackEvent(AnalyticsEvent.API_RESPONSE_TIME, {
      metric,
      ...data,
    })
  }

  public trackError(
    error: Error,
    context?: Record<string, any>
  ): void {
    this.trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack?.substring(0, 500), // Limit stack trace length
      ...context,
    })
  }

  public trackUserAction(
    action: AnalyticsEvent,
    details: AnalyticsProperties = {}
  ): void {
    this.trackEvent(action, {
      category: 'user_action',
      ...details,
    })
  }

  public trackAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean,
    statusCode?: number
  ): void {
    this.trackEvent(AnalyticsEvent.API_RESPONSE_TIME, {
      endpoint,
      method,
      responseTime,
      success,
      statusCode,
      category: 'api_performance',
    })
  }

  public trackCacheEvent(
    type: 'hit' | 'miss',
    cacheType: string,
    key?: string
  ): void {
    const event = type === 'hit' ? AnalyticsEvent.CACHE_HIT : AnalyticsEvent.CACHE_MISS
    
    this.trackEvent(event, {
      cacheType,
      key: key?.substring(0, 50), // Limit key length
      category: 'cache_performance',
    })
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }

  public setUserProperty(key: string, value: string | number | boolean): void {
    this.userProperties = {
      ...this.userProperties,
      [key]: value,
    }
  }
}

// Create singleton instance
export const analytics = new AnalyticsManager()

// Convenience functions
export function trackRouteUpload(routeData: {
  pointsCount: number
  distance: number
  fileSize: number
}): void {
  analytics.trackUserAction(AnalyticsEvent.ROUTE_UPLOADED, {
    pointsCount: routeData.pointsCount,
    distance: Math.round(routeData.distance),
    fileSize: routeData.fileSize,
  })
}

export function trackWeatherGeneration(data: {
  forecastCount: number
  interval: number
  cacheHit: boolean
  responseTime: number
}): void {
  analytics.trackUserAction(AnalyticsEvent.WEATHER_GENERATED, {
    forecastCount: data.forecastCount,
    interval: data.interval,
    cacheHit: data.cacheHit,
    responseTime: data.responseTime,
  })
}

export function trackChartInteraction(chartType: string, action: string): void {
  analytics.trackUserAction(AnalyticsEvent.CHART_INTERACTION, {
    chartType,
    action,
  })
}

export function trackMapInteraction(action: string, coordinates?: string): void {
  analytics.trackUserAction(AnalyticsEvent.MAP_INTERACTION, {
    action,
    coordinates,
  })
}

export function trackPDFExport(data: {
  pageCount: number
  includeMap: boolean
  includeCharts: boolean
}): void {
  analytics.trackUserAction(AnalyticsEvent.PDF_EXPORTED, {
    pageCount: data.pageCount,
    includeMap: data.includeMap,
    includeCharts: data.includeCharts,
  })
}

export function trackSettingsChange(setting: string, value: string | number): void {
  analytics.trackUserAction(AnalyticsEvent.SETTINGS_CHANGED, {
    setting,
    value: String(value),
  })
}

export function trackPWAInstall(): void {
  analytics.trackUserAction(AnalyticsEvent.PWA_INSTALLED)
}

export function trackOfflineUsage(action: string): void {
  analytics.trackUserAction(AnalyticsEvent.OFFLINE_USAGE, {
    action,
  })
}

// Performance tracking helpers
export function withPerformanceTracking<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = performance.now()
  
  return operation().then(
    (result) => {
      const endTime = performance.now()
      analytics.trackPerformance(operationName, {
        duration: endTime - startTime,
      })
      return result
    },
    (error) => {
      const endTime = performance.now()
      analytics.trackPerformance(operationName, {
        duration: endTime - startTime,
      })
      throw error
    }
  )
}

// Error boundary integration
export function trackErrorBoundary(error: Error, errorInfo: any): void {
  analytics.trackError(error, {
    errorBoundary: true,
    componentStack: errorInfo.componentStack?.substring(0, 500),
  })
}
