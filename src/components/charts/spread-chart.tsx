"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SpreadPoint } from "@/lib/types";
import { formatDateShort } from "@/lib/format";
import {
  AXIS_PROPS,
  ChartTip,
  DIM,
  GOLD,
  INFO,
  LINE,
} from "./chart-theme";

interface SpreadChartProps {
  points: SpreadPoint[];
  entryZ: number;
  height?: number;
  pairLabel: string;
}

interface Row {
  date: string;
  range: [number, number];
  basis: number;
  avg: number;
  z: number;
  naive: number;
  cost: number;
}

const TIP_NAMES: Record<string, string> = {
  basis: "Residual",
  avg: "60-session mean",
  naive: "Raw premium",
  cost: "Round trip",
  z: "z-score",
  range: "±1σ band",
};

const TIP_FORMATS: Record<string, (value: number) => string> = {
  basis: (v) => `${v.toFixed(1)} bps`,
  avg: (v) => `${v.toFixed(1)} bps`,
  naive: (v) => `${v.toFixed(1)} bps`,
  cost: (v) => `${v.toFixed(1)} bps`,
  z: (v) => v.toFixed(2),
};

/**
 * Two stacked panels sharing one time axis: residual basis with its ±1σ band
 * above, lagged z-score below with the ±2σ entry gates drawn in. Bars shade by
 * gate state, so "armed" reads without consulting a legend.
 */
export function SpreadChart({
  points,
  entryZ = 2,
  height = 360,
  pairLabel,
}: SpreadChartProps) {
  const rows: Row[] = points.map((point) => ({
    date: point.date,
    range: [point.refLowerBps, point.refUpperBps],
    basis: point.basisBps,
    avg: point.refAvgBps,
    z: point.zscore,
    naive: point.naiveGapBps,
    cost: point.costBps,
  }));

  const basisHeight = Math.round(height * 0.62);
  const zHeight = height - basisHeight - 4;

  return (
    <div
      role="img"
      aria-label={`${pairLabel}: residual basis with confidence band, and lagged z-score with ${entryZ} sigma entry gates`}
      style={{ height }}
      className="w-full"
    >
      <div style={{ height: basisHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 10, right: 8, bottom: 0, left: -4 }}>
            <defs>
              <linearGradient id="spreadBandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.14} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="spreadLineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.26} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" {...AXIS_PROPS} tick={false} height={18} />
            <YAxis
              {...AXIS_PROPS}
              width={46}
              tickFormatter={(value: number) => value.toFixed(0)}
              domain={["auto", "auto"]}
            />
            <Tooltip
              cursor={{ stroke: LINE, strokeWidth: 1 }}
              content={<ChartTip names={TIP_NAMES} formats={TIP_FORMATS} />}
            />
            <ReferenceLine y={0} stroke={LINE} strokeDasharray="3 4" />
            <Area
              dataKey="range"
              name="±1σ band"
              stroke="none"
              fill="url(#spreadBandFill)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="basis"
              name="Residual"
              stroke={GOLD}
              strokeWidth={1.6}
              fill="url(#spreadLineFill)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="avg"
              name="Mean"
              stroke={INFO}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ height: zHeight, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -4 }}>
            <XAxis
              dataKey="date"
              {...AXIS_PROPS}
              tickFormatter={(value: string) => formatDateShort(value)}
              height={22}
            />
            <YAxis {...AXIS_PROPS} width={46} domain={[-3.5, 3.5]} ticks={[-3, -2, 0, 2, 3]} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={<ChartTip names={TIP_NAMES} formats={TIP_FORMATS} />}
            />
            <ReferenceLine y={entryZ} stroke={GOLD} strokeDasharray="4 4" strokeOpacity={0.6} />
            <ReferenceLine y={-entryZ} stroke={GOLD} strokeDasharray="4 4" strokeOpacity={0.6} />
            <ReferenceLine y={0} stroke={LINE} />
            <Bar dataKey="z" name="z-score" isAnimationActive={false} radius={[1, 1, 0, 0]}>
              {rows.map((row) => (
                <Cell
                  key={row.date}
                  fill={Math.abs(row.z) >= entryZ ? GOLD : Math.abs(row.z) >= 1.5 ? INFO : DIM}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
