import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "gold" | "up" | "down" | "neutral";
  /** Small chip on the top-right of the tile. */
  chip?: ReactNode;
  footnote?: ReactNode;
  children?: ReactNode;
}

const TONES = {
  gold: "text-gold-bright",
  up: "text-up",
  down: "text-down",
  neutral: "text-bone",
} as const;

/** KPI tile — one number, one qualifier, one footnote. Never a paragraph. */
export function StatTile({ label, value, sub, tone = "neutral", chip, footnote, children }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border border-line bg-ink-850 px-4 py-3.5 rounded-md">
      <div className="flex items-start justify-between gap-2">
        <p className="label-mono">{label}</p>
        {chip}
      </div>
      <p className={cn("font-mono text-2xl leading-none tabular-nums", TONES[tone])}>{value}</p>
      {sub && <p className="text-xs leading-snug text-ash">{sub}</p>}
      {children}
      {footnote && <p className="mt-auto pt-1 text-[0.625rem] leading-snug text-dim">{footnote}</p>}
    </div>
  );
}
