/**
 * Progress Component
 */

import * as React from 'react';

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  indicatorClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className = '',
  indicatorClassName = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className}`}
    >
      <div
        className={`h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ${indicatorClassName}`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};
