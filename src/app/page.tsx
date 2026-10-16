"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Radio } from "lucide-react";
import { PageShell, useRefreshNonce } from "@/components/layout/shell";
import { Badge, SeverityMark } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { AsyncBoundary } from "@/components/ui/states";
import { SpreadChart } from "@/components/charts/spread-chart";
import { TermChart } from "@/components/charts/term-chart";
import { AlertPreview, StatusPanel } from "@/components/overview/panels";
import { StatTile } from "@/components/overview/stat-tile";
import { WatchlistTable } from "@/components/overview/watchlist-table";
import { useAsync } from "@/lib/hooks";
import {
  fetchAlerts,
  fetchContracts,
  fetchDataStatus,
  fetchRelativeValue,
  fetchTermStructure,
  fetchWatchlist,
} from "@/lib/api";
import { formatBps, formatInr, formatSigned, toneClass } from "@/lib/format";
import { productSpec } from "@/lib/products";

const DEFAULT_PAIR = { legA: "GOLDM", legB: "GOLDPETAL" } as const;

export default function OverviewPage() {
  const nonce = useRefreshNonce();

  const status = useAsync(() => fetchDataStatus(), [nonce]);
  const watchlist = useAsync(() => fetchWatchlist(), [nonce]);
  const alerts = useAsync(() => fetchAlerts(), [nonce]);
  const term = useAsync(() => fetchTermStructure(), [nonce]);
  const spread = useAsync(() => fetchRelativeValue({ ...DEFAULT_PAIR, range: "6M" }), [nonce]);
  const contracts = useAsync(() => fetchContracts({ sort: "expiry" }), [nonce]);

  const anchor = useMemo(() => {
    const rows = contracts.data ?? [];
    const spec = productSpec("GOLDM");
    const front = rows
      .filter((row) => row.productId === "GOLDM" && row.daysToExpiry >= 6)
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0];
    if (!front) return null;
    const neutralise = (settle: number) =>
      (settle / spec.quoteGrams / spec.fineness) * Math.exp(-0.065 * (front.daysToExpiry / 365));
    const estimate = neutralise(front.settle);
    const previous = neutralise(front.prevSettle);
    return {
      code: front.contractCode,
      dte: front.daysToExpiry,
      per10g: estimate * 10,
      changePct: previous === 0 ? 0 : ((estimate - previous) / previous) * 100,
    };
  }, [contracts.data]);

  const armed = useMemo(
    () => (alerts.data ?? []).filter((alert) => alert.severity !== "info"),
    [alerts.data],
  );
  const largestResidual = useMemo(() => {
    const list = alerts.data ?? [];
    if (list.length === 0) return null;
    return list.reduce((best, alert) =>
      Math.abs(alert.residualBps) > Math.abs(best.residualBps) ? alert : best,
    );
  }, [alerts.data]);

  return (
    <PageShell
      title="Overview"
      subtitle="Relative value across MCX gold futures — purity and carry removed, then tested against the cost of actually trading it. Everything below is fixture data as of 19 Oct 2026."
      actions={
        <Link href="/research">
          <Button variant="outline" size="sm" icon={<ArrowUpRight className="size-3.5" />}>
            Method & limits
          </Button>
        </Link>
      }
    >
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Fine-gold anchor (carry-neutralised)"
          value={anchor ? formatInr(anchor.per10g, 0) : "—"}
          sub={anchor ? `₹/10 g from ${anchor.code} front month` : "Waiting on contracts…"}
          tone="neutral"
          chip={
            anchor ? (
              <Badge tone={anchor.changePct >= 0 ? "up" : "down"}>
                {formatSigned(anchor.changePct, 2, "%")}
              </Badge>
            ) : undefined
          }
          footnote={
            anchor
              ? `Expiry-matched back to spot at 6.50% carry · ${anchor.dte} days out`
              : undefined
          }
        />
        <StatTile
          label="Largest residual on the board"
          value={largestResidual ? formatBps(largestResidual.residualBps, 0) : "—"}
          sub={largestResidual ? largestResidual.pairLabel : "Evaluating pairs…"}
          tone="gold"
          chip={largestResidual ? <SeverityMark severity={largestResidual.severity} /> : undefined}
          footnote={
            largestResidual ? `z ${largestResidual.zscore.toFixed(2)} · ${formatBps(largestResidual.costBps)} round trip` : undefined
          }
        />
        <StatTile
          label="Live contracts"
          value={contracts.data ? String(contracts.data.length) : "—"}
          sub="Front and deferred months across five products"
          tone="neutral"
          chip={
            contracts.data ? (
              <Badge tone={contracts.data.some((c) => c.stale) ? "warning" : "outline"}>
                {contracts.data.filter((c) => c.stale).length} STALE
              </Badge>
            ) : undefined
          }
          footnote={status.data ? `Trust score ${status.data.trustScore}/100 · ${status.data.checks.filter((c) => c.passed).length}/${status.data.checks.length} validators` : undefined}
        />
        <StatTile
          label="Armed signals"
          value={alerts.data ? `${armed.length}` : "—"}
          sub={`${alerts.data?.length ?? 0} open alerts; the rest were cost-blocked`}
          tone={armed.length > 0 ? "up" : "neutral"}
          chip={armed.length > 0 ? <Badge tone="up">GATED LIVE</Badge> : <Badge tone="outline">QUIET</Badge>}
          footnote="Entry needs |z| ≥ 2.0, 80% capture > round trip, 2-session persistence"
        />
      </div>

      {/* Watchlist + data status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel
            eyebrow="Front months"
            title="Watchlist"
            description="Click any row to open the contract explorer with that product pre-filtered."
            actions={<Badge tone="gold">DEMO</Badge>}
          >
            <AsyncBoundary
              loading={watchlist.loading}
              error={watchlist.error}
              data={watchlist.data}
              onRetry={watchlist.reload}
              empty={{ title: "No front months live" }}
            >
              {(rows) => <WatchlistTable rows={rows} />}
            </AsyncBoundary>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel
            eyebrow="Ingest"
            title="Data quality"
            description="Every check runs over the fixture set on each refresh."
          >
            <AsyncBoundary
              loading={status.loading}
              error={status.error}
              data={status.data}
              onRetry={status.reload}
            >
              {(value) => <StatusPanel status={value} />}
            </AsyncBoundary>
          </Panel>
        </Reveal>
      </div>

      {/* Default pair + alert preview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel
            eyebrow="Default pair"
            title={`${productSpec(DEFAULT_PAIR.legB).name} vs ${productSpec(DEFAULT_PAIR.legA).name} — residual basis`}
            description="Expiry-matched, purity- and carry-adjusted premium in basis points, with its lagged z-score underneath. Gold bars are outside the ±2σ entry gate."
            actions={
              <Link href="/spreads">
                <Button size="sm" variant="ghost" icon={<ArrowUpRight className="size-3.5" />}>
                  Open in spreads
                </Button>
              </Link>
            }
          >
            <AsyncBoundary
              loading={spread.loading}
              error={spread.error}
              data={spread.data}
              onRetry={spread.reload}
            >
              {(series) => (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                    <Tile label="Residual" value={formatBps(series.summary.residualBps)} tone={toneClass(series.summary.residualBps)} />
                    <Tile label="z-score" value={series.summary.zscore.toFixed(2)} tone="text-bone" />
                    <Tile label="Percentile" value={`${series.summary.percentile.toFixed(0)}th`} tone="text-ash" />
                    <Tile label="Half-life" value={`${series.summary.halfLifeDays.toFixed(1)} d`} tone="text-ash" />
                  </div>
                  <SpreadChart
                    points={series.points}
                    pairLabel={series.pairLabel}
                    entryZ={2}
                    height={330}
                  />
                </>
              )}
            </AsyncBoundary>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel
            eyebrow="Gates"
            title="Signal preview"
            description="Ranked by severity, then by distance from the mean."
          >
            <AsyncBoundary
              loading={alerts.loading}
              error={alerts.error}
              data={alerts.data}
              onRetry={alerts.reload}
            >
              {(list) => <AlertPreview alerts={list} />}
            </AsyncBoundary>
          </Panel>
        </Reveal>
      </div>

      {/* Term structure + method */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel
            eyebrow="Curves"
            title="Forward structure by days to expiry"
            description="Fine gold per gram for every product with a live contract — the shape carry is read from."
            actions={<Badge tone="info">6.50% implied</Badge>}
          >
            <AsyncBoundary
              loading={term.loading}
              error={term.error}
              data={term.data}
              onRetry={term.reload}
            >
              {(structure) => <TermChart structure={structure} height={300} />}
            </AsyncBoundary>
          </Panel>
        </Reveal>

        <Reveal delay={0.06}>
          <Panel eyebrow="Method" title="What counts as a signal">
            <ol className="space-y-2.5">
              {[
                "Match expiries, then convert both legs to ₹/g of fine gold.",
                "Remove purity (999 vs 995) and carry over the expiry gap.",
                "Score the residual on a lagged 60-session z — never same-day.",
                "Price the round trip: statutory + GST + capped brokerage + bid/ask.",
                "Fire only when 80% capture still beats that toll, twice in a row.",
              ].map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="mt-0.5 font-mono text-[0.625rem] text-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.75rem] leading-relaxed text-ash">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-xs border border-line bg-ink-800 px-3 py-2.5">
              <p className="label-mono">Decision rule</p>
              <p className="mt-1 font-mono text-[0.6875rem] leading-relaxed text-gold-bright">
                expected edge = 0.8 × |residual| − round trip &gt; 0
              </p>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[0.6875rem] text-dim">
              <Radio className="size-3" aria-hidden="true" />
              Silence between alerts is the design, not an outage.
            </p>
          </Panel>
        </Reveal>
      </div>
    </PageShell>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <p className={`font-mono text-sm tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
