/**
 * Base Weather Provider Interface and Abstract Class
 * Defines the contract for all weather data providers
 */

import { 
  WeatherProviderId, 
  WeatherProviderConfig, 
  ProviderStatusInfo,
  SourcedWeatherData,
  ProviderRateLimitState,
  WEATHER_PROVIDERS
} from '@/types/weather-sources';
import { WeatherData } from '@/types';

// Weather Provider Interface
export interface IWeatherProvider {
  readonly id: WeatherProviderId;
  readonly config: WeatherProviderConfig;
  
  // Core Methods
  fetchWeatherData(lat: number, lon: number): Promise<SourcedWeatherData | null>;
  checkHealth(): Promise<ProviderStatusInfo>;
  
  // Rate Limiting
  canMakeRequest(): boolean;
  getRateLimitState(): ProviderRateLimitState;
  
  // Provider Info
  getName(): string;
  isConfigured(): boolean;
}

// Abstract Base Provider
export abstract class BaseWeatherProvider implements IWeatherProvider {
  abstract readonly id: WeatherProviderId;
  
  protected rateLimitState: ProviderRateLimitState;
  protected lastHealthCheck: ProviderStatusInfo | null = null;

  constructor() {
    this.rateLimitState = {
      providerId: 'open-meteo', // Will be overridden
      requestsThisMinute: 0,
      requestsToday: 0,
      lastRequestTime: new Date(0),
      minuteWindowStart: new Date(),
      dayWindowStart: new Date(),
    };
  }

  get config(): WeatherProviderConfig {
    return WEATHER_PROVIDERS[this.id];
  }

  getName(): string {
    return this.config.name;
  }

  abstract isConfigured(): boolean;
  abstract fetchWeatherData(lat: number, lon: number): Promise<SourcedWeatherData | null>;

  async checkHealth(): Promise<ProviderStatusInfo> {
    const startTime = Date.now();
    try {
      // Test with a well-known location (London)
      const result = await this.fetchWeatherData(51.5074, -0.1278);
      const responseTime = Date.now() - startTime;
      
      this.lastHealthCheck = {
        providerId: this.id,
        status: result ? 'available' : 'degraded',
        lastChecked: new Date(),
        responseTimeMs: responseTime,
        successRate: result ? 100 : 0,
      };
    } catch (error) {
      this.lastHealthCheck = {
        providerId: this.id,
        status: 'unavailable',
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        successRate: 0,
      };
    }
    return this.lastHealthCheck;
  }

  canMakeRequest(): boolean {
    this.updateRateLimitWindows();
    
    const { requestsPerMinute, requestsPerDay } = this.config.rateLimit;
    return (
      this.rateLimitState.requestsThisMinute < requestsPerMinute &&
      this.rateLimitState.requestsToday < requestsPerDay
    );
  }

  getRateLimitState(): ProviderRateLimitState {
    this.updateRateLimitWindows();
    return { ...this.rateLimitState };
  }

  protected recordRequest(): void {
    this.updateRateLimitWindows();
    this.rateLimitState.requestsThisMinute++;
    this.rateLimitState.requestsToday++;
    this.rateLimitState.lastRequestTime = new Date();
  }

  private updateRateLimitWindows(): void {
    const now = new Date();
    
    // Reset minute window
    if (now.getTime() - this.rateLimitState.minuteWindowStart.getTime() > 60000) {
      this.rateLimitState.requestsThisMinute = 0;
      this.rateLimitState.minuteWindowStart = now;
    }
    
    // Reset day window
    if (now.getTime() - this.rateLimitState.dayWindowStart.getTime() > 86400000) {
      this.rateLimitState.requestsToday = 0;
      this.rateLimitState.dayWindowStart = now;
    }
  }

  // Helper to transform to SourcedWeatherData
  protected toSourcedData(data: WeatherData): SourcedWeatherData {
    return {
      ...data,
      source: this.id,
      fetchedAt: new Date(),
    };
  }

  // Calculate dew point (used by multiple providers)
  protected calculateDewPoint(temp: number, humidity: number): number {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
  }
}

