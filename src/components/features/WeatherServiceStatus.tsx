"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Cloud, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Zap,
  DollarSign,
  Shield
} from 'lucide-react';
// Note: We'll get service info via API to avoid importing server-side modules

interface WeatherServiceStatusProps {
  className?: string;
}

export function WeatherServiceStatus({ className }: WeatherServiceStatusProps) {
  const [currentService, setCurrentService] = useState<string>('');
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const updateServiceInfo = async () => {
    setIsLoading(true);
    try {
      // Get service info from API to avoid client-side MongoDB imports
      const response = await fetch('/api/weather-service-status');
      const data = await response.json();

      if (data.success) {
        setCurrentService(data.data.name);
        setServiceInfo({
          name: data.data.name,
          limits: data.data.limits,
          features: getServiceFeatures(data.data.name)
        });
      } else {
        // Fallback to default info
        setCurrentService('Open-Meteo');
        setServiceInfo({
          name: 'Open-Meteo',
          limits: { requestsPerDay: 10000, requestsPerMinute: 600 },
          features: getServiceFeatures('Open-Meteo')
        });
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error getting service info:', error);
      // Fallback to default info
      setCurrentService('Open-Meteo');
      setServiceInfo({
        name: 'Open-Meteo',
        limits: { requestsPerDay: 10000, requestsPerMinute: 600 },
        features: getServiceFeatures('Open-Meteo')
      });
      setLastUpdate(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceFeatures = (serviceName: string) => {
    switch (serviceName) {
      case 'Open-Meteo':
        return {
          free: true,
          apiKeyRequired: false,
          openSource: true,
          accuracy: 'high'
        };
      case 'OpenWeatherMap':
        return {
          free: false,
          apiKeyRequired: true,
          openSource: false,
          accuracy: 'high'
        };
      default:
        return {
          free: true,
          apiKeyRequired: false,
          openSource: false,
          accuracy: 'medium'
        };
    }
  };

  useEffect(() => {
    updateServiceInfo();
    
    // Update every 30 seconds
    const interval = setInterval(updateServiceInfo, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (!serviceInfo) {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading service status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{serviceInfo.name}</span>
              <CheckCircle className="h-3 w-3 text-green-500" />
            </div>
            
            <div className="flex items-center gap-1">
              {serviceInfo.features.free && (
                <Badge variant="secondary" className="text-xs h-5">
                  <DollarSign className="h-2 w-2 mr-1" />
                  Free
                </Badge>
              )}
              {!serviceInfo.features.apiKeyRequired && (
                <Badge variant="outline" className="text-xs h-5">
                  <Shield className="h-2 w-2 mr-1" />
                  No Key
                </Badge>
              )}
              {serviceInfo.features.openSource && (
                <Badge variant="outline" className="text-xs h-5">
                  Open Source
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {serviceInfo.limits.requestsPerDay.toLocaleString()}/day
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={updateServiceInfo}
              disabled={isLoading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-1">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
