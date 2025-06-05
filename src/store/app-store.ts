import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
import { Route, WeatherForecast, AppSettings, SelectedWeatherPoint } from '@/types'
import { ROUTE_CONFIG } from '@/lib/constants'

// Store state interface
interface AppState {
  // Route data
  route: Route | null
  forecasts: WeatherForecast[]
  selectedPoint: SelectedWeatherPoint | null
  
  // UI state
  isGeneratingForecast: boolean
  isUploadingFile: boolean
  sidebarOpen: boolean
  
  // Settings
  settings: AppSettings
  
  // Cache and performance
  lastForecastGenerated: Date | null
  cacheHit: boolean
  
  // Error state
  lastError: string | null
  
  // Actions
  setRoute: (route: Route | null) => void
  setForecasts: (forecasts: WeatherForecast[]) => void
  setSelectedPoint: (point: SelectedWeatherPoint | null) => void
  setIsGeneratingForecast: (loading: boolean) => void
  setIsUploadingFile: (loading: boolean) => void
  setSidebarOpen: (open: boolean) => void
  updateSettings: (settings: Partial<AppSettings>) => void
  setLastError: (error: string | null) => void
  setCacheHit: (hit: boolean) => void
  
  // Computed getters
  hasData: () => boolean
  getTotalAlerts: () => number
  getRouteStats: () => {
    totalDistance: number
    totalPoints: number
    estimatedDuration: number
  } | null
  
  // Actions
  clearData: () => void
  resetToDefaults: () => void
}

// Default settings
const defaultSettings: AppSettings = {
  startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  averageSpeed: ROUTE_CONFIG.DEFAULT_SPEED,
  forecastInterval: ROUTE_CONFIG.DEFAULT_INTERVAL,
  units: 'metric',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
}

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      route: null,
      forecasts: [],
      selectedPoint: null,
      isGeneratingForecast: false,
      isUploadingFile: false,
      sidebarOpen: false,
      settings: defaultSettings,
      lastForecastGenerated: null,
      cacheHit: false,
      lastError: null,

      // Actions
      setRoute: (route) =>
        set((state) => {
          state.route = route
          // Clear forecasts when route changes
          if (!route) {
            state.forecasts = []
            state.selectedPoint = null
          }
        }),

      setForecasts: (forecasts) =>
        set((state) => {
          state.forecasts = forecasts
          state.lastForecastGenerated = new Date()
          state.selectedPoint = null // Reset selection
        }),

      setSelectedPoint: (point) =>
        set((state) => {
          state.selectedPoint = point
        }),

      setIsGeneratingForecast: (loading) =>
        set((state) => {
          state.isGeneratingForecast = loading
          if (loading) {
            state.lastError = null
          }
        }),

      setIsUploadingFile: (loading) =>
        set((state) => {
          state.isUploadingFile = loading
          if (loading) {
            state.lastError = null
          }
        }),

      setSidebarOpen: (open) =>
        set((state) => {
          state.sidebarOpen = open
        }),

      updateSettings: (newSettings) =>
        set((state) => {
          state.settings = { ...state.settings, ...newSettings }
        }),

      setLastError: (error) =>
        set((state) => {
          state.lastError = error
        }),

      setCacheHit: (hit) =>
        set((state) => {
          state.cacheHit = hit
        }),

      // Computed getters
      hasData: () => {
        const state = get()
        return !!(state.route && state.forecasts.length > 0)
      },

      getTotalAlerts: () => {
        const state = get()
        return state.forecasts.reduce(
          (sum, forecast) => sum + (forecast.alerts?.length || 0),
          0
        )
      },

      getRouteStats: () => {
        const state = get()
        if (!state.route) return null

        return {
          totalDistance: state.route.totalDistance,
          totalPoints: state.route.points.length,
          estimatedDuration: state.route.estimatedDuration || 0,
        }
      },

      // Actions
      clearData: () =>
        set((state) => {
          state.route = null
          state.forecasts = []
          state.selectedPoint = null
          state.lastForecastGenerated = null
          state.cacheHit = false
          state.lastError = null
        }),

      resetToDefaults: () =>
        set((state) => {
          state.settings = { ...defaultSettings }
        }),
    })),
    {
      name: 'forecaster-app-store',
      partialize: (state) => ({
        // Only persist settings and some UI state
        settings: state.settings,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)

// Selectors for better performance
export const useRoute = () => useAppStore((state) => state.route)
export const useForecasts = () => useAppStore((state) => state.forecasts)
export const useSelectedPoint = () => useAppStore((state) => state.selectedPoint)
export const useSettings = () => useAppStore((state) => state.settings)
export const useIsLoading = () => useAppStore((state) => ({
  isGeneratingForecast: state.isGeneratingForecast,
  isUploadingFile: state.isUploadingFile,
}))
export const useHasData = () => useAppStore((state) => state.hasData())
export const useTotalAlerts = () => useAppStore((state) => state.getTotalAlerts())
export const useRouteStats = () => useAppStore((state) => state.getRouteStats())

// Action selectors
export const useAppActions = () => useAppStore((state) => ({
  setRoute: state.setRoute,
  setForecasts: state.setForecasts,
  setSelectedPoint: state.setSelectedPoint,
  setIsGeneratingForecast: state.setIsGeneratingForecast,
  setIsUploadingFile: state.setIsUploadingFile,
  updateSettings: state.updateSettings,
  clearData: state.clearData,
  resetToDefaults: state.resetToDefaults,
}))
