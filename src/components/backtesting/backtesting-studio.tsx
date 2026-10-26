"use client";

import { useState, useMemo } from "react";
import { PageShell, useRefreshNonce } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { SelectField, NumberField } from "@/components/ui/field";
import { AsyncBoundary } from "@/components/ui/states";
import { EquityChart } from "@/components/charts/equity-chart";
import { useAsync } from "@/lib/hooks";
import { createBacktest, fetchBacktest } from "@/lib/api";
import { PRODUCT_IDS, productSpec } from "@/lib/products";
import { formatPct, formatSigned } from "@/lib/format";
import type { ProductId, BacktestResult } from "@/lib/types";

const PRODUCT_OPTIONS = PRODUCT_IDS.map((id) => ({
  value: id,
  label: `${id} — ${productSpec(id).name}`,
}));

interface BacktestParams {
  legA: ProductId;
  legB: ProductId;
  entryZ: number;
  exitZ: number;
  windowDays: number;
  trainDays: number;
  testDays: number;
  costMultiplier: number;
}

export function BacktestingStudio() {
  const nonce = useRefreshNonce();
  
  const [params, setParams] = useState<BacktestParams>({
    legA: "GOLDM",
    legB: "GOLDPETAL",
    entryZ: 2.0,
    exitZ: 0.5,
    windowDays: 60,
    trainDays: 250,
    testDays: 60,
    costMultiplier: 1.0,
  });
  
  const [backtestId, setBacktestId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  
  const backtest = useAsync<BacktestResult | null>(
    () => backtestId ? fetchBacktest(backtestId) : Promise.resolve(null),
    [backtestId, nonce]
  );
  
  const handleRunBacktest = async () => {
    if (params.legA === params.legB) return;
    
    setRunning(true);
    try {
      const result = await createBacktest({
        legA: params.legA,
        legB: params.legB,
        entryZ: params.entryZ,
        exitZ: params.exitZ,
        windowDays: params.windowDays,
        trainDays: params.trainDays,
        testDays: params.testDays,
        costMultiplier: params.costMultiplier,
      });
      setBacktestId(result.id);
    } catch (error) {
      console.error("Backtest failed:", error);
    } finally {
      setRunning(false);
    }
  };
  
  const stats = useMemo(() => {
    if (!backtest.data) return null;
    const m = backtest.data.metrics;
    
    return {
      trades: m.trades,
      winRate: m.hitRatePct,
      sharpe: m.sharpeOos,
      maxDrawdown: m.maxDrawdownPct,
    };
  }, [backtest.data]);

  return (
    <PageShell
      title="Backtesting Studio"
      subtitle="Walk-forward backtest with cost-adjusted signals — train on historical data, test out-of-sample, then roll forward."
      actions={<Badge tone="warning">DEMO DATA</Badge>}
    >
      {/* Parameters */}
      <Panel eyebrow="Configuration" title="Backtest parameters">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SelectField
            id="leg-a"
            label="Leg A (near)"
            value={params.legA}
            onChange={(value) => setParams(p => ({ ...p, legA: value as ProductId }))}
            options={PRODUCT_OPTIONS}
          />
          <SelectField
            id="leg-b"
            label="Leg B (far)"
            value={params.legB}
            onChange={(value) => setParams(p => ({ ...p, legB: value as ProductId }))}
            options={PRODUCT_OPTIONS}
            error={params.legA === params.legB ? "Must be different from leg A" : null}
          />
          <NumberField
            id="entry-z"
            label="Entry z-score"
            value={params.entryZ}
            onChange={(value) => setParams(p => ({ ...p, entryZ: value }))}
            min={1}
            max={4}
            step={0.1}
          />
          <NumberField
            id="exit-z"
            label="Exit z-score"
            value={params.exitZ}
            onChange={(value) => setParams(p => ({ ...p, exitZ: value }))}
            min={-1}
            max={2}
            step={0.1}
          />
          <NumberField
            id="window"
            label="Rolling window (days)"
            value={params.windowDays}
            onChange={(value) => setParams(p => ({ ...p, windowDays: value }))}
            min={20}
            max={250}
            step={10}
          />
          <NumberField
            id="train"
            label="Train window (days)"
            value={params.trainDays}
            onChange={(value) => setParams(p => ({ ...p, trainDays: value }))}
            min={120}
            max={400}
            step={10}
          />
          <NumberField
            id="test"
            label="Test window (days)"
            value={params.testDays}
            onChange={(value) => setParams(p => ({ ...p, testDays: value }))}
            min={20}
            max={120}
            step={10}
          />
          <NumberField
            id="cost-mult"
            label="Cost multiplier"
            value={params.costMultiplier}
            onChange={(value) => setParams(p => ({ ...p, costMultiplier: value }))}
            min={0.5}
            max={3}
            step={0.1}
          />
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleRunBacktest}
            disabled={params.legA === params.legB || running}
            loading={running}
          >
            Run backtest
          </Button>
          <p className="text-xs text-dim">
            Train on {params.trainDays} days, test on {params.testDays} days, walk forward
          </p>
        </div>
      </Panel>

      {/* Results */}
      {backtest.data && (
        <>
          {/* Equity curve */}
          <Panel
            eyebrow="Performance"
            title="Equity curve (out-of-sample)"
            description="Each fold is trained in-sample, then tested out-of-sample — concatenated results show real performance."
          >
            <AsyncBoundary
              loading={backtest.loading}
              error={backtest.error}
              data={backtest.data}
              onRetry={backtest.reload}
            >
              {(result) => (
                <EquityChart
                  points={result.equity}
                  height={350}
                />
              )}
            </AsyncBoundary>
          </Panel>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Total trades"
              value={stats?.trades ?? 0}
              hint="Out-of-sample only"
            />
            <StatTile
              label="Win rate"
              value={formatPct(stats?.winRate ?? 0)}
              hint="Trades with positive PnL"
              tone={stats && stats.winRate > 50 ? "up" : "neutral"}
            />
            <StatTile
              label="Sharpe ratio"
              value={(stats?.sharpe ?? 0).toFixed(2)}
              hint="Out-of-sample only"
              tone={stats && stats.sharpe > 1 ? "up" : "neutral"}
            />
            <StatTile
              label="Max drawdown"
              value={formatSigned(stats?.maxDrawdown ?? 0, 2, "%")}
              hint="Peak-to-trough decline"
              tone="down"
            />
          </div>

          {/* Research integrity */}
          <Panel
            eyebrow="Integrity"
            title="Research metrics"
            description="Quantified overfitting risk — lower PBO and higher DSR indicate more robust results."
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="label-mono">Deflated Sharpe Ratio</p>
                <p className="font-mono text-lg tabular-nums text-bone">
                  {backtest.data.metrics.dsr.toFixed(3)}
                </p>
                <p className="text-xs text-dim mt-1">Corrects for multiple testing</p>
              </div>
              <div>
                <p className="label-mono">Probability of Overfitting</p>
                <p className="font-mono text-lg tabular-nums text-bone">
                  {(backtest.data.metrics.pbo * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-dim mt-1">CSCV estimate</p>
              </div>
              <div className="col-span-2">
                <p className="label-mono">Verdict</p>
                <p className={`font-mono text-base ${
                  backtest.data.metrics.verdict === "robust" ? "text-up" :
                  backtest.data.metrics.verdict === "inconclusive" ? "text-gold" : "text-down"
                }`}>
                  {backtest.data.metrics.verdict.toUpperCase()}
                </p>
              </div>
            </div>
          </Panel>
        </>
      )}

      {/* Methodology */}
      <Panel eyebrow="Method" title="Walk-forward validation">
        <ol className="space-y-2.5">
          {[
            "Split the full history into N folds (train window + test window).",
            "For each fold: train the model on the train window only.",
            "Generate signals on the test window, using only t-1 data.",
            "Execute trades at settlement prices ± modeled slippage.",
            "Apply full round-trip costs: brokerage, CTT, GST, slippage.",
            "Concatenate test-window results — this is out-of-sample performance.",
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
          <p className="label-mono">Research integrity</p>
          <p className="mt-1 font-mono text-[0.6875rem] leading-relaxed text-gold-bright">
            In-sample metrics are never shown. All performance is out-of-sample.
          </p>
        </div>
      </Panel>
    </PageShell>
  );
}

function StatTile({ 
  label, 
  value, 
  hint, 
  tone = "neutral" 
}: { 
  label: string; 
  value: string | number; 
  hint: string;
  tone?: "neutral" | "up" | "down" | "gold";
}) {
  const toneClass = {
    neutral: "text-bone",
    up: "text-up",
    down: "text-down",
    gold: "text-gold",
  }[tone];

  return (
    <div className="border border-line bg-ink-850 px-4 py-3.5 rounded-md">
      <p className="label-mono">{label}</p>
      <p className={`mt-1.5 font-mono text-xl leading-none tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-1.5 text-[0.625rem] leading-snug text-dim">{hint}</p>
    </div>
  );
}
