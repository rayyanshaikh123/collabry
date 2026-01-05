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
    primary: "bg-indigo-500 text-white border-indigo-700 hover:bg-indigo-400 active:border-b-0",
    secondary: "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:border-b-0",
    ghost: "bg-transparent text-slate-600 border-transparent hover:bg-indigo-50 active:border-b-0 border-b-0",
    danger: "bg-rose-500 text-white border-rose-700 hover:bg-rose-400 active:border-b-0",
    success: "bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-400 active:border-b-0",
    warning: "bg-amber-400 text-slate-800 border-amber-600 hover:bg-amber-300 active:border-b-0",
    outline: "bg-white border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 border-b-4 border-b-indigo-300 active:border-b-2",
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

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  noPadding?: boolean;
  hoverable?: boolean;
}> = ({ children, className = '', noPadding = false, hoverable = false }) => (
  <div className={`
    bg-white rounded-[2rem] border-2 border-slate-100 bubble-shadow overflow-hidden 
    ${noPadding ? '' : 'p-6'} 
    ${hoverable ? 'hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300' : ''}
    ${className}
  `}>
    {children}
  </div>
);

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input 
    className={`w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all text-sm font-medium ${className}`}
    {...props}
  />
);

export const Badge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'indigo' | 'rose' | 'emerald' | 'amber' | 'slate';
  className?: string;
}> = ({ children, variant = 'indigo', className = '' }) => {
  const colors = {
    indigo: "bg-indigo-100 text-indigo-700",
    rose: "bg-rose-100 text-rose-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${colors[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const ProgressBar: React.FC<{ progress: number; color?: string; label?: string }> = ({ progress, color = 'bg-indigo-500', label }) => (
  <div className="space-y-1.5">
    {label && <div className="flex justify-between text-xs font-bold text-slate-500 px-1"><span>{label}</span><span>{progress}%</span></div>}
    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);
