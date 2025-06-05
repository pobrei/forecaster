"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, Clock, Gauge, MapPin } from 'lucide-react';
import { AppSettings } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';

interface SettingsPanelProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onGenerateForecast: () => void;
  isLoading?: boolean;
  hasRoute?: boolean;
  className?: string;
}

export function SettingsPanel({
  settings,
  onSettingsChange,
  onGenerateForecast,
  isLoading = false,
  hasRoute = false,
  className
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [useManualSpeed, setUseManualSpeed] = useState(false);
  const [manualSpeed, setManualSpeed] = useState(settings.averageSpeed.toString());

  useEffect(() => {
    setLocalSettings(settings);
    setManualSpeed(settings.averageSpeed.toString());
  }, [settings]);

  const handleSettingChange = (key: keyof AppSettings, value: string | number | Date) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleStartTimeChange = (value: string) => {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      handleSettingChange('startTime', date);
    }
  };

  const handleManualSpeedChange = (value: string) => {
    setManualSpeed(value);
    const speed = parseFloat(value);
    if (!isNaN(speed) && speed > 0 && speed <= 100) {
      handleSettingChange('averageSpeed', speed);
    }
  };

  const handleSpeedModeToggle = (manual: boolean) => {
    setUseManualSpeed(manual);
    if (!manual) {
      // Reset to a preset value when switching back to preset mode
      const defaultSpeed = speedOptions.find(option => option.value === localSettings.averageSpeed)?.value || speedOptions[2].value;
      handleSettingChange('averageSpeed', defaultSpeed);
      setManualSpeed(defaultSpeed.toString());
    }
  };

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getNextHour = (): Date => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now;
  };

  const speedOptions = [
    { value: 5, label: '5 km/h (Walking)' },
    { value: 10, label: '10 km/h (Hiking)' },
    { value: 15, label: '15 km/h (Cycling)' },
    { value: 20, label: '20 km/h (Fast Cycling)' },
    { value: 25, label: '25 km/h (Road Cycling)' },
    { value: 30, label: '30 km/h (E-bike)' },
  ];

  const intervalOptions = [
    { value: 1, label: '1 km (Detailed)' },
    { value: 2, label: '2 km' },
    { value: 5, label: '5 km (Balanced)' },
    { value: 10, label: '10 km' },
    { value: 20, label: '20 km (Overview)' },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Forecast Settings
        </CardTitle>
        <CardDescription>
          Configure your route parameters and forecast preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Start Time */}
        <div className="space-y-2">
          <Label htmlFor="start-time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Start Time
          </Label>
          <Input
            id="start-time"
            type="datetime-local"
            value={formatDateTimeLocal(localSettings.startTime)}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            min={formatDateTimeLocal(new Date())}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            When you plan to start your activity
          </p>
        </div>

        {/* Average Speed */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Average Speed
          </Label>

          {/* Speed Mode Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="manual-speed-toggle" className="text-sm font-normal">
              Manual Speed Input
            </Label>
            <Switch
              id="manual-speed-toggle"
              checked={useManualSpeed}
              onCheckedChange={handleSpeedModeToggle}
              disabled={isLoading}
            />
          </div>

          {/* Speed Input */}
          {useManualSpeed ? (
            <div className="space-y-2">
              <Input
                type="number"
                value={manualSpeed}
                onChange={(e) => handleManualSpeedChange(e.target.value)}
                placeholder="Enter speed"
                min="0.1"
                max="100"
                step="0.1"
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Enter your custom average speed (0.1 - 100 km/h)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Select
                value={localSettings.averageSpeed.toString()}
                onValueChange={(value) => handleSettingChange('averageSpeed', parseInt(value))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select speed" />
                </SelectTrigger>
                <SelectContent>
                  {speedOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose from preset activity speeds
              </p>
            </div>
          )}
        </div>

        {/* Forecast Interval */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Forecast Interval
          </Label>
          <Select
            value={localSettings.forecastInterval.toString()}
            onValueChange={(value) => handleSettingChange('forecastInterval', parseInt(value))}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              {intervalOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Distance between weather forecast points
          </p>
        </div>

        {/* Units */}
        <div className="space-y-2">
          <Label>Units</Label>
          <Select
            value={localSettings.units}
            onValueChange={(value: 'metric' | 'imperial') => handleSettingChange('units', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metric">Metric (°C, km/h, km)</SelectItem>
              <SelectItem value="imperial">Imperial (°F, mph, mi)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 pt-4 border-t">
          <Button
            onClick={() => handleSettingChange('startTime', getNextHour())}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="w-full"
          >
            Set Start Time to Next Hour
          </Button>
          
          <Button
            onClick={() => {
              handleSettingChange('averageSpeed', ROUTE_CONFIG.DEFAULT_SPEED);
              handleSettingChange('forecastInterval', ROUTE_CONFIG.DEFAULT_INTERVAL);
            }}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="w-full"
          >
            Reset to Defaults
          </Button>
        </div>

        {/* Generate Forecast Button */}
        <Button
          onClick={onGenerateForecast}
          disabled={!hasRoute || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Generating Forecast...' : 'Generate Weather Forecast'}
        </Button>

        {!hasRoute && (
          <p className="text-xs text-muted-foreground text-center">
            Upload a GPX file first to generate weather forecasts
          </p>
        )}

        {/* Settings Summary */}
        {hasRoute && (
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
            <p><strong>Start:</strong> {formatDateTime(localSettings.startTime)}</p>
            <p><strong>Speed:</strong> {localSettings.averageSpeed} km/h</p>
            <p><strong>Interval:</strong> {localSettings.forecastInterval} km</p>
            <p><strong>Units:</strong> {localSettings.units}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
