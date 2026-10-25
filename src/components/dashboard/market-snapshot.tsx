"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownUp, CalendarDays, Layers, ShieldCheck } from "lucide-react";

interface MiniStat {
  icon: LucideIcon;
  label: string;
  value?: string;
  hint?: string;
  /** Optional trailing pill (Data Status row). */
  pill?: { label: string; ready: boolean };
}

function MiniCard({ stat }: { stat: MiniStat }) {
  const Icon = stat.icon;
  return (
    <div className="rounded-md border border-line bg-white-surface p-3" title={stat.hint}>
      <div className="flex items-start justify-between gap-2">
        {/* Labels wrap within the tile — never overflow it. */}
        <p className="text-[0.625rem] font-semibold uppercase leading-[1.35] tracking-[0.1em] text-secondary-text">
          {stat.label}
        </p>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-pale-aqua">
          <Icon className="size-3.5 text-ocean-teal" aria-hidden="true" />
        </span>
      </div>
      {stat.pill ? (
        <span
          className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-1 text-[0.75rem] font-medium ${
            stat.pill.ready
              ? "bg-positive/12 text-positive"
              : "bg-warning/12 text-warning"
          }`}
        >
          {stat.pill.label}
        </span>
      ) : (
        <p className="mt-1.5 break-words font-display text-[1.125rem] font-semibold leading-tight text-ocean-navy">
          {stat.value}
        </p>
      )}
    </div>
  );
}

export function MarketSnapshot({
  contractsLoaded,
  eligiblePairs,
  dataPeriod,
  dataReady,
  loading,
}: {
  contractsLoaded: number | null;
  eligiblePairs: number | null;
  dataPeriod: string | null;
  dataReady: boolean;
  loading: boolean;
}) {
  const dash = "—";
  const stats: MiniStat[] = [
    {
      icon: Layers,
      label: "Contracts Loaded",
      value: loading ? dash : contractsLoaded !== null ? String(contractsLoaded) : dash,
      hint: "Live contract rows in the working dataset",
    },
    {
      icon: ArrowDownUp,
      label: "Eligible Pairs",
      value: loading ? dash : eligiblePairs !== null ? String(eligiblePairs) : dash,
      hint: "Pairs with overlapping, tradable sessions",
    },
    {
      icon: CalendarDays,
      label: "Data Period",
      value: loading ? dash : dataPeriod ?? dash,
      hint: "First → last session in the dataset",
    },
    {
      icon: ShieldCheck,
      label: "Data Status",
      pill: loading
        ? { label: "Checking…", ready: true }
        : dataReady
          ? { label: "Ready", ready: true }
          : { label: "Review", ready: false },
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-light-sand/50 p-5" aria-label="Market snapshot">
      <h2 className="font-display text-[1.375rem] font-semibold tracking-tight text-ocean-navy">
        Market Snapshot
      </h2>
      <p className="mt-1 text-[0.8125rem] leading-snug text-secondary-text">
        Your dataset, contracts and analysis status.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {stats.map((stat) => (
          <MiniCard key={stat.label} stat={stat} />
        ))}
      </div>
    </section>
  );
}
