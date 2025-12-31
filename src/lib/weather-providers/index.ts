/**
 * Weather Providers Index
 * Central export for all weather provider implementations
 */

export { BaseWeatherProvider, type IWeatherProvider } from './base-provider';
export { OpenMeteoProvider } from './open-meteo-provider';
export { WeatherAPIProvider } from './weatherapi-provider';
export { VisualCrossingProvider } from './visual-crossing-provider';

import { IWeatherProvider } from './base-provider';
import { OpenMeteoProvider } from './open-meteo-provider';
import { WeatherAPIProvider } from './weatherapi-provider';
import { VisualCrossingProvider } from './visual-crossing-provider';
import { WeatherProviderId, WEATHER_PROVIDERS } from '@/types/weather-sources';

/**
 * Create a provider instance by ID
 */
export function createProvider(id: WeatherProviderId, apiKey?: string): IWeatherProvider {
  switch (id) {
    case 'open-meteo':
      return new OpenMeteoProvider();
    case 'weatherapi':
      return new WeatherAPIProvider(apiKey);
    case 'visual-crossing':
      return new VisualCrossingProvider(apiKey);
    case 'openweathermap':
      // Legacy provider - could be implemented if needed
      return new OpenMeteoProvider(); // Fallback to Open-Meteo
    default:
      return new OpenMeteoProvider();
  }
}

/**
 * Get all available provider IDs
 */
export function getAvailableProviderIds(): WeatherProviderId[] {
  return Object.keys(WEATHER_PROVIDERS) as WeatherProviderId[];
}

/**
 * Check if a provider requires an API key
 */
export function providerRequiresApiKey(id: WeatherProviderId): boolean {
  return WEATHER_PROVIDERS[id]?.apiKeyRequired ?? true;
}

/**
 * Get provider display info
 */
export function getProviderInfo(id: WeatherProviderId) {
  return WEATHER_PROVIDERS[id];
}

