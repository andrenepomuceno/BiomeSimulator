import React, { useEffect, useRef } from 'react';
import useSimStore from '../store/simulationStore';

const TOAST_DURATION_MS = 3500;

function variantClass(variant) {
  if (variant === 'error') return 'text-bg-danger';
  if (variant === 'success') return 'text-bg-success';
  if (variant === 'info') return 'text-bg-info';
  return 'text-bg-warning';
}

function ToastItem({ toast }) {
  const dismiss = useSimStore((s) => s.dismissUiToast);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => dismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, dismiss]);

  return (
    <div className={`toast show ${variantClass(toast.variant)}`} role="alert" aria-live="assertive" aria-atomic="true">
      <div className="toast-header">
        <strong className="me-auto">{toast.title || 'Notice'}</strong>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={() => dismiss(toast.id)}
        />
      </div>
      {toast.message ? <div className="toast-body">{toast.message}</div> : null}
    </div>
  );
}

export default function UiToasts() {
  const toasts = useSimStore((s) => s.uiToasts);
  if (!toasts.length) return null;

  return (
    <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1100 }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}