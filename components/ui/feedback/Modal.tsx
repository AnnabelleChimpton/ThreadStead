import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PixelIcon } from "@/components/ui/PixelIcon";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Names the dialog for screen readers; shown in the title bar unless hideTitle */
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  closeLabel?: string;
  /** Rendered under the body, separated by a dotted rule */
  footer?: React.ReactNode;
  /** Keep the title for screen readers but drop the visible title bar (e.g. image viewers) */
  hideTitle?: boolean;
  /** Element to focus when the dialog opens; defaults to the first control in the body */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** Clicking the dimmed page behind the dialog closes it (default true) */
  closeOnBackdrop?: boolean;
  /** "alertdialog" for confirmations that need an answer */
  role?: "dialog" | "alertdialog";
  /** Id of the element that describes the dialog (aria-describedby) */
  describedBy?: string;
  /** Classes for the body wrapper (default "p-4 sm:p-6") */
  bodyClassName?: string;
  /** Extra classes for the dialog panel */
  className?: string;
  /** Backdrop colour (default a light ink wash; image viewers use a dark one) */
  backdropClassName?: string;
}

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[hidden], [inert], [aria-hidden='true']")
  );
}

// Open dialogs, innermost last: only the top one answers Esc and traps Tab.
const openStack: symbol[] = [];
let scrollLocks = 0;
let savedOverflow = "";
let savedPaddingRight = "";

function lockScroll() {
  if (scrollLocks++ > 0) return;
  const body = document.body;
  savedOverflow = body.style.overflow;
  savedPaddingRight = body.style.paddingRight;
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  body.style.overflow = "hidden";
}

function unlockScroll() {
  if (--scrollLocks > 0) return;
  scrollLocks = 0;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
}

/**
 * The one dialog for the site: rendered into <body>, labelled by its title,
 * Esc and the backdrop close it, Tab stays inside while it's open, the page
 * behind doesn't scroll, and focus goes back where it was on close.
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
  closeLabel = "Close",
  footer,
  hideTitle = false,
  initialFocusRef,
  closeOnBackdrop = true,
  role = "dialog",
  describedBy,
  bodyClassName = "p-4 sm:p-6",
  className = "",
  backdropClassName = "bg-nb-ink/30",
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const id = Symbol("modal");
    openStack.push(id);
    const isTop = () => openStack[openStack.length - 1] === id;
    const returnTo = document.activeElement as HTMLElement | null;
    lockScroll();

    const panel = panelRef.current;
    const first =
      initialFocusRef?.current ??
      (bodyRef.current && focusableIn(bodyRef.current)[0]) ??
      panel;
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop() || !panel) return;
      if (e.key === "Escape" && !e.isComposing) {
        // Captured at window before anything else, so a page's own Esc
        // handler (e.g. a lightbox behind this dialog) doesn't also fire.
        e.stopImmediatePropagation();
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusableIn(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstItem || active === panel || !panel.contains(active))) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && (active === lastItem || !panel.contains(active))) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    // Focus that escapes (a click on something outside) is pulled back in
    const onFocusIn = (e: FocusEvent) => {
      if (!isTop() || !panel || panel.contains(e.target as Node)) return;
      (focusableIn(panel)[0] ?? panel).focus();
    };
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn);
      const at = openStack.indexOf(id);
      if (at !== -1) openStack.splice(at, 1);
      unlockScroll();
      if (returnTo && document.contains(returnTo)) returnTo.focus();
    };
    // initialFocusRef is read once on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mounted]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className={`ts-modal-backdrop fixed inset-0 z-[10000] ${backdropClassName} overflow-y-auto overscroll-contain`}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="min-h-full flex items-start justify-center pt-20 md:pt-28 pb-4 md:px-4 pointer-events-none"
      >
        <div
          ref={panelRef}
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={`ts-modal pointer-events-auto bg-nb-paper text-nb-ink border-2 border-nb-ink-mid md:rounded-cozy shadow-nb w-full ${maxWidth} focus:outline-none ${className}`}
        >
          {hideTitle ? (
            <h2 id={titleId} className="sr-only">{title}</h2>
          ) : (
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b-2 border-dotted border-nb-ink-mid/40">
              <h2 id={titleId} className="thread-headline text-lg sm:text-xl font-bold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="ts-icon-button flex-shrink-0"
                aria-label={closeLabel}
              >
                <PixelIcon name="close" size={16} />
              </button>
            </div>
          )}
          <div ref={bodyRef} className={bodyClassName}>
            {children}
          </div>
          {footer && (
            <div className="px-4 sm:px-6 py-4 border-t-2 border-dotted border-nb-ink-mid/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
