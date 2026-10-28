"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** 0 keeps it until dismissed. */
  durationMs?: number;
}

interface ToastItem extends Required<Omit<ToastInput, "durationMs">> {
  id: number;
}

interface ToastApi {
  push: (toast: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="size-4 text-up" aria-hidden="true" />,
  error: <XCircle className="size-4 text-down" aria-hidden="true" />,
  info: <Info className="size-4 text-info" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      const item: ToastItem = {
        id,
        tone: toast.tone ?? "info",
        title: toast.title,
        description: toast.description ?? "",
      };
      setItems((current) => [...current.slice(-3), item]);
      const duration = toast.durationMs ?? (toast.tone === "error" ? 7000 : 4200);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout={!reduce}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
              className={cn(
                "pointer-events-auto flex items-start gap-2.5 rounded-xs border bg-ink-800 px-3 py-2.5",
                item.tone === "error"
                  ? "border-down/40"
                  : item.tone === "success"
                    ? "border-up/35"
                    : "border-line-strong",
              )}
            >
              <span className="mt-0.5 shrink-0">{ICONS[item.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-bone">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-[0.6875rem] leading-snug text-dim break-words">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label={`Dismiss notification: ${item.title}`}
                className="shrink-0 rounded-xs text-dim transition-colors hover:text-bone"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
