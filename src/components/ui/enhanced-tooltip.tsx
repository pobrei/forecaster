'use client';

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Info, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedTooltipProps {
  title?: string;
  description: string;
  badges?: string[];
  icon?: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  maxWidth?: string;
}

export function EnhancedTooltip({
  title,
  description,
  badges = [],
  icon,
  children,
  side = 'top',
  className,
  maxWidth = 'max-w-xs'
}: EnhancedTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            {children}
            {icon || <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          className={cn(maxWidth, className)}
        >
          <div className="space-y-2">
            {title && (
              <h4 className="font-semibold text-sm">{title}</h4>
            )}
            <p className="text-sm leading-relaxed">{description}</p>
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {badges.map((badge, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface HelpTooltipProps {
  content: string;
  title?: string;
  className?: string;
}

export function HelpTooltip({ content, title, className }: HelpTooltipProps) {
  return (
    <EnhancedTooltip
      title={title}
      description={content}
      icon={<HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />}
      className={className}
    >
      <span className="sr-only">Help</span>
    </EnhancedTooltip>
  );
}
