'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
    icon: 'text-[#ff7b54]',
    gradient: 'from-[#ff7b54]/10 to-transparent',
    border: 'border-[#ff7b54]/30'
  },
  blue: {
    icon: 'text-[#E5A93C]',
    gradient: 'from-[#E5A93C]/10 to-transparent',
    border: 'border-[#E5A93C]/30'
  },
  green: {
    icon: 'text-[#82937D]',
    gradient: 'from-[#82937D]/10 to-transparent',
    border: 'border-[#82937D]/30'
  },
  yellow: {
    icon: 'text-[#E5A93C]',
    gradient: 'from-[#E5A93C]/15 to-transparent',
    border: 'border-[#E5A93C]/40'
  },
  purple: {
    icon: 'text-[#c678dd]',
    gradient: 'from-[#c678dd]/10 to-transparent',
    border: 'border-[#c678dd]/30'
  },
  gray: {
    icon: 'text-[#A89F91]',
    gradient: 'from-[#453A2E]/20 to-transparent',
    border: 'border-[#453A2E]'
  }
};

const trendIcons = {
  up: <TrendingUp className="h-3 w-3" />,
  down: <TrendingDown className="h-3 w-3" />,
  neutral: <Minus className="h-3 w-3" />
};

const trendColors = {
  up: 'text-[#82937D]',
  down: 'text-[#ff7b54]',
  neutral: 'text-[#A89F91]'
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
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-[#1C1814] transition-all duration-300 font-mono",
        colorConfig.border,
        onClick && "cursor-pointer hover:border-[#E5A93C] hover:shadow-[0_0_15px_rgba(229,169,60,0.15)]",
        className
      )}
      onClick={onClick}
      style={style}
    >
      {/* Gradient Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none",
        colorConfig.gradient
      )} />
      
      <div className="relative p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn("shrink-0", colorConfig.icon)}>
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider text-[#A89F91] truncate">
                {label}
              </p>
              <p className="text-xl font-bold text-[#F5F2EB] mt-0.5">
                {value}
              </p>
            </div>
          </div>
        </div>
        
        {trend && (
          <div className="mt-2.5 flex items-center justify-between text-[10px]">
            <div className={cn(
              "flex items-center space-x-1",
              trendColors[trendDirection]
            )}>
              {trendIcons[trendDirection]}
              <span>{trend}</span>
            </div>
          </div>
        )}
      </div>
    </div>
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
