"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  /** Tampilkan toast. Mengembalikan id untuk ditutup manual bila perlu. */
  toast: (message: string, variant?: ToastVariant) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success: "border-village-200 bg-village-50 text-village-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
  info: "border-slate-200 bg-white text-slate-800",
};

const variantIcons: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const AUTO_DISMISS_MS = 5000;

/**
 * Provider toast ringan.
 * Toast error diberi `role="alert"` (assertive) agar langsung dibacakan screen
 * reader; toast sukses/info memakai `role="status"` (polite).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      counterRef.current += 1;
      const id = counterRef.current;
      setToasts((prev) => [...prev, { id, message, variant }]);

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);

      return id;
    },
    [],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = variantIcons[t.variant];
          return (
            <div
              key={t.id}
              role={t.variant === "error" ? "alert" : "status"}
              aria-live={t.variant === "error" ? "assertive" : "polite"}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${variantStyles[t.variant]}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm leading-5">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Tutup notifikasi"
                className="shrink-0 rounded-md p-1 opacity-60 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Akses ke fungsi toast. Bila provider tidak ada, mengembalikan fungsi no-op
 * agar komponen tetap dapat dipakai (mis. saat dirender di luar provider).
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      toast: () => 0,
      dismiss: () => undefined,
    }
  );
}