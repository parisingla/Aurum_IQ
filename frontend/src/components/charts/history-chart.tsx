"use client";

import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateShort, formatLots, formatPrice } from "@/lib/format";
import { AXIS_PROPS, ChartTip, DIM, GOLD, LINE } from "./chart-theme";
import type { ContractHistoryPoint } from "@/lib/api";

/** 60-session settlement path for one contract; zero-volume prints marked. */
export function HistoryChart({ points, height = 96 }: { points: ContractHistoryPoint[]; height?: number }) {
  const rows = points.slice(-60).map((point) => ({
    date: point.date,
    settle: point.settle,
    volume: point.volumeLots,
    stale: point.stale ? point.settle : null,
  }));

  return (
    <div
      role="img"
      aria-label={`Settlement history: ${rows.length} sessions, last ${formatPrice(rows[rows.length - 1]?.settle ?? 0)}`}
      style={{ height }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 6, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity={0.24} />
              <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            {...AXIS_PROPS}
            tickFormatter={(value: string) => formatDateShort(value)}
            minTickGap={40}
            height={20}
          />
          <YAxis {...AXIS_PROPS} width={52} domain={["auto", "auto"]} tickFormatter={(v: number) => formatPrice(v)} />
          <Tooltip
            cursor={{ stroke: LINE, strokeWidth: 1 }}
            content={
              <ChartTip
                names={{ settle: "Settle", volume: "Volume", stale: "Zero-volume" }}
                formats={{
                  settle: (v) => formatPrice(v),
                  volume: (v) => formatLots(v),
                  stale: (v) => formatPrice(v),
                }}
              />
            }
          />
          <ReferenceLine stroke={LINE} />
          <Area
            type="monotone"
            dataKey="settle"
            name="Settle"
            stroke={GOLD}
            strokeWidth={1.4}
            fill="url(#historyFill)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
          />
          <Scatter dataKey="stale" name="Zero-volume" fill={DIM} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <span className="sr-only">
        Grey markers highlight sessions that settled with no reported volume.
      </span>
    </div>
  );
}
