import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityPacePresets } from '../ActivityPacePresets';
import { AppSettings, Route } from '@/types';

describe('ActivityPacePresets', () => {
  const mockSettings: AppSettings = {
    startTime: new Date('2026-09-08T07:00:00.000Z'),
    averageSpeed: 15,
    forecastInterval: 5,
    units: 'metric',
    timezone: 'Europe/Paris',
  };

  const mockRoute: Route = {
    id: 'test-route',
    name: 'Alpine Pass Recon',
    points: [
      { lat: 45.0, lon: 6.0, distance: 0 },
      { lat: 45.1, lon: 6.1, distance: 30 },
    ],
    totalDistance: 30,
    totalElevationGain: 1200,
    estimatedDuration: 2,
  };

  it('renders manual speed and interval input controls', () => {
    const onSettingsChange = jest.fn();
    render(
      <ActivityPacePresets
        settings={mockSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    // Speed input exists with value 15
    const speedInput = screen.getByDisplayValue('15');
    expect(speedInput).toBeInTheDocument();

    // Interval input exists with value 5
    const intervalInput = screen.getByDisplayValue('5');
    expect(intervalInput).toBeInTheDocument();

    // Quick interval preset buttons exist
    expect(screen.getByText('2k')).toBeInTheDocument();
    expect(screen.getByText('5k')).toBeInTheDocument();
    expect(screen.getByText('10k')).toBeInTheDocument();
    expect(screen.getByText('15k')).toBeInTheDocument();
    expect(screen.getByText('25k')).toBeInTheDocument();
  });

  it('allows manual numerical input for speed', () => {
    const onSettingsChange = jest.fn();
    render(
      <ActivityPacePresets
        settings={mockSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const speedInput = screen.getByDisplayValue('15');
    fireEvent.change(speedInput, { target: { value: '22.5' } });

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        averageSpeed: 22.5,
      })
    );
  });

  it('allows manual numerical input for interval', () => {
    const onSettingsChange = jest.fn();
    render(
      <ActivityPacePresets
        settings={mockSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const intervalInput = screen.getByDisplayValue('5');
    fireEvent.change(intervalInput, { target: { value: '3' } });

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        forecastInterval: 3,
      })
    );
  });

  it('increments and decrements speed via steppers', () => {
    const onSettingsChange = jest.fn();
    render(
      <ActivityPacePresets
        settings={mockSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const decreaseSpeedBtn = screen.getByTitle('Decrease speed by 0.5 km/h');
    const increaseSpeedBtn = screen.getByTitle('Increase speed by 0.5 km/h');

    fireEvent.click(increaseSpeedBtn);
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        averageSpeed: 15.5,
      })
    );

    fireEvent.click(decreaseSpeedBtn);
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        averageSpeed: 14.5,
      })
    );
  });

  it('increments and decrements interval via steppers', () => {
    const onSettingsChange = jest.fn();
    render(
      <ActivityPacePresets
        settings={mockSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const decreaseIntervalBtn = screen.getByTitle('Decrease interval by 1 km');
    const increaseIntervalBtn = screen.getByTitle('Increase interval by 1 km');

    fireEvent.click(increaseIntervalBtn);
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        forecastInterval: 6,
      })
    );

    fireEvent.click(decreaseIntervalBtn);
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        forecastInterval: 4,
      })
    );
  });

  it('updates interval when quick preset button is clicked', () => {
    const onSettingsChange = jest.fn();
    render(
      <ActivityPacePresets
        settings={mockSettings}
        onSettingsChange={onSettingsChange}
      />
    );

    const preset10k = screen.getByText('10k');
    fireEvent.click(preset10k);

    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        forecastInterval: 10,
      })
    );
  });

  it('displays estimated route duration and sampling points when route is loaded', () => {
    const onSettingsChange = jest.fn();
    render(
      <ActivityPacePresets
        settings={mockSettings}
        onSettingsChange={onSettingsChange}
        route={mockRoute}
      />
    );

    // 30 km / 15 km/h = 2h 00m
    expect(screen.getByText('2h 00m')).toBeInTheDocument();
    // 30 km / 5 km interval + 1 = 7 points
    expect(screen.getByText('7 points')).toBeInTheDocument();
  });
});
