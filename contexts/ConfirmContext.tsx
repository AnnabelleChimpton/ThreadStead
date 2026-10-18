import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ui/feedback/ConfirmDialog";

export interface ConfirmOptions {
  title: React.ReactNode;
  message?: React.ReactNode;
  /** Label for the yes button, e.g. "Delete" (default "OK") */
  confirmText?: string;
  cancelText?: string;
  /** "danger" for deletes and anything that can't be undone */
  variant?: "default" | "danger";
}

/** Ask a yes/no question; resolves true on confirm, false on cancel/Esc/backdrop. */
export type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// The app-wide confirm, for components rendered in a separate React root
let globalConfirm: ConfirmFn | null = null;

function plainText(node: React.ReactNode): string {
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

/** Outside any provider: the app-wide dialog if mounted, else the browser's own. */
const fallbackConfirm: ConfirmFn = (options) => {
  if (globalConfirm) return globalConfirm(options);
  const o = typeof options === "string" ? { title: options } : options;
  const text = [plainText(o.title), plainText(o.message)].filter(Boolean).join("\n\n");
  return Promise.resolve(typeof window !== "undefined" && window.confirm(text));
};

interface Pending {
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Pending | null>(null);
  const queue = useRef<Pending[]>([]);
  const currentRef = useRef<Pending | null>(null);

  const showNext = useCallback(() => {
    const next = queue.current.shift() ?? null;
    currentRef.current = next;
    setCurrent(next);
  }, []);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        const pending: Pending = {
          options: typeof options === "string" ? { title: options } : options,
          resolve,
        };
        queue.current.push(pending);
        if (!currentRef.current) showNext();
      }),
    [showNext]
  );

  const answer = useCallback(
    (ok: boolean) => {
      const pending = currentRef.current;
      if (!pending) return;
      currentRef.current = null;
      pending.resolve(ok);
      showNext();
    },
    [showNext]
  );

  useEffect(() => {
    globalConfirm = confirm;
    return () => {
      if (globalConfirm === confirm) globalConfirm = null;
    };
  }, [confirm]);

  // An unmounting provider cancels whatever was still waiting
  useEffect(
    () => () => {
      currentRef.current?.resolve(false);
      queue.current.forEach((p) => p.resolve(false));
      queue.current = [];
    },
    []
  );

  const opts = current?.options;
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        isOpen={!!current}
        title={opts?.title ?? ""}
        message={opts?.message}
        confirmText={opts?.confirmText}
        cancelText={opts?.cancelText}
        variant={opts?.variant}
        onConfirm={() => answer(true)}
        onCancel={() => answer(false)}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * `const confirm = useConfirm();  if (!(await confirm({ title: "Delete this post?", variant: "danger", confirmText: "Delete" }))) return;`
 * The notebook replacement for window.confirm().
 */
export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext) ?? fallbackConfirm;
}
