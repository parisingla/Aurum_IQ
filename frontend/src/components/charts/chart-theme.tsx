import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shared axis styling — one visual language across every chart. */
export const AXIS_TICK = {
  fill: "var(--color-dim)",
  fontSize: 10,
  fontFamily: "var(--font-mono)",
} as const;

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: { stroke: "var(--color-line)" },
  tick: AXIS_TICK,
  tickMargin: 6,
  minTickGap: 28,
} as const;

export const GRID_PROPS = {
  stroke: "var(--color-line)",
  strokeDasharray: "0",
  vertical: false,
  strokeWidth: 1,
} as const;

export const GOLD = "var(--color-gold)";
export const UP = "var(--color-up)";
export const DOWN = "var(--color-down)";
export const INFO = "var(--color-info)";
export const DIM = "var(--color-dim)";
export const LINE = "var(--color-line-strong)";

export interface TipEntry {
  dataKey?: string | number;
  value?: string | number | Array<string | number>;
  color?: string;
  name?: string | number;
}

interface ChartTipProps {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  /** dataKey → human label. */
  names?: Record<string, string>;
  /** dataKey → value formatter. */
  formats?: Record<string, (value: number) => string>;
  /** Optional first line above the rows — a literal or a label formatter. */
  title?: string | ((label: string | number) => string);
  footer?: ReactNode;
}

/**
 * Custom tooltip: dark plate, mono figures, hairline rows. Never re-renders the
 * chart itself, so hover stays smooth on dense series.
 */
export function ChartTip({
  active,
  payload,
  label,
  names,
  formats,
  title,
  footer,
}: ChartTipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[10.5rem] rounded-xs border border-line-strong bg-ink-800/95 px-2.5 py-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-sm">
      <p className="label-mono text-ash">
        {typeof title === "function" ? title(label ?? "") : (title ?? String(label ?? ""))}
      </p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry, index) => {
          const key = String(entry.dataKey ?? index);
          const raw = entry.value;
          const numeric = typeof raw === "number" ? raw : Number(raw);
          const format = formats?.[key];
          const display =
            Array.isArray(raw) ? raw.join(" → ")
              : Number.isFinite(numeric) && format
                ? format(numeric)
                : String(raw ?? "—");
          return (
            <li key={key} className="flex items-baseline gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-2.5 rounded-full"
                  style={{ background: entry.color ?? GOLD }}
                />
                <span className="text-[0.6875rem] text-dim">{names?.[key] ?? entry.name ?? key}</span>
              </span>
              <span className="ml-auto font-mono text-[0.6875rem] tabular-nums text-bone">
                {display}
              </span>
            </li>
          );
        })}
      </ul>
      {footer && <div className="mt-1.5 border-t border-line pt-1.5">{footer}</div>}
    </div>
  );
}

/** Fixed-height responsive wrapper used by every chart panel. */
export function ChartFrame({
  children,
  height = 240,
  className,
  label,
}: {
  children: ReactNode;
  height?: number;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("w-full", className)}
      style={{ height } as CSSProperties}
    >
      {children}
    </div>
  );
}
