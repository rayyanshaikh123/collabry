'use client';

import React from 'react';
import { Card, Button } from './UIElements';
import { ICONS } from '../constants';
import { useUIStore } from '../src/stores/ui.store';

const AlertModal: React.FC = () => {
  const { alert, hideAlert } = useUIStore();

  if (!alert.isOpen) return null;

  const typeConfig = {
    success: {
      icon: ICONS.CheckCircle,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      buttonVariant: 'primary' as const
    },
    error: {
      icon: ICONS.AlertCircle || ICONS.Trash,
      iconColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-900/30',
      borderColor: 'border-rose-200 dark:border-rose-800',
      buttonVariant: 'danger' as const
    },
    warning: {
      icon: ICONS.Sparkles,
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
      borderColor: 'border-amber-200 dark:border-amber-800',
      buttonVariant: 'secondary' as const
    },
    info: {
      icon: ICONS.Sparkles,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      buttonVariant: 'primary' as const
    }
  };

  const config = typeConfig[alert.type];
  const Icon = config.icon;

  const handleConfirm = () => {
    if (alert.onConfirm) {
      alert.onConfirm();
    }
    hideAlert();
  };

  const handleCancel = () => {
    if (alert.onCancel) {
      alert.onCancel();
    }
    hideAlert();
  };

  const isConfirmDialog = alert.type === 'warning' && alert.onConfirm;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <Card className="max-w-md w-full animate-in zoom-in duration-200 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0 border-2 ${config.borderColor}`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            {alert.title && (
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">
                {alert.title}
              </h3>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {alert.message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          {isConfirmDialog && (
            <Button 
              variant="secondary" 
              onClick={handleCancel}
              className="px-6"
            >
              {alert.cancelText || 'Cancel'}
            </Button>
          )}
          <Button 
            variant={config.buttonVariant} 
            onClick={handleConfirm}
            className="px-8"
          >
            {alert.confirmText || 'OK'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AlertModal;
