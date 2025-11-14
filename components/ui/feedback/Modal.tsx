import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-2xl" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000]"
      onClick={onClose}
    >
      <div className="fixed top-24 md:top-30 left-0 md:left-1/2 md:transform md:-translate-x-1/2 p-0 md:p-4 w-full md:w-auto">
        <div
          className={`bg-thread-paper border-2 border-thread-sage md:rounded-lg shadow-lg w-full ${maxWidth} max-h-[calc(100vh-6rem)] md:max-h-[85vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-thread-sage bg-thread-cream">
            <h2 className="text-lg font-bold text-thread-pine">{title}</h2>
            <button
              onClick={onClose}
              className="text-thread-sage hover:text-thread-charcoal transition-colors p-1 text-xl leading-none"
            >
              ✕
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}