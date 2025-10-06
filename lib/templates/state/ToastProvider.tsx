'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/ui/feedback/Toast';

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global reference for non-React contexts (similar to GlobalTemplateStateProvider pattern)
let globalToast: ToastContextType | null = null;

export function getGlobalToast(): ToastContextType | null {
  return globalToast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const {
    toasts,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  } = useToast();

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  // Set global reference
  useEffect(() => {
    globalToast = contextValue;
    return () => {
      globalToast = null;
    };
  }, [contextValue]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Render active toasts */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}

export function useToastContext(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}
