"use client";

import React from 'react';
import { Card, Button } from './UIElements';
import { ICONS } from '../constants';
import { useUIStore } from '@/lib/stores/ui.store';

interface AlertModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const AlertModal: React.FC<AlertModalProps> = (props) => {
  const { alert, hideAlert } = useUIStore();

  const propsMode = props.isOpen !== undefined;

  const source = propsMode ? {
    isOpen: props.isOpen,
    title: props.title,
    message: props.message || '',
    type: props.type || 'info',
    confirmText: props.confirmText,
    cancelText: props.cancelText,
    onConfirm: props.onConfirm,
    onCancel: props.onCancel
  } : alert;

  if (!source.isOpen) return null;

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

  const config = typeConfig[source.type as keyof typeof typeConfig];
  const Icon = config.icon;

  const handleConfirm = () => {
    if (source.onConfirm) {
      source.onConfirm();
    }
    if (propsMode) {
      props.onClose?.();
    } else {
      hideAlert();
    }
  };

  const handleCancel = () => {
    if (source.onCancel) {
      source.onCancel();
    }
    if (propsMode) {
      props.onClose?.();
    } else {
      hideAlert();
    }
  };

  const isConfirmDialog = source.type === 'warning' && !!source.onConfirm;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <Card className="max-w-md w-full animate-in zoom-in duration-200 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0 border-2 ${config.borderColor}`}>
            <Icon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            {source.title && (
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">
                {source.title}
              </h3>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {source.message}
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
              {source.cancelText || 'Cancel'}
            </Button>
          )}
          <Button 
            variant={config.buttonVariant} 
            onClick={handleConfirm}
            className="px-8"
          >
            {source.confirmText || 'OK'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AlertModal;
