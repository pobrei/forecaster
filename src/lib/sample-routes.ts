import { Route, RoutePoint } from '@/types';

export interface SampleRoutePreset {
  id: string;
  title: string;
  subtitle: string;
  region: string;
  tag: string;
  distanceKm: number;
  elevationGainM: number;
  route: Route;
}

function generateRoutePoints(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  baseElevation: number,
  peakElevation: number,
  pointCount: number,
  totalDistKm: number
): RoutePoint[] {
  const points: RoutePoint[] = [];

  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1);
    // Smooth arc trajectory
    const lat = startLat + (endLat - startLat) * t + Math.sin(t * Math.PI) * 0.035;
    const lon = startLon + (endLon - startLon) * t + Math.sin(t * Math.PI * 2) * 0.02;
    // Parabolic ridge elevation profile
    const elevation = Math.round(
      baseElevation + (peakElevation - baseElevation) * Math.sin(t * Math.PI) + Math.sin(t * 12) * 45
    );
    const distance = parseFloat(((totalDistKm * i) / (pointCount - 1)).toFixed(1));

    points.push({
      lat: parseFloat(lat.toFixed(5)),
      lon: parseFloat(lon.toFixed(5)),
      elevation,
      distance,
      estimatedTime: new Date(Date.now() + i * 20 * 60 * 1000),
    });
  }

  return points;
}

export function createAlpine45KmSampleRoute(): Route {
  const startLat = 46.8680;
  const startLon = 8.6450;
  const endLat = 46.8720;
  const endLon = 8.9480;
  const totalDistance = 45.0;
  const totalElevationGain = 1850;
  const pointCount = 28;
  const points: RoutePoint[] = [];

  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1);
    const lat = startLat + (endLat - startLat) * t + Math.sin(t * Math.PI * 2) * 0.024;
    const lon = startLon + (endLon - startLon) * t + Math.cos(t * Math.PI) * 0.015;
    
    // Klausen Pass summit (2,165m)
    const elevation = Math.round(
      920 + (2165 - 920) * Math.sin(t * Math.PI) + Math.sin(t * 14) * 35
    );

    points.push({
      lat: parseFloat(lat.toFixed(5)),
      lon: parseFloat(lon.toFixed(5)),
      elevation,
      distance: parseFloat((totalDistance * t).toFixed(1)),
      estimatedTime: new Date(Date.now() + i * 15 * 60 * 1000),
    });
  }

  return {
    id: `alpine-45km-${Date.now()}`,
    name: 'Swiss Alps Klausen Pass Traverse (45km)',
    totalDistance,
    totalElevationGain,
    estimatedDuration: 3.5,
    points,
  };
}

export const SAMPLE_EXPEDITIONS: SampleRoutePreset[] = [
  {
    id: 'exp-alpine-45km',
    title: 'Swiss Alps Klausen Pass',
    subtitle: 'Altdorf to Linthal via Klausenpass (2,165m)',
    region: 'Central Swiss Alps, Uri/Glarus',
    tag: 'ALPINE SUMMIT // 45.0 KM',
    distanceKm: 45.0,
    elevationGainM: 1850,
    route: createAlpine45KmSampleRoute(),
  },
  {
    id: 'exp-dolomites',
    title: 'Dolomites Alta Via',
    subtitle: 'Tre Cime di Lavaredo & Cristallo',
    region: 'Italian Alps, Trentino',
    tag: 'HIGH ALPINE // 28.5 KM',
    distanceKm: 28.5,
    elevationGainM: 1450,
    route: {
      id: 'sample-dolomites',
      name: 'Dolomites Alta Via — Tre Cime Pass',
      totalDistance: 28.5,
      totalElevationGain: 1450,
      estimatedDuration: 6.5,
      points: generateRoutePoints(46.618, 12.285, 46.545, 12.365, 1850, 2450, 20, 28.5),
    },
  },
  {
    id: 'exp-montblanc',
    title: 'Mont Blanc Alpine Ridge',
    subtitle: 'Chamonix to Val Ferret',
    region: 'Haute-Savoie, France / Italy',
    tag: 'GLACIER RIDGELINE // 36.2 KM',
    distanceKm: 36.2,
    elevationGainM: 2180,
    route: {
      id: 'sample-montblanc',
      name: 'Mont Blanc High Traverse',
      totalDistance: 36.2,
      totalElevationGain: 2180,
      estimatedDuration: 8.2,
      points: generateRoutePoints(45.923, 6.869, 45.832, 7.015, 1200, 2680, 24, 36.2),
    },
  },
  {
    id: 'exp-sierra',
    title: 'Pacific Crest Sierra Pass',
    subtitle: 'John Muir Wilderness & Mammoth Crest',
    region: 'Sierra Nevada, California',
    tag: 'HIGH DESERT RIDGE // 42.0 KM',
    distanceKm: 42.0,
    elevationGainM: 1680,
    route: {
      id: 'sample-sierra',
      name: 'Pacific Crest Sierra Ridge',
      totalDistance: 42.0,
      totalElevationGain: 1680,
      estimatedDuration: 9.0,
      points: generateRoutePoints(37.648, -119.032, 37.495, -118.885, 2400, 3350, 25, 42.0),
    },
  },
];
