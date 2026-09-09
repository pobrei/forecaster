import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelComparisonSuite } from '../ModelComparisonSuite';
import { ModelDivergenceRibbon } from '../ModelDivergenceRibbon';
import { Route, WeatherForecast } from '@/types';
import { 
  MultiSourceWeatherForecast, 
  DEFAULT_WEATHER_SOURCE_PREFERENCES,
  WeatherProviderId 
} from '@/types/weather-sources';

const mockRoute: Route = {
  id: 'route-test-1',
  name: 'Alpine Test Pass',
  totalDistance: 25.0,
  totalElevationGain: 1200,
  points: [
    { lat: 46.5, lon: 8.5, elevation: 1200, distance: 0 },
    { lat: 46.6, lon: 8.6, elevation: 2400, distance: 12.5 },
    { lat: 46.7, lon: 8.7, elevation: 1600, distance: 25.0 },
  ],
};

const mockDryForecasts: WeatherForecast[] = [
  {
    routePoint: { lat: 46.5, lon: 8.5, elevation: 1200, distance: 0 },
    weather: {
      lat: 46.5,
      lon: 8.5,
      dt: 1717200000,
      temp: 18,
      feels_like: 18,
      pressure: 1015,
      humidity: 45,
      dew_point: 5,
      uvi: 5,
      clouds: 10,
      visibility: 10000,
      wind_speed: 4.5,
      wind_deg: 200,
      weather: [{ id: 800, main: 'Clear', description: 'Clear sky', icon: '01d' }],
      pop: 0,
      rain: undefined,
    },
  },
  {
    routePoint: { lat: 46.6, lon: 8.6, elevation: 2400, distance: 12.5 },
    weather: {
      lat: 46.6,
      lon: 8.6,
      dt: 1717203600,
      temp: 10,
      feels_like: 9,
      pressure: 1010,
      humidity: 50,
      dew_point: 0,
      uvi: 6,
      clouds: 15,
      visibility: 10000,
      wind_speed: 8.0,
      wind_deg: 220,
      weather: [{ id: 800, main: 'Clear', description: 'Clear sky', icon: '01d' }],
      pop: 0,
      rain: undefined,
    },
  },
];

describe('Model Comparison Suite & Ribbon Precipitation Accuracy', () => {
  const defaultPrefs = {
    ...DEFAULT_WEATHER_SOURCE_PREFERENCES,
    primarySource: 'ecmwf' as const,
    enabledSources: ['ecmwf', 'gfs', 'icon', 'meteofrance'] as WeatherProviderId[],
  };

  it('renders 100% dry consensus badge and 0.0 mm/h on completely dry routes', () => {
    render(
      <ModelComparisonSuite
        route={mockRoute}
        forecasts={mockDryForecasts}
        preferences={defaultPrefs}
        onPreferencesChange={jest.fn()}
      />
    );

    // Switch to Precipitation metric
    const rainTab = screen.getByRole('button', { name: /precipitation/i });
    fireEvent.click(rainTab);

    // Expect dry route banner inside SVG
    expect(screen.getByText(/0.0 mm\/h • 100% DRY CONSENSUS ACROSS ALL MODELS/i)).toBeInTheDocument();

    // Expect precipitation consensus text to confirm 0.0 mm/h and 0% risk
    expect(screen.getByText(/All active supercomputers agree on dry, stable conditions across the entire route \(0\.0 mm\/h, 0% rain risk\)/i)).toBeInTheDocument();
  });

  it('displays real multi-source precipitation data when available', () => {
    const mockMultiSource: MultiSourceWeatherForecast[] = [
      {
        routePoint: { lat: 46.5, lon: 8.5, elevation: 1200, distance: 0 },
        primaryWeather: {
          lat: 46.5,
          lon: 8.5,
          dt: 1717200000,
          temp: 18,
          feels_like: 18,
          pressure: 1015,
          humidity: 60,
          dew_point: 8,
          uvi: 4,
          clouds: 40,
          visibility: 10000,
          wind_speed: 4.0,
          wind_deg: 180,
          weather: [{ id: 500, main: 'Rain', description: 'Light rain', icon: '10d' }],
          source: 'ecmwf',
          sourceName: 'ECMWF IFS',
          fetchedAt: new Date(),
        },
        multiSourceData: {
          lat: 46.5,
          lon: 8.5,
          timestamp: new Date(),
          sources: [
            {
              lat: 46.5,
              lon: 8.5,
              dt: 1717200000,
              temp: 18,
              feels_like: 18,
              pressure: 1015,
              humidity: 60,
              dew_point: 8,
              uvi: 4,
              clouds: 40,
              visibility: 10000,
              wind_speed: 4.0,
              wind_deg: 180,
              weather: [{ id: 500, main: 'Rain', description: 'Light rain', icon: '10d' }],
              rain: { '1h': 1.5 },
              pop: 0.75,
              source: 'ecmwf',
              sourceName: 'ECMWF IFS',
              fetchedAt: new Date(),
            },
            {
              lat: 46.5,
              lon: 8.5,
              dt: 1717200000,
              temp: 19,
              feels_like: 19,
              pressure: 1014,
              humidity: 65,
              dew_point: 9,
              uvi: 4,
              clouds: 50,
              visibility: 10000,
              wind_speed: 5.0,
              wind_deg: 190,
              weather: [{ id: 500, main: 'Rain', description: 'Moderate rain', icon: '10d' }],
              rain: { '1h': 2.4 },
              pop: 0.85,
              source: 'gfs',
              sourceName: 'NOAA GFS',
              fetchedAt: new Date(),
            },
          ],
        },
      },
    ];

    render(
      <ModelComparisonSuite
        route={mockRoute}
        forecasts={mockDryForecasts}
        multiSourceForecasts={mockMultiSource}
        preferences={defaultPrefs}
        onPreferencesChange={jest.fn()}
      />
    );

    // Switch to Precipitation metric
    const rainTab = screen.getByRole('button', { name: /precipitation/i });
    fireEvent.click(rainTab);

    // Should show real precipitation numbers in table and hover strip
    expect(screen.getAllByText(/1\.5 mm\/h/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/2\.4 mm\/h/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/75%/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/85%/i).length).toBeGreaterThanOrEqual(1);
  });

  it('ModelDivergenceRibbon reports 0% rain risk when forecasts have no rain', () => {
    render(
      <ModelDivergenceRibbon
        forecasts={mockDryForecasts}
        onOpenComparison={jest.fn()}
      />
    );

    // Click header to expand table
    const header = screen.getByText(/MODEL CONSENSUS/i);
    fireEvent.click(header);

    // Verify all 4 models show 0%
    const zeros = screen.getAllByText('0%');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });
});
