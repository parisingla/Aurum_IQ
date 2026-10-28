"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDownUp, FlaskConical, ChevronRight } from "lucide-react";
import { listRuns, emptyRuns, subscribeRuns, KIND_LABEL, type ResearchRun } from "@/lib/history";
import { formatRelative } from "@/lib/format";
import { useClock } from "@/lib/hooks";

function useRuns(): ResearchRun[] {
  return useSyncExternalStore(subscribeRuns, listRuns, emptyRuns);
}

function RowIcon({ kind }: { kind: ResearchRun["kind"] }) {
  const Icon = kind === "backtest" ? FlaskConical : ArrowDownUp;
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-ocean-teal/40">
      <Icon className="size-4 text-pale-aqua" aria-hidden="true" />
    </span>
  );
}

/**
 * Navy research-history card. Only runs actually completed in this browser
 * appear here — nothing is fabricated while the list is empty.
 */
export function RecentAnalyses() {
  const runs = useRuns();
  const nowMs = useClock(60_000);

  return (
    <section
      className="flex flex-col rounded-lg bg-ocean-navy p-5 text-white-surface"
      aria-label="Recent analyses"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-[1.375rem] font-semibold leading-tight tracking-tight">
          Recent Analyses
        </h2>
        <Link
          href="/backtesting"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[0.75rem] font-medium text-pale-aqua transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-gold"
        >
          View All
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-10 text-center">
          <p className="text-sm font-medium text-white-surface">No analyses yet</p>
          <p className="max-w-[220px] text-[0.75rem] leading-relaxed text-pale-aqua/80">
            Completed backtests and spread studies land here automatically.
          </p>
          <Link href="/spreads">
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-warm-gold px-4 py-1.5 text-[0.75rem] font-semibold text-ocean-navy transition-colors hover:bg-gold-bright">
              Start an Analysis
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-white/10">
          {runs.slice(0, 4).map((run) => (
            <li key={run.id}>
              <Link
                href={run.href}
                className="group flex items-center gap-3 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warm-gold"
                aria-label={`Open ${run.label}`}
              >
                <RowIcon kind={run.kind} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-semibold leading-tight">
                    {run.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.6875rem] text-pale-aqua/80">
                    {KIND_LABEL[run.kind]}
                    {nowMs !== null ? ` · ${formatRelative(run.createdAt, nowMs)}` : ""}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center rounded-full bg-positive/25 px-2.5 py-1 text-[0.6875rem] font-medium text-[#BFE8D2]">
                  Completed
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-pale-aqua/70 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
