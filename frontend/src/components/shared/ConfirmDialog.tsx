import React, { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  body: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  destructive?: boolean;
}

const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  body,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  destructive = false,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when dialog opens
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="cp-overlay"
      role="presentation"
      onClick={(e) => {
        // Close when clicking the backdrop directly
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Trap focus inside this wrapper */}
      <div
        className="cp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cp-dialog-title"
        aria-describedby="cp-dialog-body"
      >
        <h3 id="cp-dialog-title">{title}</h3>
        <p id="cp-dialog-body">{body}</p>

        <div className="cp-dialog-actions">
          <button
            ref={cancelRef}
            className="cp-btn-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`cp-btn-confirm${destructive ? ' destructive' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export { ConfirmDialog };
export default ConfirmDialog;
