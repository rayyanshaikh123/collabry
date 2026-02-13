/**
 * StrategyBadge Component
 * Displays the current scheduling strategy mode with visual indicator
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { StrategyMode } from '@/types/planner.types';

interface StrategyBadgeProps {
  mode: StrategyMode;
  confidence?: number;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const strategyConfig = {
  balanced: {
    label: 'Balanced',
    color: 'bg-blue-500 text-white hover:bg-blue-600',
    icon: '⚖️',
    description: 'Standard scheduling with even task distribution',
  },
  adaptive: {
    label: 'Adaptive',
    color: 'bg-orange-500 text-white hover:bg-orange-600',
    icon: '🎯',
    description: 'Exam-driven scheduling with priority weighting',
  },
  emergency: {
    label: 'Emergency',
    color: 'bg-red-600 text-white hover:bg-red-700',
    icon: '⚠️',
    description: 'Crisis mode with compressed timeline',
  },
};

export const StrategyBadge: React.FC<StrategyBadgeProps> = ({
  mode,
  confidence,
  showTooltip = true,
  size = 'md',
}) => {
  const config = strategyConfig[mode];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const badge = (
    <Badge 
      className={`${config.color} ${sizeClasses[size]} font-semibold cursor-default transition-colors`}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
      {confidence !== undefined && (
        <span className="ml-2 opacity-80 text-xs">
          {confidence}%
        </span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{config.label} Mode</p>
          <p className="text-xs text-gray-400">{config.description}</p>
          {confidence !== undefined && (
            <p className="text-xs text-gray-400 mt-1">
              Confidence: {confidence}%
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
