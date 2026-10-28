"use client";

import { useMemo, useState } from "react";
import { Check, EyeOff, Lock } from "lucide-react";
import { Badge, SeverityMark } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBps, formatTimestamp } from "@/lib/format";
import type { Alert, Severity } from "@/lib/types";
import { cn } from "@/lib/cn";

type Filter = "all" | "critical" | "warning" | "info";

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Armed" },
  { value: "info", label: "Watch" },
];

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

interface CardProps {
  alert: Alert;
  state: "open" | "acknowledged" | "dismissed";
  onAct: (alert: Alert, action: "acknowledged" | "dismissed") => void;
}

export function AlertCard({ alert, state, onAct }: CardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      className={cn(
        "flex flex-col gap-3 border bg-ink-850 px-4 py-4 rounded-md transition-colors",
        state === "acknowledged" ? "border-line opacity-75" : "border-line",
        state === "dismissed" && "opacity-45",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <SeverityMark severity={alert.severity} />
        <span className="font-mono text-[0.6875rem] text-gold">{alert.pairLabel}</span>
        <span className="label-mono">{formatTimestamp(alert.timestamp)}</span>
        <span className="ml-auto flex items-center gap-2">
          {state === "acknowledged" && <Badge tone="info">ACKNOWLEDGED</Badge>}
          <Badge tone={alert.expectedEdgeBps > 0 ? "up" : "outline"}>
            {formatBps(alert.expectedEdgeBps)} EDGE
          </Badge>
        </span>
      </header>

      <div>
        <h3 className="text-[0.9375rem] leading-snug text-bone">{alert.title}</h3>
        <p className="mt-1.5 max-w-3xl text-[0.8125rem] leading-relaxed text-ash">{alert.summary}</p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-y border-line py-2.5">
        <Metric label="z-score" value={alert.zscore.toFixed(2)} />
        <Metric label="Residual" value={formatBps(alert.residualBps)} />
        <Metric label="Round trip" value={`${alert.costBps.toFixed(1)} bps`} />
        <Metric label="Expected edge" value={formatBps(alert.expectedEdgeBps)} />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="label-mono">Confidence</p>
          <p className="font-mono text-[0.6875rem] tabular-nums text-bone">{alert.confidence}%</p>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-750" role="presentation">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-700"
            style={{ width: `${alert.confidence}%` }}
          />
        </div>
        <p className="mt-1.5 text-[0.625rem] leading-snug text-dim">{alert.confidenceNote}</p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="text-xs text-gold transition-colors hover:text-gold-bright"
        >
          {expanded ? "Hide evidence" : `Show evidence (${alert.evidence.length} checks)`}
        </button>
        {expanded && (
          <dl className="mt-2.5 grid gap-x-6 gap-y-2 border-t border-line pt-2.5 sm:grid-cols-2">
            {alert.evidence.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-[0.6875rem] text-dim">{item.label}</dt>
                <dd className="text-right font-mono text-[0.6875rem] tabular-nums text-ash">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={state === "acknowledged" ? "ghost" : "outline"}
          onClick={() => onAct(alert, "acknowledged")}
          disabled={state === "acknowledged"}
          icon={<Check className="size-3.5" />}
        >
          {state === "acknowledged" ? "Acknowledged" : "Acknowledge"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAct(alert, "dismissed")}
          disabled={state === "dismissed"}
          icon={<EyeOff className="size-3.5" />}
        >
          Dismiss
        </Button>
        <p className="label-mono ml-auto flex items-center gap-1.5">
          <Lock className="size-3" aria-hidden="true" />
          research only · no routing
        </p>
      </footer>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <p className="font-mono text-[0.8125rem] tabular-nums text-bone">{value}</p>
    </div>
  );
}

/** Filter chips + the acknowledged/dismissed store for the whole feed. */
export function useAlertFeed(alerts: Alert[]) {
  const [filter, setFilter] = useState<Filter>("all");
  const [states, setStates] = useState<Record<string, "acknowledged" | "dismissed">>({});

  const visible = useMemo(() => {
    return alerts
      .filter((alert) => (states[alert.id] ?? "open") !== "dismissed")
      .filter((alert) => (filter === "all" ? true : alert.severity === filter))
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [alerts, filter, states]);

  const act = (alert: Alert, action: "acknowledged" | "dismissed") => {
    setStates((current) => ({ ...current, [alert.id]: action }));
  };

  return { filter, setFilter, visible, states, act, FILTERS };
}
