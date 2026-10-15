"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";
import { UP, DOWN, DIM } from "./chart-theme";

interface SparklineProps {
  values: number[];
  /** Colour follows the trend unless overridden. */
  tone?: "auto" | "up" | "down" | "neutral";
  height?: number;
  label: string;
}

/** 60-session context for a watchlist row — no axes, no tooltip, no noise. */
export function Sparkline({ values, tone = "auto", height = 24, label }: SparklineProps) {
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const direction = last >= first ? "up" : "down";
  const color =
    tone === "auto" ? (direction === "up" ? UP : DOWN) : tone === "up" ? UP : tone === "down" ? DOWN : DIM;

  const rows = values.map((value, index) => ({ index, value }));

  return (
    <div role="img" aria-label={label} style={{ height }} className="w-16 sm:w-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 3, right: 1, bottom: 3, left: 1 }}>
          <YAxis hide domain={["auto", "auto"]} />
          <ReferenceLine stroke="var(--color-line)" />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
