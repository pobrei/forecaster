import {
  saveExpedition,
  listSavedExpeditions,
  getSavedExpeditionById,
  deleteSavedExpedition,
  getCachedMultiSourceForecast,
  setCachedMultiSourceForecast,
} from '../mongodb';
import { Route } from '@/types';

describe('MongoDB Features & Expeditions Archive', () => {
  const mockRoute: Route = {
    id: 'route_dolomites_001',
    name: 'Dolomites Test Route',
    totalDistance: 24.5,
    totalElevationGain: 1200,
    points: [
      { lat: 46.5, lon: 11.8, elevation: 1500, distance: 0 },
      { lat: 46.55, lon: 11.85, elevation: 2200, distance: 24.5 },
    ],
  };

  const mockExpedition = {
    id: 'test_dolomites_001',
    name: 'Dolomites Alta Via 1',
    description: 'High alpine traverse in northern Italy',
    createdAt: new Date(),
    updatedAt: new Date(),
    route: mockRoute,
    forecasts: [],
    settings: {
      startTime: new Date(),
      averageSpeed: 4.0,
      forecastInterval: 2,
      units: 'metric' as const,
      timezone: 'Europe/Rome',
    },
    stats: {
      totalDistance: 24.5,
      totalElevationGain: 1200,
      pointsCount: 2,
      minTemp: 4.2,
      maxTemp: 18.5,
      maxWind: 32,
    },
  };

  it('saves an expedition and retrieves it by ID', async () => {
    const saved = await saveExpedition(mockExpedition);
    expect(saved.id).toBe(mockExpedition.id);
    expect(saved.name).toBe('Dolomites Alta Via 1');

    const retrieved = await getSavedExpeditionById(mockExpedition.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(mockExpedition.id);
    expect(retrieved?.stats.totalDistance).toBe(24.5);
  });

  it('lists saved expeditions in descending order of update', async () => {
    const list = await listSavedExpeditions();
    expect(Array.isArray(list)).toBe(true);
    const found = list.find(e => e.id === mockExpedition.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Dolomites Alta Via 1');
  });

  it('deletes a saved expedition', async () => {
    const deleted = await deleteSavedExpedition(mockExpedition.id);
    expect(deleted).toBe(true);

    const retrieved = await getSavedExpeditionById(mockExpedition.id);
    expect(retrieved).toBeNull();
  });

  it('stores and retrieves multi-source forecast cache entries', async () => {
    const cacheKey = 'test_cache_key_hash_999';
    const sources = ['open-meteo', 'ecmwf'];
    const mockForecasts = [{ routePoint: mockRoute.points[0], weather: { temp: 15 } }];
    const alerts: unknown[] = [];
    const agreementScore = 95;
    const availableSources = ['open-meteo', 'ecmwf', 'gfs'];

    await setCachedMultiSourceForecast(
      cacheKey,
      sources,
      mockForecasts,
      alerts,
      agreementScore,
      availableSources,
      60000 // 1 minute
    );

    const cached = await getCachedMultiSourceForecast(cacheKey);
    expect(cached).not.toBeNull();
    expect(cached?.cacheKey).toBe(cacheKey);
    expect(cached?.modelAgreementScore).toBe(95);
    expect(cached?.sources).toEqual(sources);
  });
});
