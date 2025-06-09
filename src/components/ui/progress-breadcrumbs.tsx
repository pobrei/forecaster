'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Upload, Cloud, BarChart3 } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
  active: boolean;
}

interface ProgressBreadcrumbsProps {
  hasGpxData: boolean;
  hasWeatherData: boolean;
  className?: string;
}

export function ProgressBreadcrumbs({
  hasGpxData,
  hasWeatherData,
  className
}: ProgressBreadcrumbsProps) {
  const steps: Step[] = [
    {
      id: 'upload',
      title: 'Upload GPX',
      description: 'Select your route file',
      icon: <Upload className="h-5 w-5" />,
      completed: hasGpxData,
      active: !hasGpxData
    },
    {
      id: 'weather',
      title: 'Generate Weather',
      description: 'Fetch weather data',
      icon: <Cloud className="h-5 w-5" />,
      completed: hasWeatherData,
      active: hasGpxData && !hasWeatherData
    },
    {
      id: 'analyze',
      title: 'Analyze Results',
      description: 'View charts and insights',
      icon: <BarChart3 className="h-5 w-5" />,
      completed: hasWeatherData,
      active: hasWeatherData
    }
  ];

  return (
    <div className={cn("flex items-center justify-center mb-8", className)}>
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              {/* Step Circle */}
              <div
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300",
                  step.completed
                    ? "bg-primary border-primary text-primary-foreground"
                    : step.active
                    ? "bg-primary/10 border-primary text-primary animate-pulse"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {step.completed ? (
                  <Check className="h-6 w-6" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Step Content */}
              <div className="ml-3 hidden sm:block">
                <div
                  className={cn(
                    "text-sm font-medium transition-colors",
                    step.completed || step.active
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {step.description}
                </div>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 transition-colors duration-300",
                  steps[index + 1].completed || steps[index + 1].active
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
