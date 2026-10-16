"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { SeverityMark } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { formatBps } from "@/lib/format";
import type { Alert, DataStatus } from "@/lib/types";

/** Top of the alert stack — a preview, not a replacement for /signals. */
export function AlertPreview({ alerts }: { alerts: Alert[] }) {
  const top = alerts.slice(0, 3);

  if (top.length === 0) {
    return (
      <EmptyState
        compact
        title="No signals in the window"
        hint="Gates are evaluated every settlement; silence is a valid answer."
      />
    );
  }

  return (
    <div className="space-y-3">
      {top.map((alert) => (
        <article key={alert.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-2">
            <SeverityMark severity={alert.severity} />
            <span className="label-mono">{alert.pairLabel}</span>
          </div>
          <p className="mt-1.5 text-[0.8125rem] leading-snug text-bone">{alert.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[0.6875rem] tabular-nums text-dim">
              z {alert.zscore.toFixed(2)}
            </span>
            <span className="text-line-strong">·</span>
            <span className="font-mono text-[0.6875rem] tabular-nums text-dim">
              {formatBps(alert.expectedEdgeBps)} edge
            </span>
            <span className="text-line-strong">·</span>
            <span className="font-mono text-[0.6875rem] tabular-nums text-dim">
              {alert.confidence}% conf.
            </span>
          </div>
        </article>
      ))}
      <Link
        href="/signals"
        className="inline-flex items-center gap-1.5 text-xs text-gold transition-colors hover:text-gold-bright"
      >
        All signals and backtests <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Trust score plus the validator checklist — the honest data-quality panel. */
export function StatusPanel({ status }: { status: DataStatus }) {
  const passed = status.checks.filter((check) => check.passed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div>
          <p className="label-mono">Trust score</p>
          <p className="mt-1 font-mono text-3xl leading-none tabular-nums text-gold-bright">
            {status.trustScore}
            <span className="text-sm text-dim">/100</span>
          </p>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-750">
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-700"
              style={{ width: `${status.trustScore}%` }}
            />
          </div>
          <p className="text-[0.625rem] leading-snug text-dim">
            {passed} of {status.checks.length} validators passed ·{" "}
            {(status.rows / 1000).toFixed(0)}k rows
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {status.checks.map((check) => (
          <li key={check.label} className="flex items-start gap-2">
            <span
              className={
                check.passed
                  ? "mt-0.5 text-up"
                  : "mt-0.5 text-down"
              }
              aria-hidden="true"
            >
              {check.passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="text-[0.75rem] leading-snug text-ash">
                {check.label}
                <span className="sr-only">{check.passed ? " — passed" : " — failed"}</span>
              </p>
              <p className="mt-0.5 text-[0.625rem] leading-snug text-dim break-words">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3">
        <div>
          <dt className="label-mono">Ingest path</dt>
          <dd className="mt-0.5 text-[0.6875rem] leading-snug text-ash">{status.ingestPath}</dd>
        </div>
        <div>
          <dt className="label-mono">Contracts built</dt>
          <dd className="mt-0.5 font-mono text-[0.6875rem] tabular-nums text-ash">
            {status.contracts} · {status.rows.toLocaleString("en-IN")} rows
          </dd>
        </div>
      </dl>
    </div>
  );
}
