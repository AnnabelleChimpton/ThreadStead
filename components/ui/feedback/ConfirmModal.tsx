import React from "react";
import { createPortal } from "react-dom";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'warning' | 'danger';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = variant === 'danger'
    ? {
        border: 'border-red-300',
        bg: 'bg-red-50',
        text: 'text-red-900',
        titleText: 'text-red-900',
        icon: '🚨',
        iconColor: 'text-red-600',
        confirmBg: 'bg-red-600 hover:bg-red-700',
        confirmText: 'text-white'
      }
    : {
        border: 'border-yellow-300',
        bg: 'bg-yellow-50',
        text: 'text-yellow-900',
        titleText: 'text-yellow-900',
        icon: '⚠️',
        iconColor: 'text-yellow-600',
        confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
        confirmText: 'text-white'
      };

  const modalContent = (
    <>
      {/* Modal - No backdrop, lightweight confirmation */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-none">
        <div
          className={`${colors.bg} ${colors.border} ${colors.text} rounded-xl shadow-2xl max-w-md w-full border-2 pointer-events-auto p-6`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${colors.iconColor}`}>{colors.icon}</span>
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            {typeof message === 'string' ? (
              <p className="text-sm leading-relaxed">{message}</p>
            ) : (
              message
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors text-sm"
            >
              {cancelText}
            </button>
            <button
              onClick={async () => {
                onCancel(); // Close modal immediately
                await onConfirm(); // Then run the confirm action
              }}
              className={`px-4 py-2 ${colors.confirmBg} ${colors.confirmText} font-medium rounded-lg transition-colors text-sm`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Render to document body using portal to ensure it appears above everything
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
