import { productSpec } from "@/lib/products";
import type { Contract, SpreadSummary } from "@/lib/types";

/**
 * Step-by-step reconstruction of the relative-value calculation.
 *
 * Inputs are the computed summary plus the two live contracts the pair uses —
 * everything here is data the API layer already serves, so the explainer, the
 * chart and the alert cards can never quote different numbers.
 */

export interface CalcStep {
  id: string;
  label: string;
  formula: string;
  substitution: string;
  result: string;
  note?: string;
  tone?: "neutral" | "positive" | "negative" | "muted";
}

export interface SpreadExplainer {
  steps: CalcStep[];
  /** Expiry gap implied by the two contracts, in days. */
  expiryGapDays: number;
}

const bps = (value: number, digits = 1): string =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)} bps`;

const inr = (value: number): string =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function explainSpread(summary: SpreadSummary, legA: Contract, legB: Contract): SpreadExplainer {
  const specA = productSpec(summary.legA);
  const specB = productSpec(summary.legB);
  const levelBps = summary.residualBps + summary.carryBps;
  const samePurity = specA.fineness === specB.fineness;
  const expiryGapDays = legB.daysToExpiry - legA.daysToExpiry;

  const steps: CalcStep[] = [
    {
      id: "quote-a",
      label: `Quoted price of ${specA.name}`,
      formula: "settle ÷ quoteGrams",
      substitution: `₹${legA.settle.toLocaleString("en-IN")} ÷ ${specA.quoteGrams} g`,
      result: `${inr(legA.quotedPerGram)}/g`,
      note: `Purity untouched: ${specA.purity} (${specA.fineness.toFixed(3)} fine) · ${legA.contractCode}`,
      tone: "neutral",
    },
    {
      id: "quote-b",
      label: `Quoted price of ${specB.name}`,
      formula: "settle ÷ quoteGrams",
      substitution: `₹${legB.settle.toLocaleString("en-IN")} ÷ ${specB.quoteGrams} g`,
      result: `${inr(legB.quotedPerGram)}/g`,
      note: `Purity untouched: ${specB.purity} (${specB.fineness.toFixed(3)} fine) · ${legB.contractCode}`,
      tone: "neutral",
    },
    {
      id: "naive",
      label: "Naive quoted premium",
      formula: "ln(B ÷ A) × 10⁴",
      substitution: `ln(${inr(legB.quotedPerGram)} ÷ ${inr(legA.quotedPerGram)}) × 10⁴`,
      result: bps(summary.naiveGapBps),
      note: "The headline gap a price screen shows — not tradeable as-is.",
      tone: summary.naiveGapBps >= 0 ? "positive" : "negative",
    },
    {
      id: "purity",
      label: "Purity contribution (999 vs 995)",
      formula: "−ln(fineA ÷ fineB) × 10⁴",
      substitution: `−ln(${specA.fineness.toFixed(3)} ÷ ${specB.fineness.toFixed(3)}) × 10⁴`,
      result: bps(-summary.purityBps),
      note: samePurity
        ? "Both legs quote the same fineness — this term is exactly zero."
        : `${specA.purity} and ${specB.purity} differ, so part of the gap is bullion quality.`,
      tone: "muted",
    },
    {
      id: "fine-b",
      label: `${specB.name} restated in fine gold`,
      formula: "quoted ÷ fineness × 999",
      substitution: `${inr(legB.quotedPerGram)} ÷ ${specB.fineness.toFixed(3)} × 999`,
      result: `${inr(legB.finePerGram)}/g`,
      note: "Comparable unit with leg A — the only basis the exchange delivers.",
      tone: "neutral",
    },
    {
      id: "expiry-gap",
      label: "Expiry gap",
      formula: "DTE(B) − DTE(A)",
      substitution: `${legB.daysToExpiry} d − ${legA.daysToExpiry} d`,
      result: `${expiryGapDays} day${Math.abs(expiryGapDays) === 1 ? "" : "s"}`,
      note: `${legA.contractCode} expires ${legA.expiry}, ${legB.contractCode} expires ${legB.expiry}`,
      tone: "neutral",
    },
    {
      id: "carry",
      label: "Cost of carry over the gap",
      formula: "r × Δt × 10⁴",
      substitution: `${summary.carryAssumptionPct.toFixed(2)}% × ${expiryGapDays} ÷ 365 × 10⁴`,
      result: bps(summary.carryBps),
      note: "Implied rate read off the curve; the nearer expiry stays fixed.",
      tone: "muted",
    },
    {
      id: "level",
      label: "Fine-gold level gap",
      formula: "residual + carry",
      substitution: `${bps(summary.residualBps)} + ${bps(summary.carryBps)}`,
      result: bps(levelBps),
      note: "What the two contracts actually differ by, before carry is stripped.",
      tone: levelBps >= 0 ? "positive" : "negative",
    },
    {
      id: "residual",
      label: "Residual basis — the candidate signal",
      formula: "level − carry",
      substitution: `${bps(levelBps)} − ${bps(summary.carryBps)}`,
      result: bps(summary.residualBps),
      note: "Purity and carry removed. What is left is dislocation, not arithmetic.",
      tone: summary.residualBps >= 0 ? "positive" : "negative",
    },
    {
      id: "cost",
      label: "Round-trip cost, both legs",
      formula: "statutory + 2 × brokerage + bid/ask (A + B)",
      substitution: `GST on brokerage + capped ₹/order + modelled spread`,
      result: `${summary.roundTripCostBps.toFixed(1)} bps`,
      note: "Published slabs, 18% GST on brokerage, brokerage capped per order.",
      tone: "muted",
    },
    {
      id: "edge",
      label: "Expected edge after costs",
      formula: "0.8 × |residual| − cost",
      substitution: `0.8 × ${Math.abs(summary.residualBps).toFixed(1)} − ${summary.roundTripCostBps.toFixed(1)}`,
      result: bps(summary.expectedEdgeBps),
      note:
        summary.expectedEdgeBps > 0
          ? "Positive: a 20% haircut on a mean reversion that only captures part of the move still pays."
          : "Negative: the signal is real but the toll booth eats it — no alert will fire on this pair.",
      tone: summary.expectedEdgeBps > 0 ? "positive" : "negative",
    },
  ];

  return { steps, expiryGapDays };
}

/**
 * Contribution bar: the three terms that sum exactly to the naive premium —
 * naive = −purity + carry + residual.
 */
export function decomposition(summary: SpreadSummary): Array<{
  label: string;
  valueBps: number;
  share: number;
}> {
  const parts = [
    { label: "Purity", valueBps: -summary.purityBps },
    { label: "Carry", valueBps: summary.carryBps },
    { label: "Residual", valueBps: summary.residualBps },
  ];
  const total = parts.reduce((sum, part) => sum + part.valueBps, 0) || 1;
  return parts.map((part) => ({ ...part, share: (part.valueBps / total) * 100 }));
}
