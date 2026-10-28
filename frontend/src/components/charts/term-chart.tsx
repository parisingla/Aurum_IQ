"use client";

import {
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TermStructure } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { AXIS_PROPS, ChartTip, LINE } from "./chart-theme";

const CURVE_COLORS: Record<string, string> = {
  GOLD: "#f0c766",
  GOLDM: "#d6a640",
  GOLDTEN: "#7f9bc4",
  GOLDGUINEA: "#63a98b",
  GOLDPETAL: "#a5a199",
};

interface Row {
  dte: number;
  GOLD?: number;
  GOLDM?: number;
  GOLDTEN?: number;
  GOLDGUINEA?: number;
  GOLDPETAL?: number;
}

/**
 * Curve comparison on a shared days-to-expiry axis: fine gold per gram for
 * every product that has a live contract in that bucket.
 */
export function TermChart({ structure, height = 300 }: { structure: TermStructure; height?: number }) {
  const buckets = new Map<number, Row>();
  for (const curve of structure.curves) {
    for (const point of curve.points) {
      const row = buckets.get(point.daysToExpiry) ?? { dte: point.daysToExpiry };
      row[curve.productId] = Number(point.finePerGram.toFixed(2));
      buckets.set(point.daysToExpiry, row);
    }
  }
  const rows = [...buckets.values()].sort((a, b) => a.dte - b.dte);

  const names: Record<string, string> = {};
  const formats: Record<string, (value: number) => string> = {};
  for (const curve of structure.curves) {
    names[curve.productId] = curve.name;
    formats[curve.productId] = (value) => formatInr(value, 0);
  }

  return (
    <div
      role="img"
      aria-label="Forward curve comparison: fine gold per gram by days to expiry for each product"
      style={{ height }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 10, bottom: 4, left: -4 }}>
          <XAxis
            dataKey="dte"
            {...AXIS_PROPS}
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) => `${value}d`}
          />
          <YAxis
            {...AXIS_PROPS}
            width={56}
            domain={["auto", "auto"]}
            tickFormatter={(value: number) => formatInr(value, 0)}
          />
          <Tooltip
            cursor={{ stroke: LINE, strokeWidth: 1 }}
            content={
              <ChartTip
                names={names}
                formats={formats}
                title={(value) => `${value} days to expiry`}
              />
            }
          />
          <Legend
            iconType="plainline"
            iconSize={14}
            wrapperStyle={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--color-dim)",
              paddingTop: 6,
            }}
          />
          <ReferenceLine stroke={LINE} />
          {structure.curves.map((curve) => (
            <Line
              key={curve.productId}
              type="monotone"
              dataKey={curve.productId}
              name={curve.name}
              stroke={CURVE_COLORS[curve.productId] ?? "var(--color-gold)"}
              strokeWidth={1.5}
              dot={{ r: 2.2, strokeWidth: 0 }}
              activeDot={{ r: 3.5 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
