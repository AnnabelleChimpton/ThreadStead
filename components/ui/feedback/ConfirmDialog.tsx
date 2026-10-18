import React, { useId, useRef } from "react";
import Modal from "@/components/ui/feedback/Modal";
import Button from "@/components/ui/Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: React.ReactNode;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** "danger" for deletes and other things that can't be undone */
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A yes/no question in the notebook dialog. Usually reached through
 * useConfirm() rather than rendered directly.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = variant === "danger";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      role="alertdialog"
      maxWidth="max-w-md"
      closeLabel={cancelText}
      describedBy={message ? messageId : undefined}
      // Destructive: land on the safe answer. Otherwise Enter confirms.
      initialFocusRef={danger ? cancelRef : confirmRef}
      bodyClassName={message ? undefined : "hidden"}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button ref={confirmRef} variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      }
    >
      {message &&
        (typeof message === "string" ? (
          <p id={messageId} className="text-nb-ink whitespace-pre-line">{message}</p>
        ) : (
          <div id={messageId} className="text-nb-ink">{message}</div>
        ))}
    </Modal>
  );
}
