"use client";

import {
  Area,
  Bar,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import { AXIS_PROPS, ChartTip, DOWN, GOLD, LINE } from "./chart-theme";

/**
 * Out-of-sample equity in basis points with the drawdown underneath. Both
 * panels come from the same run, so the dip and the recovery line up visually.
 */
export function EquityChart({ points, height = 300 }: { points: EquityPoint[]; height?: number }) {
  const rows = points.map((point) => ({
    date: point.date,
    equity: point.equity,
    drawdown: point.drawdown,
  }));

  const equityHeight = Math.round(height * 0.66);
  const ddHeight = height - equityHeight - 4;

  return (
    <div
      role="img"
      aria-label="Out-of-sample cumulative basis points and drawdown by settlement date"
      style={{ height }}
      className="w-full"
    >
      <div style={{ height: equityHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: -4 }}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" {...AXIS_PROPS} tick={false} height={16} />
            <YAxis
              {...AXIS_PROPS}
              width={48}
              domain={["auto", "auto"]}
              tickFormatter={(value: number) => value.toFixed(0)}
            />
            <Tooltip
              cursor={{ stroke: LINE, strokeWidth: 1 }}
              content={
                <ChartTip
                  names={{ equity: "Cumulative", drawdown: "Drawdown" }}
                  formats={{
                    equity: (v) => `${v.toFixed(1)} bps`,
                    drawdown: (v) => `${v.toFixed(2)}%`,
                  }}
                />
              }
            />
            <ReferenceLine y={0} stroke={LINE} strokeDasharray="3 4" />
            <Area
              type="monotone"
              dataKey="equity"
              name="Cumulative"
              stroke={GOLD}
              strokeWidth={1.6}
              fill="url(#equityFill)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: ddHeight, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -4 }}>
            <XAxis
              dataKey="date"
              {...AXIS_PROPS}
              tickFormatter={(value: string) => formatDateShort(value)}
              height={22}
            />
            <YAxis
              {...AXIS_PROPS}
              width={48}
              tickFormatter={(value: number) => `${value.toFixed(0)}%`}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={
                <ChartTip
                  names={{ drawdown: "Drawdown" }}
                  formats={{ drawdown: (v) => `${v.toFixed(2)}%` }}
                />
              }
            />
            <Bar dataKey="drawdown" name="Drawdown" fill={DOWN} fillOpacity={0.55} isAnimationActive={false} />
            <ReferenceLine y={0} stroke={LINE} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <span className="sr-only">
        Positive runs render in gold, drawdowns in red; both series are cumulative basis points
        after round-trip costs.
      </span>
    </div>
  );
}
