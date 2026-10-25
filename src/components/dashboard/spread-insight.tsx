"use client";

import { useMemo, type ReactElement } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { DATA_MODE } from "@/lib/api";
import type { SpreadSeries } from "@/lib/types";

const toPct = (bps: number) => bps / 100;
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

/**
 * Featured relative-price chart. Residual basis is shown in percent with the
 * historical ±1σ band as dashed gold lines. A callout marks the latest
 * observation — "unusual" wording only, never "opportunity".
 */
export function SpreadInsight({ series }: { series: SpreadSeries }) {
  const { data, callout, band } = useMemo(() => {
    const rows = series.points.map((point) => ({
      label: new Date(point.date).toLocaleString("en", { month: "short" }),
      pct: toPct(point.basisBps),
      upper: toPct(point.refUpperBps),
      lower: toPct(point.refLowerBps),
    }));
    const latest = series.points[series.points.length - 1];
    const unusual = Math.abs(series.summary.zscore) >= 2;
    return {
      data: rows,
      band:
        rows.length > 0
          ? { upper: rows[rows.length - 1].upper, lower: rows[rows.length - 1].lower }
          : null,
      // The callout tracks the LATEST observation — the same point the
      // gold-outlined marker sits on — anchored at the right edge so it can
      // never drift over the card heading.
      callout: latest
        ? {
            unusual,
            text: unusual
              ? `Unusual spread ${fmtPct(toPct(latest.basisBps))} (above typical range)`
              : `Latest spread ${fmtPct(toPct(latest.basisBps))} (within typical range)`,
            above: toPct(latest.basisBps) >= 0,
          }
        : null,
    };
  }, [series]);

  // Gold-outlined marker on the latest observation, drawn as a custom dot so
  // it tracks the data even with a categorical x-axis.
  const latestDot = useMemo(
    () =>
      function LatestDot(
        props: { cx?: number; cy?: number; index?: number },
      ): ReactElement | null {
        const { cx, cy, index } = props;
        if (cx === undefined || cy === undefined || index !== data.length - 1) return null;
        return (
          <g key="latest-dot">
            <circle cx={cx} cy={cy} r={5.5} fill="#FFFFFF" stroke="#C78A16" strokeWidth={2.4} />
            <circle cx={cx} cy={cy} r={2} fill="#2796A3" />
          </g>
        );
      },
    [data],
  );

  return (
    <section className="rounded-lg border border-line bg-white-surface p-5" aria-label="Spread insight">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[1.375rem] font-semibold tracking-tight text-ocean-navy">
            Spread Insight
          </h2>
          <p className="mt-1 truncate text-[0.8125rem] leading-snug text-secondary-text">
            Relative price between {series.summary.legA} and {series.summary.legB}.
          </p>
        </div>
        <Badge tone={DATA_MODE === "api" ? "info" : "gold"} className="shrink-0 rounded-full px-2.5">
          {DATA_MODE === "api" ? "Live API" : "Illustrative Data"}
        </Badge>
      </div>

      <div className="relative mt-14">
        {callout && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[240px] rounded-md border px-2.5 py-1.5 text-[0.6875rem] leading-snug shadow-sm"
            style={{
              right: "1.5%",
              top: callout.above ? "-6px" : "auto",
              bottom: callout.above ? "auto" : "-6px",
              transform: `translateY(${callout.above ? "-100%" : "0%"})`,
              borderColor: callout.unusual ? "#DDAF35" : "#E7E1D5",
              backgroundColor: callout.unusual ? "#FFF8EC" : "#FFFFFF",
            }}
          >
            <span className="block font-semibold text-ocean-navy">
              {callout.unusual ? "Unusual spread" : "Latest spread"}
            </span>
            <span className="text-secondary-text">{callout.text.replace(/^(Unusual|Latest) spread /, "")}</span>
          </div>
        )}

        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid stroke="#EFE9DC" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#657387", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#E7E1D5" }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: "#657387", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => `${value.toFixed(1)}%`}
              width={52}
            />
            <Tooltip
              formatter={(value) => [fmtPct(Number(value)), "Residual basis"]}
              contentStyle={{
                borderRadius: 6,
                border: "1px solid #E7E1D5",
                fontSize: 12,
              }}
            />
            {band && (
              <>
                <ReferenceLine
                  y={band.upper}
                  stroke="#DDAF35"
                  strokeDasharray="6 4"
                  strokeWidth={1.2}
                />
                <ReferenceLine
                  y={band.lower}
                  stroke="#DDAF35"
                  strokeDasharray="6 4"
                  strokeWidth={1.2}
                />
              </>
            )}
            <Area
              type="monotone"
              dataKey="pct"
              stroke="#2796A3"
              strokeWidth={2}
              fill="#2796A3"
              fillOpacity={0.14}
              dot={latestDot}
              activeDot={{ r: 4, fill: "#2796A3" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-14 text-[0.6875rem] leading-snug text-stone">
        Residual after purity and carry removal, in % of the fine-gold basis. Dashed gold lines
        mark the typical range. Unusual is not the same as profitable — see the cost gate in the
        Spread Lab.
      </p>
    </section>
  );
}
