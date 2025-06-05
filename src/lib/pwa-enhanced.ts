"use client";

import { logInfo, logError } from './error-tracking'

// Enhanced PWA configuration
export const PWA_CONFIG = {
  CACHE_NAME: 'forecaster-v1',
  OFFLINE_CACHE_NAME: 'forecaster-offline-v1',
  ROUTES_CACHE_NAME: 'forecaster-routes-v1',
  WEATHER_CACHE_NAME: 'forecaster-weather-v1',
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  OFFLINE_FALLBACK_URL: '/offline',
  BACKGROUND_SYNC_TAG: 'weather-sync',
}

// Service Worker registration with enhanced features
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            showUpdateAvailableNotification()
          }
        })
      }
    })

    logInfo('Service Worker registered successfully', { scope: registration.scope })
    return registration
  } catch (error) {
    logError(error as Error, { context: 'Service Worker registration failed' })
    return null
  }
}

// Enhanced offline detection
export class OfflineManager {
  private isOnline: boolean = navigator.onLine
  private listeners: Set<(online: boolean) => void> = new Set()
  private retryQueue: Array<() => Promise<void>> = []

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners()
      this.processRetryQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners()
    })
  }

  public getStatus(): boolean {
    return this.isOnline
  }

  public addListener(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.isOnline))
  }

  public addToRetryQueue(operation: () => Promise<void>) {
    this.retryQueue.push(operation)
  }

  private async processRetryQueue() {
    while (this.retryQueue.length > 0 && this.isOnline) {
      const operation = this.retryQueue.shift()
      if (operation) {
        try {
          await operation()
        } catch (error) {
          logError(error as Error, { context: 'Retry queue operation failed' })
        }
      }
    }
  }
}

// Background sync for weather data
export class BackgroundSyncManager {
  private registration: ServiceWorkerRegistration | null = null

  constructor(registration: ServiceWorkerRegistration | null) {
    this.registration = registration
  }

  public async scheduleWeatherSync(routeData: any): Promise<void> {
    if (!this.registration || !('serviceWorker' in navigator)) {
      // Fallback for browsers without background sync
      return this.fallbackSync(routeData)
    }

    try {
      // Store data for background sync
      await this.storeForSync(routeData)

      // Register background sync if available
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        await (this.registration as any).sync.register(PWA_CONFIG.BACKGROUND_SYNC_TAG)
      }

      logInfo('Background sync scheduled', { routeId: routeData.id })
    } catch (error) {
      logError(error as Error, { context: 'Background sync scheduling failed' })
      return this.fallbackSync(routeData)
    }
  }

  private async storeForSync(routeData: any): Promise<void> {
    if ('indexedDB' in window) {
      // Store in IndexedDB for background sync
      const db = await this.openDatabase()
      const transaction = db.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')
      
      await store.add({
        id: Date.now(),
        type: 'weather_request',
        data: routeData,
        timestamp: Date.now(),
      })
    }
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('forecaster_sync', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' })
        }
      }
    })
  }

  private async fallbackSync(routeData: any): Promise<void> {
    // Immediate sync attempt for browsers without background sync
    try {
      const response = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeData),
      })
      
      if (response.ok) {
        logInfo('Fallback sync completed', { routeId: routeData.id })
      }
    } catch (error) {
      logError(error as Error, { context: 'Fallback sync failed' })
    }
  }
}

// Enhanced caching for routes and weather data
export class EnhancedCacheManager {
  private cacheName: string

  constructor(cacheName: string = PWA_CONFIG.CACHE_NAME) {
    this.cacheName = cacheName
  }

  public async cacheRoute(routeData: any): Promise<void> {
    try {
      const cache = await caches.open(PWA_CONFIG.ROUTES_CACHE_NAME)
      const cacheKey = `/cache/route/${routeData.id}`
      
      const response = new Response(JSON.stringify({
        data: routeData,
        timestamp: Date.now(),
        expires: Date.now() + PWA_CONFIG.CACHE_DURATION,
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
      
      await cache.put(cacheKey, response)
      logInfo('Route cached successfully', { routeId: routeData.id })
    } catch (error) {
      logError(error as Error, { context: 'Route caching failed' })
    }
  }

  public async getCachedRoute(routeId: string): Promise<any | null> {
    try {
      const cache = await caches.open(PWA_CONFIG.ROUTES_CACHE_NAME)
      const cacheKey = `/cache/route/${routeId}`
      const response = await cache.match(cacheKey)
      
      if (response) {
        const cached = await response.json()
        
        // Check if cache is still valid
        if (Date.now() < cached.expires) {
          logInfo('Route cache hit', { routeId })
          return cached.data
        } else {
          // Remove expired cache
          await cache.delete(cacheKey)
        }
      }
      
      return null
    } catch (error) {
      logError(error as Error, { context: 'Route cache retrieval failed' })
      return null
    }
  }

  public async cacheWeatherData(coordinates: string, weatherData: any): Promise<void> {
    try {
      const cache = await caches.open(PWA_CONFIG.WEATHER_CACHE_NAME)
      const cacheKey = `/cache/weather/${coordinates}`
      
      const response = new Response(JSON.stringify({
        data: weatherData,
        timestamp: Date.now(),
        expires: Date.now() + (30 * 60 * 1000), // 30 minutes for weather
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
      
      await cache.put(cacheKey, response)
    } catch (error) {
      logError(error as Error, { context: 'Weather data caching failed' })
    }
  }

  public async getCachedWeatherData(coordinates: string): Promise<any | null> {
    try {
      const cache = await caches.open(PWA_CONFIG.WEATHER_CACHE_NAME)
      const cacheKey = `/cache/weather/${coordinates}`
      const response = await cache.match(cacheKey)
      
      if (response) {
        const cached = await response.json()
        
        if (Date.now() < cached.expires) {
          return cached.data
        } else {
          await cache.delete(cacheKey)
        }
      }
      
      return null
    } catch (error) {
      logError(error as Error, { context: 'Weather cache retrieval failed' })
      return null
    }
  }

  public async clearExpiredCaches(): Promise<void> {
    try {
      const cacheNames = [
        PWA_CONFIG.ROUTES_CACHE_NAME,
        PWA_CONFIG.WEATHER_CACHE_NAME,
      ]
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const requests = await cache.keys()
        
        for (const request of requests) {
          const response = await cache.match(request)
          if (response) {
            try {
              const cached = await response.json()
              if (Date.now() >= cached.expires) {
                await cache.delete(request)
              }
            } catch {
              // Invalid cache entry, remove it
              await cache.delete(request)
            }
          }
        }
      }
    } catch (error) {
      logError(error as Error, { context: 'Cache cleanup failed' })
    }
  }
}

// PWA install prompt management
export class InstallPromptManager {
  private deferredPrompt: any = null
  private isInstalled: boolean = false

  constructor() {
    this.setupEventListeners()
    this.checkInstallStatus()
  }

  private setupEventListeners() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.deferredPrompt = e
      this.showInstallBanner()
    })

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true
      this.hideInstallBanner()
      logInfo('PWA installed successfully')
    })
  }

  private checkInstallStatus() {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true
    }
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false
    }

    try {
      this.deferredPrompt.prompt()
      const { outcome } = await this.deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        logInfo('PWA install accepted')
        return true
      } else {
        logInfo('PWA install declined')
        return false
      }
    } catch (error) {
      logError(error as Error, { context: 'PWA install prompt failed' })
      return false
    } finally {
      this.deferredPrompt = null
    }
  }

  private showInstallBanner() {
    // Dispatch custom event for UI components to listen to
    window.dispatchEvent(new CustomEvent('pwa-install-available'))
  }

  private hideInstallBanner() {
    window.dispatchEvent(new CustomEvent('pwa-install-completed'))
  }

  public getInstallStatus(): boolean {
    return this.isInstalled
  }
}

// Update notification
function showUpdateAvailableNotification() {
  window.dispatchEvent(new CustomEvent('pwa-update-available'))
}

// Initialize PWA features
export async function initializePWA() {
  const registration = await registerServiceWorker()
  const offlineManager = new OfflineManager()
  const backgroundSync = new BackgroundSyncManager(registration)
  const cacheManager = new EnhancedCacheManager()
  const installPrompt = new InstallPromptManager()

  // Clean up expired caches periodically
  setInterval(() => {
    cacheManager.clearExpiredCaches()
  }, 60 * 60 * 1000) // Every hour

  return {
    registration,
    offlineManager,
    backgroundSync,
    cacheManager,
    installPrompt,
  }
}
