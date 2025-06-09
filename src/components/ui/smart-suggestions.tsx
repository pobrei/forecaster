'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Lightbulb, 
  Clock, 
  AlertTriangle, 
  Umbrella, 
  Wind,
  Thermometer,
  X
} from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'timing' | 'weather' | 'safety' | 'equipment' | 'route';
  title: string;
  description: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
  dismissible?: boolean;
}

interface SmartSuggestionsProps {
  suggestions: Suggestion[];
  onApplySuggestion?: (suggestion: Suggestion) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
  className?: string;
}

const suggestionConfigs = {
  timing: {
    icon: Clock,
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  weather: {
    icon: Umbrella,
    color: 'purple',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  safety: {
    icon: AlertTriangle,
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400'
  },
  equipment: {
    icon: Wind,
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  route: {
    icon: Thermometer,
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
    iconColor: 'text-orange-600 dark:text-orange-400'
  }
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
};

export function SmartSuggestions({
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  className
}: SmartSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {suggestions.map((suggestion) => {
        const config = suggestionConfigs[suggestion.type];
        const IconComponent = config.icon;
        
        return (
          <Card
            key={suggestion.id}
            className={cn(
              "relative overflow-hidden transition-all duration-300 hover:shadow-md",
              config.borderColor,
              config.bgColor
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg bg-background/50",
                    config.iconColor
                  )}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Suggestion</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", priorityColors[suggestion.priority])}
                    >
                      {suggestion.priority}
                    </Badge>
                  </div>
                </div>
                
                {suggestion.dismissible && onDismissSuggestion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismissSuggestion(suggestion.id)}
                    className="h-8 w-8 p-0 hover:bg-background/50"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss suggestion</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    {suggestion.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
                
                {suggestion.action && onApplySuggestion && (
                  <Button
                    onClick={() => onApplySuggestion(suggestion)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {suggestion.action}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Helper function to generate weather-based suggestions
export function generateWeatherSuggestions(forecasts: any[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  if (!forecasts || forecasts.length === 0) {
    return suggestions;
  }

  // Check for rain
  const rainForecasts = forecasts.filter(f => f.weather.precipitation > 0);
  if (rainForecasts.length > 0) {
    suggestions.push({
      id: 'rain-warning',
      type: 'weather',
      title: 'Rain Expected',
      description: `Rain is forecasted for ${rainForecasts.length} points along your route. Consider bringing waterproof gear.`,
      action: 'View Rain Details',
      priority: 'medium',
      dismissible: true
    });
  }

  // Check for high winds
  const windyForecasts = forecasts.filter(f => f.weather.windSpeed > 20);
  if (windyForecasts.length > 0) {
    suggestions.push({
      id: 'wind-warning',
      type: 'safety',
      title: 'Strong Winds Detected',
      description: `Wind speeds above 20 km/h are expected. Exercise caution, especially in exposed areas.`,
      action: 'View Wind Details',
      priority: 'high',
      dismissible: true
    });
  }

  // Check for temperature extremes
  const hotForecasts = forecasts.filter(f => f.weather.temp > 30);
  const coldForecasts = forecasts.filter(f => f.weather.temp < 5);
  
  if (hotForecasts.length > 0) {
    suggestions.push({
      id: 'heat-warning',
      type: 'safety',
      title: 'High Temperatures',
      description: 'Temperatures above 30°C expected. Stay hydrated and consider starting earlier.',
      action: 'Adjust Start Time',
      priority: 'medium',
      dismissible: true
    });
  }

  if (coldForecasts.length > 0) {
    suggestions.push({
      id: 'cold-warning',
      type: 'equipment',
      title: 'Cold Weather',
      description: 'Temperatures below 5°C expected. Bring appropriate warm clothing.',
      action: 'Equipment Checklist',
      priority: 'medium',
      dismissible: true
    });
  }

  return suggestions;
}
