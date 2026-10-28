"use client";

import { useMemo } from "react";
import { PageShell, useRefreshNonce } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { AsyncBoundary, PanelSkeleton } from "@/components/ui/states";
import { TermChart } from "@/components/charts/term-chart";
import { useAsync } from "@/lib/hooks";
import { fetchTermStructure, fetchContracts } from "@/lib/api";
import { formatBps, formatInr, formatPct } from "@/lib/format";
import { productSpec } from "@/lib/products";

export function TermStructureDashboard() {
  const nonce = useRefreshNonce();
  
  const termStructure = useAsync(() => fetchTermStructure(), [nonce]);
  const contracts = useAsync(() => fetchContracts({ sort: "expiry" }), [nonce]);
  
  const carryAnalysis = useMemo(() => {
    if (!termStructure.data || !contracts.data) return null;
    
    // Calculate implied carry from term structure
    const curves = termStructure.data.curves;
    const analysis = curves.map((curve) => {
      const spec = productSpec(curve.productId);
      const sortedPoints = [...curve.points].sort((a, b) => a.daysToExpiry - b.daysToExpiry);
      
      if (sortedPoints.length < 2) return null;
      
      const near = sortedPoints[0];
      const far = sortedPoints[sortedPoints.length - 1];
      
      const daysGap = far.daysToExpiry - near.daysToExpiry;
      const priceGap = far.finePerGram - near.finePerGram;
      const annualizedCarry = daysGap > 0 ? (priceGap / near.finePerGram) * (365 / daysGap) * 100 : 0;
      
      return {
        productId: curve.productId,
        name: spec.name,
        nearContract: near.contractCode,
        farContract: far.contractCode,
        nearPrice: near.finePerGram,
        farPrice: far.finePerGram,
        daysGap,
        priceGapBps: (priceGap / near.finePerGram) * 10000,
        annualizedCarryPct: annualizedCarry,
        points: sortedPoints,
      };
    }).filter(Boolean);
    
    return analysis;
  }, [termStructure.data, contracts.data]);

  return (
    <PageShell
      title="Term Structure"
      subtitle="Forward curves and carry analysis across MCX gold products — purity-adjusted to fine gold per gram."
      actions={<Badge tone="gold">DEMO DATA</Badge>}
    >
      {/* Term structure chart */}
      <Panel
        eyebrow="Curves"
        title="Forward structure by days to expiry"
        description="Fine gold per gram for every product with a live contract — the shape carry is read from."
        actions={<Badge tone="info">6.50% implied</Badge>}
      >
        <AsyncBoundary
          loading={termStructure.loading}
          error={termStructure.error}
          data={termStructure.data}
          onRetry={termStructure.reload}
          skeleton={<PanelSkeleton rows={6} />}
        >
          {(structure) => (
            <TermChart structure={structure} height={400} />
          )}
        </AsyncBoundary>
      </Panel>

      {/* Carry analysis per product */}
      <div className="grid gap-4 lg:grid-cols-2">
        {carryAnalysis?.map((analysis) => (
          analysis && (
            <Panel
              key={analysis.productId}
              eyebrow={analysis.productId}
              title={analysis.name}
              description={`From ${analysis.nearContract} to ${analysis.farContract}`}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="label-mono">Near price</p>
                    <p className="font-mono text-lg tabular-nums text-bone">
                      {formatInr(analysis.nearPrice, 2)}/g
                    </p>
                    <p className="text-xs text-dim mt-1">{analysis.nearContract}</p>
                  </div>
                  <div>
                    <p className="label-mono">Far price</p>
                    <p className="font-mono text-lg tabular-nums text-bone">
                      {formatInr(analysis.farPrice, 2)}/g
                    </p>
                    <p className="text-xs text-dim mt-1">{analysis.farContract}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-line">
                  <div>
                    <p className="label-mono">Price gap</p>
                    <p className="font-mono text-base tabular-nums text-ash">
                      {formatBps(analysis.priceGapBps)}
                    </p>
                  </div>
                  <div>
                    <p className="label-mono">Annualized carry</p>
                    <p className="font-mono text-base tabular-nums text-gold">
                      {formatPct(analysis.annualizedCarryPct)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-dim pt-3 border-t border-line">
                  {analysis.daysGap} days between contracts
                </p>
              </div>
            </Panel>
          )
        ))}
      </div>

      {/* Methodology note */}
      <Panel eyebrow="Method" title="How carry is computed">
        <ol className="space-y-2.5">
          {[
            "Every contract is normalized to ₹/g of fine gold (purity 999).",
            "The curve is plotted against days to expiry, not contract month.",
            "Carry is the annualized slope from near to far contract.",
            "A flat curve (near ≈ far) implies zero time value.",
            "Contango (far > near) implies positive carry; backwardation implies negative.",
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
          <p className="label-mono">Reference rate</p>
          <p className="mt-1 font-mono text-[0.6875rem] leading-relaxed text-gold-bright">
            MIBOR proxy: 6.60% · Implied from curve: 6.50%
          </p>
        </div>
      </Panel>
    </PageShell>
  );
}
