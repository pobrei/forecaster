"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Wind, 
  Droplets, 
  Thermometer,
  Eye,
  Activity,
  BarChart3,
  Zap,
  Target,
  Shield
} from 'lucide-react';
import { WeatherForecast } from '@/types';
import { formatTemperature, formatWindSpeed, formatPrecipitation } from '@/lib/format';

interface WeatherAnalyticsProps {
  forecasts: WeatherForecast[];
  units?: 'metric' | 'imperial';
  className?: string;
}

interface WeatherPattern {
  type: 'improving' | 'deteriorating' | 'stable' | 'variable';
  confidence: number;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

interface WeatherAlert {
  severity: 'low' | 'medium' | 'high';
  type: string;
  message: string;
  affectedPoints: number[];
  icon: React.ComponentType<any>;
}

interface WeatherInsight {
  category: string;
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
  icon: React.ComponentType<any>;
}

export function WeatherAnalytics({ 
  forecasts, 
  units = 'metric',
  className 
}: WeatherAnalyticsProps) {
  // Advanced weather pattern analysis
  const weatherPattern = useMemo((): WeatherPattern => {
    if (!forecasts || forecasts.length < 3) {
      return {
        type: 'stable',
        confidence: 0,
        description: 'Insufficient data for pattern analysis',
        icon: Activity,
        color: '#6b7280'
      };
    }

    const temps = forecasts.map(f => f.weather.temp);
    const winds = forecasts.map(f => f.weather.wind_speed);
    const precips = forecasts.map(f => (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0));
    
    // Calculate trends
    const tempTrend = (temps[temps.length - 1] - temps[0]) / temps.length;
    const windTrend = (winds[winds.length - 1] - winds[0]) / winds.length;
    const precipTrend = precips.reduce((sum, p) => sum + p, 0) / precips.length;
    
    // Calculate variability
    const tempVariability = Math.sqrt(temps.reduce((sum, t, i) => 
      sum + Math.pow(t - (temps[i - 1] || t), 2), 0) / temps.length);
    const windVariability = Math.sqrt(winds.reduce((sum, w, i) => 
      sum + Math.pow(w - (winds[i - 1] || w), 2), 0) / winds.length);

    // Determine pattern
    if (tempVariability > 5 || windVariability > 3) {
      return {
        type: 'variable',
        confidence: Math.min(90, tempVariability * 10 + windVariability * 15),
        description: 'Highly variable conditions with frequent changes',
        icon: Activity,
        color: '#f59e0b'
      };
    }

    if (tempTrend > 2 && windTrend < 1 && precipTrend < 0.5) {
      return {
        type: 'improving',
        confidence: Math.min(95, Math.abs(tempTrend) * 20 + (1 - precipTrend) * 30),
        description: 'Conditions improving with warmer temperatures and less precipitation',
        icon: TrendingUp,
        color: '#10b981'
      };
    }

    if (tempTrend < -2 || windTrend > 2 || precipTrend > 1) {
      return {
        type: 'deteriorating',
        confidence: Math.min(95, Math.abs(tempTrend) * 20 + windTrend * 15 + precipTrend * 25),
        description: 'Conditions deteriorating with potential for adverse weather',
        icon: TrendingDown,
        color: '#ef4444'
      };
    }

    return {
      type: 'stable',
      confidence: Math.max(60, 100 - tempVariability * 10 - windVariability * 15),
      description: 'Stable conditions with minimal variation expected',
      icon: CheckCircle,
      color: '#3b82f6'
    };
  }, [forecasts]);

  // Weather alerts analysis
  const weatherAlerts = useMemo((): WeatherAlert[] => {
    if (!forecasts || forecasts.length === 0) return [];

    const alerts: WeatherAlert[] = [];

    // High wind alert
    const highWindPoints = forecasts
      .map((f, i) => ({ index: i, speed: f.weather.wind_speed }))
      .filter(p => p.speed > (units === 'metric' ? 10 : 22)); // 10 m/s or 22 mph

    if (highWindPoints.length > 0) {
      alerts.push({
        severity: highWindPoints.some(p => p.speed > (units === 'metric' ? 15 : 33)) ? 'high' : 'medium',
        type: 'High Wind',
        message: `Strong winds detected at ${highWindPoints.length} point(s)`,
        affectedPoints: highWindPoints.map(p => p.index),
        icon: Wind
      });
    }

    // Heavy precipitation alert
    const heavyRainPoints = forecasts
      .map((f, i) => ({ 
        index: i, 
        precip: (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0) 
      }))
      .filter(p => p.precip > (units === 'metric' ? 5 : 0.2)); // 5mm or 0.2 inches

    if (heavyRainPoints.length > 0) {
      alerts.push({
        severity: heavyRainPoints.some(p => p.precip > (units === 'metric' ? 10 : 0.4)) ? 'high' : 'medium',
        type: 'Heavy Precipitation',
        message: `Significant precipitation expected at ${heavyRainPoints.length} point(s)`,
        affectedPoints: heavyRainPoints.map(p => p.index),
        icon: Droplets
      });
    }

    // Temperature extremes
    const temps = forecasts.map(f => f.weather.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const tempRange = maxTemp - minTemp;

    if (tempRange > (units === 'metric' ? 15 : 27)) { // 15°C or 27°F
      alerts.push({
        severity: tempRange > (units === 'metric' ? 25 : 45) ? 'high' : 'medium',
        type: 'Temperature Extremes',
        message: `Large temperature variation: ${formatTemperature(tempRange, units)} range`,
        affectedPoints: [],
        icon: Thermometer
      });
    }

    // Low visibility (if available)
    const lowVisPoints = forecasts
      .map((f, i) => ({ index: i, visibility: f.weather.visibility }))
      .filter(p => p.visibility && p.visibility < 5000); // Less than 5km

    if (lowVisPoints.length > 0) {
      alerts.push({
        severity: lowVisPoints.some(p => p.visibility && p.visibility < 1000) ? 'high' : 'medium',
        type: 'Low Visibility',
        message: `Reduced visibility at ${lowVisPoints.length} point(s)`,
        affectedPoints: lowVisPoints.map(p => p.index),
        icon: Eye
      });
    }

    return alerts;
  }, [forecasts, units]);

  // Weather insights
  const weatherInsights = useMemo((): WeatherInsight[] => {
    if (!forecasts || forecasts.length === 0) return [];

    const insights: WeatherInsight[] = [];

    // Temperature analysis
    const temps = forecasts.map(f => f.weather.temp);
    const avgTemp = temps.reduce((sum, t) => sum + t, 0) / temps.length;
    const tempTrend = temps.length > 1 ? temps[temps.length - 1] - temps[0] : 0;

    insights.push({
      category: 'Temperature',
      title: 'Average Temperature',
      value: formatTemperature(avgTemp, units),
      trend: tempTrend > 1 ? 'up' : tempTrend < -1 ? 'down' : 'stable',
      description: `${tempTrend > 1 ? 'Warming' : tempTrend < -1 ? 'Cooling' : 'Stable'} trend along route`,
      icon: Thermometer
    });

    // Wind analysis
    const winds = forecasts.map(f => f.weather.wind_speed);
    const maxWind = Math.max(...winds);
    const avgWind = winds.reduce((sum, w) => sum + w, 0) / winds.length;

    insights.push({
      category: 'Wind',
      title: 'Maximum Wind Speed',
      value: formatWindSpeed(maxWind, units),
      trend: maxWind > avgWind * 1.5 ? 'up' : 'stable',
      description: `Peak wind speed ${maxWind > avgWind * 1.5 ? 'significantly higher than average' : 'within normal range'}`,
      icon: Wind
    });

    // Precipitation analysis
    const precips = forecasts.map(f => (f.weather.rain?.['1h'] || 0) + (f.weather.snow?.['1h'] || 0));
    const totalPrecip = precips.reduce((sum, p) => sum + p, 0);
    const precipChance = (precips.filter(p => p > 0).length / precips.length) * 100;

    insights.push({
      category: 'Precipitation',
      title: 'Rain Probability',
      value: `${precipChance.toFixed(0)}%`,
      trend: precipChance > 50 ? 'up' : precipChance < 20 ? 'down' : 'stable',
      description: `${totalPrecip > 0 ? formatPrecipitation(totalPrecip, units) + ' total expected' : 'No precipitation expected'}`,
      icon: Droplets
    });

    // Comfort analysis
    const comfortScores = forecasts.map(f => {
      const tempScore = Math.max(0, 100 - Math.abs(f.weather.temp - (units === 'metric' ? 20 : 68)) * 5);
      const windScore = Math.max(0, 100 - f.weather.wind_speed * 10);
      const humidityScore = Math.max(0, 100 - Math.abs(f.weather.humidity - 50) * 2);
      return (tempScore + windScore + humidityScore) / 3;
    });
    const avgComfort = comfortScores.reduce((sum, s) => sum + s, 0) / comfortScores.length;

    insights.push({
      category: 'Comfort',
      title: 'Comfort Index',
      value: `${avgComfort.toFixed(0)}/100`,
      trend: avgComfort > 70 ? 'up' : avgComfort < 40 ? 'down' : 'stable',
      description: `${avgComfort > 70 ? 'Excellent' : avgComfort > 50 ? 'Good' : avgComfort > 30 ? 'Fair' : 'Poor'} conditions for outdoor activities`,
      icon: Target
    });

    return insights;
  }, [forecasts, units]);

  const getSeverityColor = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = (trend: WeatherInsight['trend']) => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Activity;
    }
  };

  if (!forecasts || forecasts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Weather Analytics
            <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
              PRO
            </Badge>
          </CardTitle>
          <CardDescription>
            Advanced weather pattern analysis and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No weather data available</p>
              <p className="text-sm">Generate forecasts to see advanced analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Weather Analytics
          <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
            PRO
          </Badge>
        </CardTitle>
        <CardDescription>
          Advanced weather pattern analysis and insights for {forecasts.length} data points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weather Pattern Analysis */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Pattern Analysis
          </h4>
          
          <div className="p-4 rounded-lg border" style={{ borderColor: weatherPattern.color + '40' }}>
            <div className="flex items-center gap-3 mb-3">
              <weatherPattern.icon 
                className="h-6 w-6" 
                style={{ color: weatherPattern.color }} 
              />
              <div>
                <h5 className="font-medium capitalize">{weatherPattern.type} Conditions</h5>
                <p className="text-sm text-muted-foreground">{weatherPattern.description}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Confidence Level</span>
                <span className="font-medium">{weatherPattern.confidence.toFixed(0)}%</span>
              </div>
              <Progress 
                value={weatherPattern.confidence} 
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* Weather Alerts */}
        {weatherAlerts.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Weather Alerts ({weatherAlerts.length})
            </h4>
            
            <div className="space-y-3">
              {weatherAlerts.map((alert, index) => (
                <div key={index} className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
                    <alert.icon className="h-5 w-5 mt-0.5 text-orange-600 dark:text-orange-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-sm">{alert.type}</h5>
                        <Badge variant="outline" className="text-xs">
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      {alert.affectedPoints.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Affected points: {alert.affectedPoints.map(p => p + 1).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weather Insights */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Key Insights
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weatherInsights.map((insight, index) => {
              const TrendIcon = getTrendIcon(insight.trend);
              
              return (
                <div key={index} className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 mb-2">
                    <insight.icon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{insight.title}</h5>
                      <p className="text-xs text-muted-foreground">{insight.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{insight.value}</div>
                      <TrendIcon className={`h-4 w-4 ml-auto ${
                        insight.trend === 'up' ? 'text-green-500' : 
                        insight.trend === 'down' ? 'text-red-500' : 
                        'text-gray-500'
                      }`} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-sm">Analytics Summary</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg">{forecasts.length}</div>
              <div className="text-muted-foreground">Data Points</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{weatherAlerts.length}</div>
              <div className="text-muted-foreground">Alerts</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg">{weatherPattern.confidence.toFixed(0)}%</div>
              <div className="text-muted-foreground">Confidence</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg capitalize">{weatherPattern.type}</div>
              <div className="text-muted-foreground">Pattern</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
