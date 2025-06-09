'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const colorVariants = {
  red: {
    icon: 'text-red-500',
    gradient: 'from-red-50 to-red-100 dark:from-red-950 dark:to-red-900',
    border: 'border-red-200 dark:border-red-800'
  },
  blue: {
    icon: 'text-blue-500',
    gradient: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
    border: 'border-blue-200 dark:border-blue-800'
  },
  green: {
    icon: 'text-green-500',
    gradient: 'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
    border: 'border-green-200 dark:border-green-800'
  },
  yellow: {
    icon: 'text-yellow-500',
    gradient: 'from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900',
    border: 'border-yellow-200 dark:border-yellow-800'
  },
  purple: {
    icon: 'text-purple-500',
    gradient: 'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
    border: 'border-purple-200 dark:border-purple-800'
  },
  gray: {
    icon: 'text-gray-500',
    gradient: 'from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900',
    border: 'border-gray-200 dark:border-gray-800'
  }
};

const trendIcons = {
  up: <TrendingUp className="h-3 w-3" />,
  down: <TrendingDown className="h-3 w-3" />,
  neutral: <Minus className="h-3 w-3" />
};

const trendColors = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-600 dark:text-gray-400'
};

export function MetricCard({
  icon,
  label,
  value,
  trend,
  trendDirection = 'neutral',
  color = 'gray',
  className,
  onClick,
  style
}: MetricCardProps) {
  const colorConfig = colorVariants[color];
  
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        colorConfig.border,
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
      style={style}
    >
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        colorConfig.gradient
      )} />
      
      <CardContent className="relative p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("flex-shrink-0", colorConfig.icon)}>
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {label}
              </p>
              <p className="text-2xl font-bold text-foreground">
                {value}
              </p>
            </div>
          </div>
        </div>
        
        {trend && (
          <div className="mt-3 flex items-center justify-between">
            <div className={cn(
              "flex items-center space-x-1 text-xs",
              trendColors[trendDirection]
            )}>
              {trendIcons[trendDirection]}
              <span>{trend}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricGridProps {
  metrics: Array<Omit<MetricCardProps, 'className'>>;
  className?: string;
}

export function MetricGrid({ metrics, className }: MetricGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
      className
    )}>
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          {...metric}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        />
      ))}
    </div>
  );
}
