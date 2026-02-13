/**
 * Tooltip Component
 */

import * as React from 'react';

interface TooltipProps {
  children: React.ReactNode;
}

export const TooltipProvider: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>;
};

interface TooltipContentProps {
  children: React.ReactNode;
  className?: string;
}

export const TooltipContent: React.FC<TooltipContentProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`absolute z-50 px-3 py-2 text-sm bg-gray-900 dark:bg-gray-700 text-white rounded-md shadow-lg ${className}`}
      style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' }}
    >
      {children}
    </div>
  );
};

interface TooltipTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, asChild }) => {
  return <>{children}</>;
};

interface TooltipRootProps {
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipRootProps> = ({ children }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === TooltipTrigger) {
            return child;
          }
          if (child.type === TooltipContent && isVisible) {
            return child;
          }
        }
        return null;
      })}
    </div>
  );
};
