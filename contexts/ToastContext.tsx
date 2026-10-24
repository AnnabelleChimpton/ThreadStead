import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastApi {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

const DEFAULT_DURATION = 5000;
const ERROR_DURATION = 8000;
/** Older toasts drop off when more than this many are showing */
const MAX_VISIBLE = 3;

const ToastContext = createContext<ToastApi | null>(null);

// For code outside React (ChatContext callbacks, template actions)
let globalToast: ToastApi | null = null;

/** The app-wide toast API, or null before the provider mounts. */
export function getGlobalToast(): ToastApi | null {
  return globalToast;
}

// Outside any provider (a separate React root, or a unit test): use the
// app-wide toasts if they exist, otherwise just log.
const fallbackToast: ToastApi = {
  showToast: (message, type = "info") => {
    if (globalToast) globalToast.showToast(message, type);
    else console.warn(`[toast:${type}]`, message);
  },
  showSuccess: (m) => fallbackToast.showToast(m, "success"),
  showError: (m) => fallbackToast.showToast(m, "error"),
  showWarning: (m) => fallbackToast.showToast(m, "warning"),
  showInfo: (m) => fallbackToast.showToast(m, "info"),
};

/** Show toasts from any component (the provider is mounted once in _app). */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? fallbackToast;
}

const LOOK: Record<ToastType, { icon: PixelIconName; border: string; iconColor: string; label: string }> = {
  success: { icon: "check", border: "border-l-thread-meadow", iconColor: "text-thread-meadow", label: "Done" },
  error: { icon: "alert", border: "border-l-thread-sunset", iconColor: "text-nb-rose-ink", label: "Error" },
  warning: { icon: "warning-box", border: "border-l-nb-butter", iconColor: "text-nb-ink", label: "Heads up" },
  info: { icon: "info-box", border: "border-l-thread-sky", iconColor: "text-nb-ink-mid", label: "Note" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const parent = useContext(ToastContext);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const nextId = useRef(0);

  useEffect(() => setMounted(true), []);

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const api = useMemo<ToastApi>(() => {
    const showToast = (message: string, type: ToastType = "info", duration?: number) => {
      const id = ++nextId.current;
      const ms = duration ?? (type === "error" ? ERROR_DURATION : DEFAULT_DURATION);
      setToasts((prev) => {
        // The same message twice in a row (double click, retry loop) shows once
        if (prev.some((t) => t.message === message && t.type === type)) return prev;
        return [...prev, { id, message, type, duration: ms }].slice(-MAX_VISIBLE);
      });
    };
    return {
      showToast,
      showSuccess: (m) => showToast(m, "success"),
      showError: (m) => showToast(m, "error"),
      showWarning: (m) => showToast(m, "warning"),
      showInfo: (m) => showToast(m, "info"),
    };
  }, []);

  useEffect(() => {
    if (parent) return;
    globalToast = api;
    return () => {
      if (globalToast === api) globalToast = null;
    };
  }, [api, parent]);

  // A nested provider (e.g. inside a profile template) reuses the app-wide one
  if (parent) return <>{children}</>;

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            data-site-chrome
            className="toast-region fixed z-[10050] top-3 left-3 right-3 sm:left-auto sm:right-6 sm:top-6 sm:w-96 flex flex-col gap-2 pointer-events-none"
          >
            {toasts.map((t) => (
              <ToastCard key={t.id} toast={t} onClose={hideToast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const look = LOOK[toast.type];

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onClose(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [paused, toast.id, toast.duration, onClose]);

  return (
    <div
      className={`toast pointer-events-auto flex items-start gap-3 bg-nb-paper text-nb-ink border-2 border-nb-ink-mid border-l-8 ${look.border} rounded-cozy shadow-nb-sm px-3 py-2.5`}
      data-type={toast.type}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className={`flex-shrink-0 mt-0.5 ${look.iconColor}`} aria-hidden="true">
        <PixelIcon name={look.icon} size={16} />
      </span>
      <p className="flex-1 min-w-0 text-sm leading-snug break-words">
        <span className="sr-only">{look.label}: </span>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="ts-icon-button flex-shrink-0"
        aria-label="Dismiss"
      >
        <PixelIcon name="close" size={12} />
      </button>
    </div>
  );
}
