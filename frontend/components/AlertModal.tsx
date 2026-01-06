'use client';

import React from 'react';
import { Card, Button } from './UIElements';
import { ICONS } from '../constants';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK'
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    success: {
      icon: ICONS.CheckCircle,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      buttonVariant: 'primary' as const
    },
    error: {
      icon: ICONS.Trash,
      iconColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      buttonVariant: 'danger' as const
    },
    warning: {
      icon: ICONS.Sparkles,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      buttonVariant: 'secondary' as const
    },
    info: {
      icon: ICONS.Sparkles,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      buttonVariant: 'primary' as const
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <Card className="max-w-md w-full animate-in zoom-in duration-200">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0 border-2 ${config.borderColor}`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            {title && (
              <h3 className="text-xl font-black text-slate-800 mb-2">
                {title}
              </h3>
            )}
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            variant={config.buttonVariant} 
            onClick={onClose}
            className="px-8"
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AlertModal;
