/**
 * Alert Component
 */

import * as React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    destructive: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  return (
    <div
      className={`relative w-full rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
};
