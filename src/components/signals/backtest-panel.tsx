"use client";

import { useMemo, useState } from "react";
import { Activity, Play, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberField, SelectField } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { ErrorState, PanelSkeleton } from "@/components/ui/states";
import { EquityChart } from "@/components/charts/equity-chart";
import { useInterval } from "@/lib/hooks";
import { createBacktest, defaultBacktestParams } from "@/lib/api";
import { backtestParamsSchema, parseInput, type BacktestParamsInput } from "@/lib/validation";
import { PRODUCT_IDS, productSpec } from "@/lib/products";
import type { BacktestResult } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";

const PRODUCT_OPTIONS = PRODUCT_IDS.map((id) => ({
  value: id,
  label: `${id} — ${productSpec(id).name}`,
}));

type Status = "idle" | "running" | "done" | "error";

const VERDICT_STYLE: Record<BacktestResult["metrics"]["verdict"], { tone: "up" | "warning" | "down"; title: string; blurb: string }> = {
  robust: {
    tone: "up",
    title: "Survives the controls",
    blurb: "Deflated Sharpe ≥ 0.95, PBO ≤ 0.25 and a positive out-of-sample Sharpe. One seeded run — replicate before you believe it.",
  },
  inconclusive: {
    tone: "warning",
    title: "Inconclusive",
    blurb: "Some evidence of edge, but the multiple-testing controls do not fully clear. Treat it as a lead, not a result.",
  },
  "no edge": {
    tone: "down",
    title: "No edge after costs",
    blurb: "Once round-trip costs and multiple testing are charged, the strategy does not pay for itself. This is the most common honest answer.",
  },
};

export function BacktestPanel() {
  const { push } = useToast();
  const [params, setParams] = useState<BacktestParamsInput>(() => defaultBacktestParams());
  const [issues, setIssues] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useInterval(
    () => setProgress((value) => (value >= 92 ? value : value + 6)),
    status === "running" ? 90 : null,
  );

  const fieldErrors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const issue of issues) {
      const [path, text] = issue.split(": ");
      if (path && text) map[path] = text;
    }
    return map;
  }, [issues]);

  function update<K extends keyof BacktestParamsInput>(key: K, value: BacktestParamsInput[K]) {
    setParams((current) => ({ ...current, [key]: value }));
    setIssues((current) => current.filter((issue) => !issue.startsWith(`${String(key)}:`)));
  }

  async function run() {
    const parsed = parseInput(backtestParamsSchema, params);
    if (!parsed.ok) {
      setIssues(parsed.issues);
      push({ tone: "error", title: "Parameters rejected", description: parsed.issues[0] });
      return;
    }
    setIssues([]);
    setStatus("running");
    setProgress(4);
    setMessage(null);
    try {
      const output = await createBacktest(parsed.data);
      setResult(output);
      setStatus("done");
      setProgress(100);
      push({
        tone: output.metrics.verdict === "no edge" ? "info" : "success",
        title: `Run complete — ${output.metrics.verdict}`,
        description: `${output.metrics.trades} trades · OOS Sharpe ${output.metrics.sharpeOos.toFixed(2)} · DSR ${output.metrics.dsr.toFixed(2)}`,
      });
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "Run failed.";
      setMessage(text);
      setStatus("error");
      push({ tone: "error", title: "Backtest failed", description: text });
    }
  }

  return (
    <div className="space-y-4">
      <Panel
        eyebrow="Walk-forward lab"
        title="Test the gate, not the chart"
        description="Lagged signals, matched fine grams, an explicit round trip, tender-window avoidance — then two multiple-testing controls on top."
        actions={
          <Button variant="primary" size="sm" onClick={run} loading={status === "running"} icon={<Play className="size-3.5" />}>
            {status === "running" ? "Running…" : result ? "Re-run" : "Run backtest"}
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            id="bt-lega"
            label="Leg A"
            value={params.legA}
            onChange={(value) => update("legA", value)}
            options={PRODUCT_OPTIONS}
            error={fieldErrors.legA}
          />
          <SelectField
            id="bt-legb"
            label="Leg B"
            value={params.legB}
            onChange={(value) => update("legB", value)}
            options={PRODUCT_OPTIONS}
            error={fieldErrors.legB}
          />
          <NumberField
            id="bt-entry"
            label="Entry |z|"
            value={params.entryZ}
            onChange={(value) => update("entryZ", value)}
            min={1}
            max={4}
            step={0.1}
            suffix="σ"
            error={fieldErrors.entryZ}
            hint="Disarm only below half of this"
          />
          <NumberField
            id="bt-exit"
            label="Exit |z|"
            value={params.exitZ}
            onChange={(value) => update("exitZ", value)}
            min={-1}
            max={2}
            step={0.1}
            suffix="σ"
            error={fieldErrors.exitZ}
            hint="Hysteresis: must be below entry"
          />
          <NumberField
            id="bt-window"
            label="z-window"
            value={params.windowDays}
            onChange={(value) => update("windowDays", value)}
            min={20}
            max={250}
            step={10}
            suffix="d"
            error={fieldErrors.windowDays}
            hint="Rolling mean/std, lagged one session"
          />
          <NumberField
            id="bt-cost"
            label="Cost multiplier"
            value={params.costMultiplier}
            onChange={(value) => update("costMultiplier", value)}
            min={0.5}
            max={3}
            step={0.25}
            suffix="×"
            error={fieldErrors.costMultiplier}
            hint="1× = published slabs; 2× = stressed"
          />
          <NumberField
            id="bt-train"
            label="Train window"
            value={params.trainDays}
            onChange={(value) => update("trainDays", value)}
            min={120}
            max={400}
            step={10}
            suffix="d"
            error={fieldErrors.trainDays}
            hint="History before each test fold"
          />
          <NumberField
            id="bt-test"
            label="Test window"
            value={params.testDays}
            onChange={(value) => update("testDays", value)}
            min={20}
            max={120}
            step={10}
            suffix="d"
            error={fieldErrors.testDays}
            hint="Out-of-sample segment length"
          />
        </div>

        {status === "running" && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="label-mono flex items-center gap-1.5 text-gold">
                <Activity className="size-3" aria-hidden="true" />
                walking forward…
              </p>
              <p className="label-mono">{progress}%</p>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-750">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4">
            <ErrorState title="Run failed" message={message ?? undefined} onRetry={run} compact />
          </div>
        )}
      </Panel>

      {status === "running" && (
        <Panel eyebrow="Results" title="Crunching">
          <PanelSkeleton rows={6} />
        </Panel>
      )}

      {status !== "running" && result && (
        <ResultsPanel result={result} />
      )}

      {status === "idle" && !result && (
        <Panel
          eyebrow="Results"
          title="No run yet"
          description="The defaults are the pair most likely to survive costs — GOLDM against GOLDPETAL at ±2σ with a 60-session window."
        >
          <div className="flex flex-col gap-2 py-4 text-[0.8125rem] leading-relaxed text-ash">
            <p>
              When you run it, you get an out-of-sample equity curve in basis points, a fold table,
              and two multiple-testing controls — the deflated Sharpe ratio and the probability of
              backtest overfitting.
            </p>
            <p className="text-dim">
              The usual honest outcome on this fixture set is <span className="text-down">no edge</span>:
              raw dislocations are real, but fixed per-order costs on a 1 g leg swallow them.
            </p>
          </div>
        </Panel>
      )}
    </div>
  );
}

function ResultsPanel({ result }: { result: BacktestResult }) {
  const { metrics } = result;
  const verdict = VERDICT_STYLE[metrics.verdict];

  return (
    <>
      <Panel
        eyebrow={`Run ${result.id} · ${result.createdAt}`}
        title="Out-of-sample results"
        actions={
          <span className="flex items-center gap-2">
            <Badge tone={verdict.tone === "up" ? "up" : verdict.tone === "warning" ? "warning" : "critical"}>
              {metrics.verdict.toUpperCase()}
            </Badge>
          </span>
        }
      >
        <div className="flex items-start gap-2.5 rounded-xs border border-line bg-ink-800 px-3 py-2.5">
          <ShieldAlert
            className={cn("mt-0.5 size-4 shrink-0", verdict.tone === "up" ? "text-up" : verdict.tone === "warning" ? "text-gold" : "text-down")}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm text-bone">{verdict.title}</p>
            <p className="mt-0.5 text-[0.75rem] leading-relaxed text-dim">{verdict.blurb}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricTile label="Trades (OOS)" value={String(metrics.trades)} />
          <MetricTile label="Hit rate" value={`${metrics.hitRatePct.toFixed(0)}%`} />
          <MetricTile
            label="Sharpe (OOS)"
            value={metrics.sharpeOos.toFixed(2)}
            tone={metrics.sharpeOos > 0 ? "text-up" : "text-down"}
          />
          <MetricTile label="Max drawdown" value={`${metrics.maxDrawdownPct.toFixed(2)}%`} tone="text-down" />
          <MetricTile
            label="Net PnL"
            value={`${metrics.netPnlBps >= 0 ? "+" : "−"}${Math.abs(metrics.netPnlBps).toFixed(1)} bps`}
            tone={metrics.netPnlBps > 0 ? "text-up" : "text-down"}
          />
          <MetricTile label="Gross PnL" value={`${metrics.grossPnlBps.toFixed(1)} bps`} />
          <MetricTile label="Round trip" value={`${metrics.roundTripCostBps.toFixed(1)} bps`} />
          <MetricTile label="Breakeven cost" value={`${metrics.breakevenCostBps.toFixed(1)} bps`} />
          <MetricTile label="Half-life" value={`${metrics.halfLifeDays.toFixed(1)} d`} />
          <MetricTile
            label="Deflated Sharpe"
            value={metrics.dsr.toFixed(2)}
            tone={metrics.dsr >= 0.95 ? "text-up" : metrics.dsr >= 0.75 ? "text-gold" : "text-down"}
          />
          <MetricTile
            label="PBO (CSCV)"
            value={metrics.pbo.toFixed(2)}
            tone={metrics.pbo <= 0.25 ? "text-up" : metrics.pbo <= 0.4 ? "text-gold" : "text-down"}
          />
          <MetricTile
            label="Power floor"
            value={metrics.powerFloorSharpe.toFixed(1)}
            tone="text-ash"
            hint="min detectable SR"
          />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          eyebrow="Equity"
          title="Cumulative basis points after costs"
          description="Every test fold concatenated; between folds the strategy is flat."
        >
          <EquityChart points={result.equity} height={300} />
        </Panel>

        <Panel eyebrow="Folds" title="Walk-forward log">
          <div className="scroll-thin -mx-1 overflow-x-auto">
            <table className="w-full min-w-[18rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-line">
                  <th className="label-mono py-1.5 text-left font-normal">Fold</th>
                  <th className="label-mono py-1.5 text-left font-normal">Test window</th>
                  <th className="label-mono py-1.5 text-right font-normal">Trades</th>
                  <th className="label-mono py-1.5 text-right font-normal">Sharpe</th>
                </tr>
              </thead>
              <tbody>
                {result.folds.map((fold) => (
                  <tr key={fold.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2 font-mono text-gold">{fold.id}</td>
                    <td className="py-2 font-mono text-[0.6875rem] text-dim">
                      {fold.testStart.slice(5)} → {fold.testEnd.slice(5)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-ash">{fold.trades}</td>
                    <td
                      className={
                        "py-2 text-right font-mono tabular-nums " +
                        (fold.sharpe > 0 ? "text-up" : "text-down")
                      }
                    >
                      {fold.sharpe.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[0.625rem] leading-relaxed text-dim">
            Sharpe is computed on each fold&apos;s daily basis-point returns, annualised at 250 sessions.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Assumptions" title="What this run takes for granted">
          <ul className="space-y-2.5">
            {result.assumptions.map((item) => (
              <li key={item} className="flex gap-2.5 text-[0.75rem] leading-relaxed text-ash">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-up" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel eyebrow="Limitations" title="What it does not prove">
          <ul className="space-y-2.5">
            {result.limitations.map((item) => (
              <li key={item} className="flex gap-2.5 text-[0.75rem] leading-relaxed text-ash">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-gold" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function MetricTile({
  label,
  value,
  tone = "text-bone",
  hint,
}: {
  label: string;
  value: string;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="border border-line bg-ink-800 px-3 py-2.5 rounded-sm">
      <p className="label-mono">{label}</p>
      <p className={cn("mt-1 font-mono text-[0.9375rem] leading-none tabular-nums", tone)}>{value}</p>
      {hint && <p className="mt-1 text-[0.5625rem] text-dim">{hint}</p>}
    </div>
  );
}
