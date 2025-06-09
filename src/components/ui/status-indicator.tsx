'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Wifi, 
  WifiOff,
  Zap
} from 'lucide-react';

interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'pending' | 'online' | 'offline' | 'live';
  label: string;
  sublabel?: string;
  showIcon?: boolean;
  showPulse?: boolean;
  className?: string;
}

const statusConfigs = {
  success: {
    icon: CheckCircle,
    color: 'bg-green-500',
    textColor: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  warning: {
    icon: AlertCircle,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  error: {
    icon: XCircle,
    color: 'bg-red-500',
    textColor: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  pending: {
    icon: Clock,
    color: 'bg-blue-500',
    textColor: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  online: {
    icon: Wifi,
    color: 'bg-green-500',
    textColor: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  offline: {
    icon: WifiOff,
    color: 'bg-gray-500',
    textColor: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-50 dark:bg-gray-950',
    borderColor: 'border-gray-200 dark:border-gray-800'
  },
  live: {
    icon: Zap,
    color: 'bg-green-500',
    textColor: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800'
  }
};

export function StatusIndicator({
  status,
  label,
  sublabel,
  showIcon = true,
  showPulse = false,
  className
}: StatusIndicatorProps) {
  const config = statusConfigs[status];
  const IconComponent = config.icon;
  
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
      config.bgColor,
      config.borderColor,
      className
    )}>
      {showIcon && (
        <div className="flex items-center gap-1">
          <div className={cn(
            "w-2 h-2 rounded-full",
            config.color,
            showPulse && "animate-pulse"
          )} />
          <IconComponent className={cn("h-4 w-4", config.textColor)} />
        </div>
      )}
      
      <div className="flex flex-col">
        <span className={cn("text-sm font-medium", config.textColor)}>
          {label}
        </span>
        {sublabel && (
          <span className="text-xs text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'pending' | 'live';
  children: React.ReactNode;
  showPulse?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  children,
  showPulse = false,
  className
}: StatusBadgeProps) {
  const config = statusConfigs[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1",
        config.bgColor,
        config.borderColor,
        config.textColor,
        className
      )}
    >
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        config.color,
        showPulse && "animate-pulse"
      )} />
      {children}
    </Badge>
  );
}

interface ConnectionStatusProps {
  isOnline: boolean;
  lastUpdate?: Date;
  className?: string;
}

export function ConnectionStatus({
  isOnline,
  lastUpdate,
  className
}: ConnectionStatusProps) {
  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <StatusIndicator
      status={isOnline ? 'live' : 'offline'}
      label={isOnline ? 'Live Data' : 'Offline'}
      sublabel={lastUpdate ? `Updated ${formatLastUpdate(lastUpdate)}` : undefined}
      showPulse={isOnline}
      className={className}
    />
  );
}
