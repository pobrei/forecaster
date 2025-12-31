/**
 * Weather Source Manager
 * Central manager for multiple weather providers with caching, fallback, and comparison
 */

import {
  WeatherProviderId,
  WeatherSourcePreferences,
  ProviderStatusInfo,
  MultiSourceWeatherData,
  SourcedWeatherData,
  ConsensusWeatherData,
  SourceComparisonData,
  MultiSourceWeatherForecast,
  DEFAULT_WEATHER_SOURCE_PREFERENCES,
  WEATHER_PROVIDERS,
} from '@/types/weather-sources';
import { RoutePoint, WeatherAlert } from '@/types';
import { IWeatherProvider, createProvider } from './weather-providers';
import { generateWeatherAlerts } from './weather-service';

// Singleton instance
let managerInstance: WeatherSourceManager | null = null;

export class WeatherSourceManager {
  private providers: Map<WeatherProviderId, IWeatherProvider> = new Map();
  private statuses: Map<WeatherProviderId, ProviderStatusInfo> = new Map();
  private preferences: WeatherSourcePreferences;
  private cache: Map<string, { data: MultiSourceWeatherData; expires: number }> = new Map();
  private cacheDuration = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.preferences = { ...DEFAULT_WEATHER_SOURCE_PREFERENCES };
    this.initializeProviders();
  }

  static getInstance(): WeatherSourceManager {
    if (!managerInstance) {
      managerInstance = new WeatherSourceManager();
    }
    return managerInstance;
  }

  private initializeProviders(): void {
    // Always initialize Open-Meteo (no API key required)
    this.providers.set('open-meteo', createProvider('open-meteo'));
    
    // Initialize other providers if API keys are available
    if (process.env.WEATHERAPI_KEY) {
      this.providers.set('weatherapi', createProvider('weatherapi', process.env.WEATHERAPI_KEY));
    }
    if (process.env.VISUAL_CROSSING_API_KEY) {
      this.providers.set('visual-crossing', createProvider('visual-crossing', process.env.VISUAL_CROSSING_API_KEY));
    }
  }

  getPreferences(): WeatherSourcePreferences {
    return { ...this.preferences };
  }

  setPreferences(prefs: Partial<WeatherSourcePreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
  }

  getAvailableProviders(): WeatherProviderId[] {
    return Array.from(this.providers.keys()).filter(id => 
      this.providers.get(id)?.isConfigured()
    );
  }

  getProviderStatus(id: WeatherProviderId): ProviderStatusInfo | undefined {
    return this.statuses.get(id);
  }

  getAllStatuses(): ProviderStatusInfo[] {
    return Array.from(this.statuses.values());
  }

  async checkProviderHealth(id: WeatherProviderId): Promise<ProviderStatusInfo | null> {
    const provider = this.providers.get(id);
    if (!provider) return null;

    try {
      const status = await provider.checkHealth();
      this.statuses.set(id, status);
      return status;
    } catch (error) {
      const status: ProviderStatusInfo = {
        providerId: id,
        status: 'unavailable',
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
      this.statuses.set(id, status);
      return status;
    }
  }

  async checkAllProvidersHealth(): Promise<Map<WeatherProviderId, ProviderStatusInfo>> {
    const results = await Promise.allSettled(
      this.getAvailableProviders().map(id => this.checkProviderHealth(id))
    );
    return this.statuses;
  }

  private getCacheKey(lat: number, lon: number): string {
    return `${lat.toFixed(4)},${lon.toFixed(4)}`;
  }

  private getCachedData(lat: number, lon: number): MultiSourceWeatherData | null {
    const key = this.getCacheKey(lat, lon);
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(lat: number, lon: number, data: MultiSourceWeatherData): void {
    const key = this.getCacheKey(lat, lon);
    this.cache.set(key, { data, expires: Date.now() + this.cacheDuration });
  }

  async fetchFromProvider(
    providerId: WeatherProviderId,
    lat: number,
    lon: number
  ): Promise<SourcedWeatherData | null> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.isConfigured()) {
      return null;
    }

    try {
      return await provider.fetchWeatherData(lat, lon);
    } catch (error) {
      console.error(`Error fetching from ${providerId}:`, error);
      return null;
    }
  }

  async fetchMultiSourceData(
    lat: number,
    lon: number,
    providerIds?: WeatherProviderId[]
  ): Promise<MultiSourceWeatherData> {
    // Check cache
    const cached = this.getCachedData(lat, lon);
    if (cached) return cached;

    const sourcesToUse = providerIds || this.preferences.enabledSources;
    const fetchPromises = sourcesToUse.map(id => this.fetchFromProvider(id, lat, lon));
    
    const results = await Promise.allSettled(fetchPromises);
    const sources: SourcedWeatherData[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        sources.push(result.value);
      }
    });

    const multiSourceData: MultiSourceWeatherData = {
      lat, lon,
      timestamp: new Date(),
      sources,
      consensus: sources.length > 1 ? this.calculateConsensus(sources) : undefined,
    };

    this.setCachedData(lat, lon, multiSourceData);
    return multiSourceData;
  }

  private calculateConsensus(sources: SourcedWeatherData[]): ConsensusWeatherData {
    const temps = sources.map(s => s.temp);
    const humidities = sources.map(s => s.humidity);
    const windSpeeds = sources.map(s => s.wind_speed);
    const windDegs = sources.map(s => s.wind_deg);
    const pressures = sources.map(s => s.pressure);
    const clouds = sources.map(s => s.clouds);
    const precips = sources.map(s => s.rain?.['1h'] || 0);

    const calcStats = (values: number[], sourceIds: WeatherProviderId[]) => ({
      value: values.reduce((a, b) => a + b, 0) / values.length,
      variance: this.calculateVariance(values),
      sources: sourceIds,
    });

    const sourceIds = sources.map(s => s.source);
    const mainCondition = this.getMostCommonCondition(sources);

    return {
      temp: calcStats(temps, sourceIds),
      humidity: calcStats(humidities, sourceIds),
      wind_speed: calcStats(windSpeeds, sourceIds),
      wind_deg: calcStats(windDegs, sourceIds),
      pressure: calcStats(pressures, sourceIds),
      clouds: calcStats(clouds, sourceIds),
      precipitation: calcStats(precips, sourceIds),
      weather: mainCondition,
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  private getMostCommonCondition(sources: SourcedWeatherData[]): { condition: string; icon: string } {
    const conditionCounts = new Map<string, number>();
    sources.forEach(s => {
      const condition = s.weather[0]?.main || 'Unknown';
      conditionCounts.set(condition, (conditionCounts.get(condition) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon = 'Clear';
    conditionCounts.forEach((count, condition) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = condition;
      }
    });

    const iconSource = sources.find(s => s.weather[0]?.main === mostCommon);
    return {
      condition: mostCommon,
      icon: iconSource?.weather[0]?.icon || '01d',
    };
  }

  calculateComparison(sources: SourcedWeatherData[]): SourceComparisonData | undefined {
    if (sources.length < 2) return undefined;

    const temps = sources.map(s => s.temp);
    const humidities = sources.map(s => s.humidity);
    const windSpeeds = sources.map(s => s.wind_speed);
    const precips = sources.map(s => s.rain?.['1h'] || 0);

    const getRange = (values: number[]) => ({
      min: Math.min(...values),
      max: Math.max(...values),
      diff: Math.max(...values) - Math.min(...values),
    });

    // Calculate agreement score (0-100)
    const tempVariance = this.calculateVariance(temps);
    const agreementScore = Math.max(0, 100 - tempVariance * 10);

    // Find outliers (more than 2 standard deviations from mean)
    const meanTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const outlierSources = sources
      .filter(s => Math.abs(s.temp - meanTemp) > tempVariance * 2)
      .map(s => s.source);

    return {
      tempRange: getRange(temps),
      humidityRange: getRange(humidities),
      windSpeedRange: getRange(windSpeeds),
      precipitationRange: getRange(precips),
      agreementScore,
      outlierSources,
    };
  }

  async fetchMultiSourceForecast(
    routePoint: RoutePoint,
    providerIds?: WeatherProviderId[]
  ): Promise<MultiSourceWeatherForecast> {
    const multiSourceData = await this.fetchMultiSourceData(
      routePoint.lat,
      routePoint.lon,
      providerIds
    );

    // Get primary source data (first enabled source or fallback)
    let primaryWeather = multiSourceData.sources.find(
      s => s.source === this.preferences.primarySource
    );
    if (!primaryWeather && multiSourceData.sources.length > 0) {
      primaryWeather = multiSourceData.sources[0];
    }
    if (!primaryWeather) {
      throw new Error('No weather data available from any source');
    }

    // Generate alerts from primary source
    const alerts = generateWeatherAlerts(primaryWeather);

    return {
      routePoint,
      multiSourceData,
      primaryWeather,
      alerts: alerts.length > 0 ? alerts : undefined,
      sourceComparison: this.calculateComparison(multiSourceData.sources),
    };
  }

  async fetchMultiSourceForecasts(
    routePoints: RoutePoint[],
    providerIds?: WeatherProviderId[],
    onProgress?: (current: number, total: number) => void
  ): Promise<MultiSourceWeatherForecast[]> {
    const forecasts: MultiSourceWeatherForecast[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < routePoints.length; i += BATCH_SIZE) {
      const batch = routePoints.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(point =>
        this.fetchMultiSourceForecast(point, providerIds)
      );

      const results = await Promise.allSettled(batchPromises);
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          forecasts.push(result.value);
        }
      });

      onProgress?.(Math.min(i + BATCH_SIZE, routePoints.length), routePoints.length);

      if (i + BATCH_SIZE < routePoints.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return forecasts;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

