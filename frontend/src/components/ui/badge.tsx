import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "gold"
  | "up"
  | "down"
  | "info"
  | "warning"
  | "critical"
  | "neutral"
  | "outline";

const TONES: Record<BadgeTone, string> = {
  gold: "border-gold/40 bg-gold/10 text-gold-bright",
  up: "border-up/35 bg-up/10 text-up",
  down: "border-down/35 bg-down/10 text-down",
  info: "border-info/35 bg-info/10 text-info",
  warning: "border-gold/35 bg-gold/8 text-gold",
  critical: "border-down/45 bg-down/12 text-down",
  neutral: "border-line-strong bg-ink-750 text-ash",
  outline: "border-line-strong bg-transparent text-dim",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  title?: string;
  /** Monospace, tabular, dense — the default for market values. */
  mono?: boolean;
}

export function Badge({ tone = "neutral", children, className, title, mono = true }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-xs border px-1.5 py-0.5",
        mono ? "font-mono text-[0.6875rem] tabular-nums" : "text-[0.6875rem]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Severity dot + label, used in alert rows where colour must not stand alone. */
export function SeverityMark({ severity }: { severity: "critical" | "warning" | "info" }) {
  const map = {
    critical: { label: "Critical", className: "bg-down" },
    warning: { label: "Armed", className: "bg-gold" },
    info: { label: "Watch", className: "bg-info" },
  } as const;
  const item = map[severity];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", item.className)} aria-hidden="true" />
      <span className="label-mono text-ash">{item.label}</span>
    </span>
  );
}
