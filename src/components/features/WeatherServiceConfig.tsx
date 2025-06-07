"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cloud, 
  Zap, 
  Shield, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Info,
  Settings
} from 'lucide-react';

interface WeatherServiceInfo {
  id: string;
  name: string;
  description: string;
  features: {
    free: boolean;
    apiKeyRequired: boolean;
    requestsPerDay: number;
    accuracy: 'high' | 'medium' | 'low';
    coverage: 'global' | 'regional';
  };
  pros: string[];
  cons: string[];
  status: 'active' | 'available' | 'unavailable';
}

const weatherServices: WeatherServiceInfo[] = [
  {
    id: 'open-meteo',
    name: 'Open-Meteo',
    description: 'Free, open-source weather API with excellent accuracy and no API key required.',
    features: {
      free: true,
      apiKeyRequired: false,
      requestsPerDay: 10000,
      accuracy: 'high',
      coverage: 'global'
    },
    pros: [
      'Completely free',
      'No API key required',
      'Open source',
      'High accuracy',
      'Generous rate limits',
      'Real-time data'
    ],
    cons: [
      'Newer service',
      'Limited historical data'
    ],
    status: 'active'
  },
  {
    id: 'openweathermap',
    name: 'OpenWeatherMap',
    description: 'Popular weather service with comprehensive data but requires API key and has usage limits.',
    features: {
      free: false,
      apiKeyRequired: true,
      requestsPerDay: 1000,
      accuracy: 'high',
      coverage: 'global'
    },
    pros: [
      'Established service',
      'Comprehensive data',
      'Historical data available',
      'Multiple data formats'
    ],
    cons: [
      'Requires API key',
      'Limited free tier',
      'Rate limits',
      'Credit card required for free tier'
    ],
    status: process.env.OPENWEATHER_API_KEY ? 'available' : 'unavailable'
  }
];

interface WeatherServiceConfigProps {
  className?: string;
  onServiceChange?: (serviceId: string) => void;
}

export function WeatherServiceConfig({ className, onServiceChange }: WeatherServiceConfigProps) {
  const [selectedService, setSelectedService] = useState('open-meteo');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem('forecaster-weather-service');
    if (saved && weatherServices.find(s => s.id === saved)) {
      setSelectedService(saved);
    }
  }, []);

  const handleServiceChange = async (serviceId: string) => {
    setIsLoading(true);
    try {
      setSelectedService(serviceId);
      localStorage.setItem('forecaster-weather-service', serviceId);
      onServiceChange?.(serviceId);
    } catch (error) {
      console.error('Error changing weather service:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentService = weatherServices.find(s => s.id === selectedService);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Weather Service Configuration
        </CardTitle>
        <CardDescription>
          Choose your preferred weather data provider
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Weather Service</label>
          <Select value={selectedService} onValueChange={handleServiceChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder="Select weather service" />
            </SelectTrigger>
            <SelectContent>
              {weatherServices.map((service) => (
                <SelectItem 
                  key={service.id} 
                  value={service.id}
                  disabled={service.status === 'unavailable'}
                >
                  <div className="flex items-center gap-2">
                    <span>{service.name}</span>
                    {service.status === 'active' && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                    {service.status === 'unavailable' && (
                      <Badge variant="destructive" className="text-xs">Unavailable</Badge>
                    )}
                    {service.features.free && (
                      <Badge variant="secondary" className="text-xs">Free</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Service Info */}
        {currentService && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    {currentService.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentService.description}
                  </p>
                </div>
                <Badge 
                  variant={currentService.status === 'active' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  {currentService.status}
                </Badge>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className={`h-4 w-4 ${currentService.features.free ? 'text-green-500' : 'text-red-500'}`} />
                  <span>{currentService.features.free ? 'Free' : 'Paid'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className={`h-4 w-4 ${!currentService.features.apiKeyRequired ? 'text-green-500' : 'text-yellow-500'}`} />
                  <span>{currentService.features.apiKeyRequired ? 'API Key' : 'No Key'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>{currentService.features.requestsPerDay.toLocaleString()}/day</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className={`h-4 w-4 ${
                    currentService.features.accuracy === 'high' ? 'text-green-500' : 
                    currentService.features.accuracy === 'medium' ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                  <span className="capitalize">{currentService.features.accuracy}</span>
                </div>
              </div>

              {/* Pros and Cons */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Advantages</h4>
                  <ul className="text-sm space-y-1">
                    {currentService.pros.map((pro, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">Considerations</h4>
                  <ul className="text-sm space-y-1">
                    {currentService.cons.map((con, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <AlertCircle className="h-3 w-3 text-orange-500 shrink-0" />
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Service-specific alerts */}
            {currentService.id === 'open-meteo' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommended:</strong> Open-Meteo is now the default service for Forecaster. 
                  It provides excellent accuracy without requiring an API key and has very generous rate limits.
                </AlertDescription>
              </Alert>
            )}

            {currentService.id === 'openweathermap' && currentService.status === 'unavailable' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>API Key Required:</strong> To use OpenWeatherMap, you need to set the 
                  OPENWEATHER_API_KEY environment variable. Consider using Open-Meteo instead for a free alternative.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Migration Notice */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Service Migration:</strong> Forecaster now supports multiple weather services. 
            Your weather data cache will be preserved when switching services.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
