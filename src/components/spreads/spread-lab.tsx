"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageShell, useRefreshNonce } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { SelectField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { AsyncBoundary, ErrorState, PanelSkeleton } from "@/components/ui/states";
import { SpreadChart } from "@/components/charts/spread-chart";
import { ZGauge } from "@/components/charts/z-gauge";
import { DecompositionBar } from "@/components/charts/decomposition-bar";
import { LegCard } from "@/components/spreads/leg-card";
import { CalcExplainer } from "@/components/spreads/calc-explainer";
import { decomposition, explainSpread } from "@/lib/analytics";
import { useAsync } from "@/lib/hooks";
import { fetchContracts, fetchRelativeValue } from "@/lib/api";
import { parseInput, spreadQuerySchema } from "@/lib/validation";
import { PRODUCT_IDS, productSpec } from "@/lib/products";
import type { Contract, ProductId, SpreadSeries, TimeRange } from "@/lib/types";
import { formatBps, formatPct, toneClass } from "@/lib/format";

const RANGE_OPTIONS: ReadonlyArray<{ value: TimeRange; label: string }> = [
  { value: "1M", label: "1M" },
  { value: "3M", label: "3M" },
  { value: "6M", label: "6M" },
  { value: "1Y", label: "1Y" },
  { value: "ALL", label: "ALL" },
];

const PRODUCT_OPTIONS = PRODUCT_IDS.map((id) => ({
  value: id,
  label: `${id} — ${productSpec(id).name}`,
}));

const ENTRY_Z = 2;
const EXIT_Z = 0.5;

function frontContract(contracts: Contract[], productId: ProductId, expiry?: string): Contract | null {
  const candidates = contracts.filter(
    (contract) =>
      contract.productId === productId &&
      contract.daysToExpiry >= 6 &&
      (expiry === undefined || contract.expiry === expiry),
  );
  const pool = candidates.length > 0
    ? candidates
    : contracts.filter((contract) => contract.productId === productId);
  return [...pool].sort((a, b) => a.daysToExpiry - b.daysToExpiry)[0] ?? null;
}

export function SpreadLab() {
  const nonce = useRefreshNonce();
  const params = useSearchParams();
  const [legA, setLegA] = useState<ProductId>((params.get("legA") as ProductId | null) ?? "GOLDM");
  const [legB, setLegB] = useState<ProductId>((params.get("legB") as ProductId | null) ?? "GOLDPETAL");
  const [range, setRange] = useState<TimeRange>("6M");
  const [touched, setTouched] = useState(false);

  const parsed = useMemo(
    () => parseInput(spreadQuerySchema, { legA, legB, range }),
    [legA, legB, range],
  );
  const valid = parsed.ok;

  const series = useAsync<SpreadSeries | null>(
    () => (parsed.ok ? fetchRelativeValue(parsed.data) : Promise.resolve(null)),
    [legA, legB, range, nonce],
  );
  const contracts = useAsync(() => fetchContracts({ sort: "expiry" }), [nonce]);

  const legs = useMemo(() => {
    const rows = contracts.data ?? [];
    const a = frontContract(rows, legA, series.data?.legAExpiry);
    const b = frontContract(rows, legB, series.data?.legBExpiry);
    return { a, b };
  }, [contracts.data, series.data, legA, legB]);

  const explainer = useMemo(() => {
    if (!series.data || !legs.a || !legs.b) return null;
    return explainSpread(series.data.summary, legs.a, legs.b);
  }, [series.data, legs.a, legs.b]);

  const segments = useMemo(
    () => (series.data ? decomposition(series.data.summary) : []),
    [series.data],
  );

  const sameLegs = touched && legA === legB;

  return (
    <PageShell
      title="Spreads"
      subtitle="Pick two products and the terminal matches their expiries, strips purity and carry, then shows what is left — with the arithmetic written out underneath."
      actions={<Badge tone="gold">DEMO DATA</Badge>}
    >
      {/* Controls */}
      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            id="leg-a"
            label="Leg A (near / reference)"
            className="w-56"
            value={legA}
            onChange={(value) => {
              setTouched(true);
              setLegA(value);
            }}
            options={PRODUCT_OPTIONS}
          />
          <button
            type="button"
            onClick={() => {
              setTouched(true);
              setLegA(legB);
              setLegB(legA);
            }}
            aria-label="Swap legs"
            className="mb-0.5 flex size-8 items-center justify-center rounded-xs border border-line-strong bg-ink-800 text-ash transition-colors hover:border-gold/50 hover:text-gold-bright"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden="true" />
          </button>
          <SelectField
            id="leg-b"
            label="Leg B (far / relative)"
            className="w-56"
            value={legB}
            onChange={(value) => {
              setTouched(true);
              setLegB(value);
            }}
            options={PRODUCT_OPTIONS}
            error={sameLegs ? "Pick two different products" : null}
          />
          <div className="mb-0.5">
            <p className="label-mono mb-1.5 text-ash">Window</p>
            <Segmented
              ariaLabel="History window"
              value={range}
              onChange={setRange}
              options={RANGE_OPTIONS}
              size="md"
            />
          </div>
          <p className="label-mono ml-auto max-w-[22rem] text-right">
            front contracts: {legs.a?.contractCode ?? "—"} → {legs.b?.contractCode ?? "—"}
          </p>
        </div>
      </Panel>

      {!valid && (
        <ErrorState
          title="That pair cannot be computed"
          message="Leg A and leg B must be different products — a contract against itself is always zero after adjustment."
        />
      )}

      {valid && (
        <>
          {/* Readouts */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Readout
              label="Residual basis"
              value={series.data ? formatBps(series.data.summary.residualBps) : "…"}
              tone={series.data ? toneClass(series.data.summary.residualBps) : "text-bone"}
              hint="after purity + carry"
            />
            <Readout
              label="z-score (lagged)"
              value={series.data ? series.data.summary.zscore.toFixed(2) : "…"}
              tone={series.data && Math.abs(series.data.summary.zscore) >= ENTRY_Z ? "text-gold-bright" : "text-bone"}
              hint={`60-session, entry at ±${ENTRY_Z}.0`}
            />
            <Readout
              label="Percentile"
              value={series.data ? `${series.data.summary.percentile.toFixed(0)}th` : "…"}
              tone="text-bone"
              hint="vs its own window"
            />
            <Readout
              label="Half-life"
              value={series.data ? `${series.data.summary.halfLifeDays.toFixed(1)} d` : "…"}
              tone="text-bone"
              hint="AR(1) reversion estimate"
            />
            <Readout
              label="Round trip"
              value={series.data ? `${series.data.summary.roundTripCostBps.toFixed(1)} bps` : "…"}
              tone="text-ash"
              hint="both legs, statutory + GST + spread"
            />
            <Readout
              label="Expected edge"
              value={series.data ? formatBps(series.data.summary.expectedEdgeBps) : "…"}
              tone={series.data ? toneClass(series.data.summary.expectedEdgeBps) : "text-bone"}
              hint="0.8 capture − cost"
            />
            <Readout
              label="Carry assumption"
              value={series.data ? formatPct(series.data.summary.carryAssumptionPct) : "…"}
              tone="text-ash"
              hint="implied, not assumed flat"
            />
            <Readout
              label="Observations"
              value={series.data ? String(series.data.summary.observations) : "…"}
              tone="text-ash"
              hint={
                series.data
                  ? `${series.data.summary.staleDays} stale sessions excluded from signals`
                  : "settlements in window"
              }
            />
          </div>

          {/* Chart + gauge */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              className="lg:col-span-2"
              eyebrow={`${range} window`}
              title={series.data ? `${series.data.pairLabel} — residual basis` : "Residual basis"}
              description="Top: residual with its ±1σ band and rolling mean. Bottom: lagged z-score; gold bars are outside the entry gate."
              actions={
                series.data && (
                  <Badge tone={Math.abs(series.data.summary.zscore) >= ENTRY_Z ? "gold" : "outline"}>
                    {Math.abs(series.data.summary.zscore) >= ENTRY_Z ? "ARMED" : "INSIDE BAND"}
                  </Badge>
                )
              }
            >
              <AsyncBoundary
                loading={series.loading}
                error={series.error}
                data={series.data}
                onRetry={series.reload}
                skeleton={<PanelSkeleton rows={6} />}
                empty={{ title: "No overlapping history", hint: "These two products have no common settlement window yet." }}
              >
                {(value) => (
                  <SpreadChart points={value.points} pairLabel={value.pairLabel} entryZ={ENTRY_Z} height={360} />
                )}
              </AsyncBoundary>
            </Panel>

            <Panel
              eyebrow="Gate state"
              title="Distance from the mean"
              description="Entry at ±2.0σ, exit at ±0.5σ, hysteresis keeps it from flickering."
            >
              <div className="py-2">
                <ZGauge z={series.data?.summary.zscore ?? 0} entryZ={ENTRY_Z} exitZ={EXIT_Z} />
              </div>
              <dl className="mt-4 space-y-2.5 border-t border-line pt-3.5">
                <GateRow
                  label="Cost hurdle"
                  value={
                    series.data
                      ? series.data.summary.expectedEdgeBps > 0
                        ? "cleared"
                        : "not cleared"
                      : "…"
                  }
                  ok={series.data ? series.data.summary.expectedEdgeBps > 0 : null}
                />
                <GateRow
                  label="Raw premium"
                  value={series.data ? formatBps(series.data.summary.naiveGapBps) : "…"}
                  ok={null}
                />
                <GateRow
                  label="Robust z (MAD)"
                  value={series.data ? series.data.summary.madZ.toFixed(2) : "…"}
                  ok={null}
                />
                <GateRow
                  label="Stale sessions"
                  value={series.data ? String(series.data.summary.staleDays) : "…"}
                  ok={series.data ? series.data.summary.staleDays < 5 : null}
                />
              </dl>
              <p className="mt-4 flex items-start gap-2 text-[0.6875rem] leading-relaxed text-dim">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-up" aria-hidden="true" />
                Both legs sit at least six days from expiry: the tender window is never priced.
              </p>
            </Panel>
          </div>

          {/* Decomposition */}
          <Panel
            eyebrow="Decomposition"
            title="Raw premium, taken apart"
            description="The three terms below sum to the naive quoted premium. Only the gold slice is a candidate for trading."
          >
            <AsyncBoundary
              loading={series.loading && series.data === null}
              error={series.error}
              data={series.data}
              onRetry={series.reload}
            >
              {(value) => (
                <>
                  <DecompositionBar
                    segments={segments.map((segment, index) => ({
                      ...segment,
                      color: index === 0 ? "var(--color-info)" : index === 1 ? "var(--color-dim)" : "var(--color-gold)",
                      note: index === 0 ? "999 vs 995" : index === 1 ? `${value.summary.carryAssumptionPct.toFixed(2)}% over the gap` : "the tradeable part",
                    }))}
                    totalLabel="Naive premium"
                    totalValue={value.summary.naiveGapBps}
                  />
                  <p className="mt-3 max-w-3xl text-[0.75rem] leading-relaxed text-dim">
                    Composition check: −{Math.abs(value.summary.purityBps).toFixed(1)} +{" "}
                    {value.summary.carryBps.toFixed(1)} + {value.summary.residualBps.toFixed(1)} ={" "}
                    {value.summary.naiveGapBps.toFixed(1)} bps. Purity is fixed by contract
                    specification, carry is fixed by the two expiry dates — only the residual can
                    move.
                  </p>
                </>
              )}
            </AsyncBoundary>
          </Panel>

          {/* Calculation */}
          <Panel
            eyebrow="Calculation"
            title="Every step, with real numbers"
            description="Substitutions use the two front contracts shown below — nothing here is a hidden constant."
          >
            <AsyncBoundary
              loading={series.loading && series.data === null}
              error={series.error}
              data={series.data}
              onRetry={series.reload}
            >
              {() =>
                explainer ? (
                  <CalcExplainer steps={explainer.steps} />
                ) : contracts.loading ? (
                  <PanelSkeleton rows={5} />
                ) : (
                  <ErrorState
                    title="Contracts unavailable"
                    message="The explainer needs both front contracts from the contracts endpoint."
                    onRetry={contracts.reload}
                    compact
                  />
                )
              }
            </AsyncBoundary>
          </Panel>

          {/* Legs */}
          <div className="grid gap-4 md:grid-cols-2">
            {legs.a ? (
              <LegCard contract={legs.a} side="A" />
            ) : (
              <Panel eyebrow="Leg A" title="Waiting on contracts…">
                <PanelSkeleton rows={2} />
              </Panel>
            )}
            {legs.b ? (
              <LegCard contract={legs.b} side="B" highlighted />
            ) : (
              <Panel eyebrow="Leg B" title="Waiting on contracts…">
                <PanelSkeleton rows={2} />
              </Panel>
            )}
          </div>

          {legA !== "GOLDM" && legB !== "GOLDM" && (
            <p className="flex items-start gap-2 text-[0.6875rem] leading-relaxed text-gold/90">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Neither leg is GOLDM, the liquidity anchor. Costs above assume both books are as thin
              as the weaker leg — treat the edge as an upper bound.
            </p>
          )}
        </>
      )}
    </PageShell>
  );
}

function Readout({ label, value, tone, hint }: { label: string; value: string; tone: string; hint: string }) {
  return (
    <div className="border border-line bg-ink-850 px-4 py-3.5 rounded-md">
      <p className="label-mono">{label}</p>
      <p className={`mt-1.5 font-mono text-xl leading-none tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1.5 text-[0.625rem] leading-snug text-dim">{hint}</p>
    </div>
  );
}

function GateRow({ label, value, ok }: { label: string; value: string; ok: boolean | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label-mono">{label}</dt>
      <dd
        className={
          "font-mono text-[0.75rem] tabular-nums " +
          (ok === null ? "text-ash" : ok ? "text-up" : "text-down")
        }
      >
        {value}
        {ok !== null && <span className="sr-only">{ok ? " — passed" : " — failed"}</span>}
      </dd>
    </div>
  );
}
