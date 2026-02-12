'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-all rounded-3xl press-effect bouncy-hover select-none border-b-4";

  const variants = {
    primary: "bg-indigo-500 dark:bg-indigo-600 text-white border-indigo-700 dark:border-indigo-800 hover:bg-indigo-400 dark:hover:bg-indigo-500 active:border-b-0",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:border-b-0",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-indigo-50 dark:hover:bg-indigo-900/30 active:border-b-0 border-b-0",
    danger: "bg-rose-500 dark:bg-rose-600 text-white border-rose-700 dark:border-rose-800 hover:bg-rose-400 dark:hover:bg-rose-500 active:border-b-0",
    success: "bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-700 dark:border-emerald-800 hover:bg-emerald-400 dark:hover:bg-emerald-500 active:border-b-0",
    warning: "bg-amber-400 dark:bg-amber-500 text-slate-800 dark:text-slate-200 border-amber-600 dark:border-amber-700 hover:bg-amber-300 dark:hover:bg-amber-400 active:border-b-0",
    outline: "bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-b-4 border-b-indigo-300 dark:border-b-indigo-600 active:border-b-2",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
    icon: "p-2.5 border-b-2",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<
  React.HTMLAttributes<HTMLDivElement> & {
    noPadding?: boolean;
    hoverable?: boolean;
  }
> = ({ children, className = '', noPadding = false, hoverable = false, ...props }) => (
  <div
    {...props}
    className={`bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bubble-shadow overflow-hidden ${noPadding ? '' : 'p-6'
      } ${hoverable ? 'hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-1 transition-all duration-300' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input
    className={`w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-400/20 focus:border-indigo-400 dark:focus:border-indigo-600 transition-all text-sm font-medium text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${className}`}
    {...props}
  />
);

export const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'indigo' | 'rose' | 'emerald' | 'amber' | 'slate' | 'cyan' | 'success' | 'error';
  className?: string;
}> = ({ children, variant = 'indigo', className = '' }) => {
  const colors = {
    indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
    rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
    emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
    cyan: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400",
    // Semantic aliases
    success: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
    error: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${colors[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const ProgressBar: React.FC<{ progress: number; color?: string; label?: string }> = ({ progress, color = 'bg-indigo-500', label }) => (
  <div className="space-y-1.5">
    {label && <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1"><span>{label}</span><span>{progress}%</span></div>}
    <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
      <div
        className={`h-full ${color} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string; color?: string }> = ({
  size = 'md',
  className = '',
  color = 'text-indigo-500'
}) => {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={`animate-spin rounded-full border-t-transparent ${color} ${sizes[size]} ${className} border-current`} />
  );
};

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-[2rem] gap-4 transition-all animate-in fade-in">
    <div className="relative">
      <Spinner size="lg" />
      <div className="absolute inset-0 animate-ping rounded-full border-4 border-indigo-500/20" />
    </div>
    {message && (
      <p className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest animate-pulse">
        {message}
      </p>
    )}
  </div>
);

export const LoadingPage: React.FC = () => (
  <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 z-[100] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
    {/* Background Decorative Rings */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-[100px] pointer-events-none" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-rose-500/5 dark:bg-rose-400/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />

    <div className="relative flex flex-col items-center gap-6">
      <div className="w-24 h-24 bg-linear-to-br from-indigo-500 to-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/50 border-b-8 border-indigo-700 animate-logo-pop">
        <span className="text-white font-black text-5xl font-display">C</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight font-display">
          COL <span className="text-indigo-500">LABRY</span>
        </h2>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  </div>
);
