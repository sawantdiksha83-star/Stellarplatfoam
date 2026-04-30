'use client';

/**
 * Toast — lightweight success/error notification component.
 * Requirements: 2.5, 5.1
 */

import { useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  /** Auto-dismiss delay in ms. Default 4000. Pass 0 to disable. */
  duration?: number;
}

export default function Toast({ toasts, onDismiss, duration = 4000 }: ToastProps) {
  const dismiss = useCallback(
    (id: string) => onDismiss(id),
    [onDismiss]
  );

  useEffect(() => {
    if (duration === 0 || toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), duration)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, duration, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white transition-all ${
            t.type === 'success'
              ? 'bg-green-600'
              : t.type === 'error'
              ? 'bg-red-600'
              : 'bg-gray-700'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useToast — convenience hook for managing toast state
// ---------------------------------------------------------------------------

import { useState } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismiss };
}
