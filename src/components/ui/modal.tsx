"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "right" = drawer (contract explorer), "center" = dialog (confirmations). */
  side?: "right" | "center";
  width?: string;
  labelledById?: string;
}

/**
 * Accessible dialog: Escape closes, backdrop closes, focus moves in on open and
 * returns to the trigger on close, background scroll is locked while open.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
  width = "34rem",
  labelledById,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusable?.[0] ?? panelRef.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0] as HTMLElement;
      const last = nodes[nodes.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  const panelTransition = reduce
    ? { duration: 0 }
    : side === "right"
      ? { duration: 0.34, ease: [0.22, 0.61, 0.36, 1] as const }
      : { duration: 0.24, ease: [0.22, 0.61, 0.36, 1] as const };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={
              reduce
                ? { opacity: 1 }
                : side === "right"
                  ? { x: 40, opacity: 0 }
                  : { y: 12, opacity: 0, scale: 0.985 }
            }
            animate={reduce ? { opacity: 1 } : { x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={
              reduce
                ? { opacity: 0 }
                : side === "right"
                  ? { x: 40, opacity: 0 }
                  : { y: 8, opacity: 0, scale: 0.99 }
            }
            transition={panelTransition}
            style={{ width }}
            className={cn(
              "absolute z-10 flex max-h-[min(90vh,52rem)] flex-col border border-line-strong bg-ink-850",
              "shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] outline-none",
              side === "right"
                ? "right-0 top-0 h-full rounded-l-md border-r-0"
                : "left-1/2 top-1/2 w-[min(90vw,34rem)] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-md",
            )}
          >
            <header className="flex items-start gap-3 border-b border-line px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <h2 id={labelledById} className="text-sm font-medium text-bone">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-xs leading-relaxed text-dim">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="-mr-1 shrink-0 rounded-xs p-1 text-dim transition-colors hover:bg-ink-750 hover:text-bone"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </header>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
