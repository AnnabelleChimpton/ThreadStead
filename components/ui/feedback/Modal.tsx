import React, { useEffect, useId } from "react";
import { PixelIcon } from "@/components/ui/PixelIcon";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  closeLabel?: string;
  /** Rendered under the body, separated by a dotted rule */
  footer?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-2xl", closeLabel = "Close", footer }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-nb-ink/30"
      onClick={onClose}
    >
      <div className="fixed top-24 md:top-30 left-0 md:left-1/2 md:transform md:-translate-x-1/2 p-0 md:p-4 w-full md:w-auto">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`bg-nb-paper text-nb-ink border-2 border-nb-ink-mid md:rounded-cozy shadow-nb w-full ${maxWidth} max-h-[calc(100vh-6rem)] md:max-h-[85vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b-2 border-dotted border-nb-ink-mid/40">
            <h2 id={titleId} className="thread-headline text-lg sm:text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="ts-icon-button flex-shrink-0"
              aria-label={closeLabel}
            >
              <PixelIcon name="close" size={16} />
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {children}
          </div>
          {footer && (
            <div className="px-4 sm:px-6 py-4 border-t-2 border-dotted border-nb-ink-mid/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
