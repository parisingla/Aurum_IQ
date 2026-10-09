/**
 * Domain types for Aurum IQ.
 *
 * Everything the UI renders flows through these shapes, so the mock layer and
 * a future HTTP layer are interchangeable. All monetary values are in INR
 * unless the field name says otherwise.
 */

export type ProductId = "GOLD" | "GOLDM" | "GOLDTEN" | "GOLDGUINEA" | "GOLDPETAL";

export type ExpiryBand = "fifth" | "monthEnd";

export interface ProductSpec {
  id: ProductId;
  name: string;
  unitGrams: number;
  quoteGrams: number;
  fineness: number;
  purity: 995 | 999;
  tickInr: number;
  tickValueInr: number;
  expiryBand: ExpiryBand;
  expiryRule: string;
  listing: string;
  liquidity: "high" | "medium" | "low";
  delivery: string;
  listedSince: string;
  /** Point-in-time caveat or an unresolved conflict in the sources. */
  caveat?: string;
  /** Short line shown in the explorer drawer. */
  blurb: string;
}

export interface Contract {
  id: string;
  symbol: ProductId;
  contractCode: string;
  productId: ProductId;
  expiry: string;
  lastTradingDay: string;
  tenderStart: string;
  tradeDate: string;
  settle: number;
  open: number;
  high: number;
  low: number;
  prevSettle: number;
  volumeLots: number;
  openInterestLots: number;
  valueLakh: number;
  stale: boolean;
  /** settle / quoteGrams / fineness — INR per gram of fine gold. */
  finePerGram: number;
  /** settle / quoteGrams — INR per quoted gram, purity untouched. */
  quotedPerGram: number;
  daysToExpiry: number;
}

export interface WatchRow {
  productId: ProductId;
  name: string;
  contractCode: string;
  expiry: string;
  settle: number;
  changeAbs: number;
  changePct: number;
  finePerGram: number;
  volumeLots: number;
  openInterestLots: number;
  daysToExpiry: number;
  liquidity: ProductSpec["liquidity"];
  stale: boolean;
}

export interface TrustCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface DataStatus {
  asOf: string;
  generatedAt: string;
  source: "demo" | "api";
  rows: number;
  contracts: number;
  trustScore: number;
  checks: TrustCheck[];
  ingestPath: string;
  nextExpected: string;
}

export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "ALL";

export interface SpreadPoint {
  date: string;
  /** Expiry-matched residual basis in basis points (B relative to A). */
  basisBps: number;
  /** Lagged rolling z-score of the basis (normalisers use data through t-1). */
  zscore: number;
  /** Robust z using median / (MAD × 1.4826). */
  madZ: number;
  /** Empirical percentile of the basis inside the window, 0–100. */
  percentile: number;
  /** Rolling mean of the basis — the reference average. */
  refAvgBps: number;
  /** Rolling band (mean ± 1 sd) for the chart. */
  refUpperBps: number;
  refLowerBps: number;
  /** Naive quoted premium before any adjustment, in bps. */
  naiveGapBps: number;
  purityBps: number;
  carryBps: number;
  costBps: number;
}

export interface SpreadSummary {
  pairKey: string;
  legA: ProductId;
  legB: ProductId;
  window: TimeRange;
  observations: number;
  currentBps: number;
  refAvgBps: number;
  zscore: number;
  madZ: number;
  percentile: number;
  naiveGapBps: number;
  purityBps: number;
  carryBps: number;
  residualBps: number;
  carryAssumptionPct: number;
  roundTripCostBps: number;
  expectedEdgeBps: number;
  halfLifeDays: number;
  staleDays: number;
}

export interface SpreadSeries {
  summary: SpreadSummary;
  points: SpreadPoint[];
  legAExpiry: string;
  legBExpiry: string;
  /** "GOLDM vs GOLDPETAL" — chart and heading label. */
  pairLabel: string;
}

export interface TermPoint {
  daysToExpiry: number;
  expiry: string;
  contractCode: string;
  /** INR per 10 g of 999-equivalent fine gold. */
  per10g999: number;
  finePerGram: number;
  volumeLots: number;
  stale: boolean;
}

export interface TermCurve {
  productId: ProductId;
  name: string;
  points: TermPoint[];
  impliedCarryPct: number;
}

export interface TermStructure {
  asOf: string;
  curves: TermCurve[];
  benchmarkRatePct: number;
  note: string;
}

export type Severity = "critical" | "warning" | "info";

export interface AlertEvidence {
  label: string;
  value: string;
}

export interface Alert {
  id: string;
  severity: Severity;
  productId: ProductId;
  pairLabel: string;
  title: string;
  summary: string;
  evidence: AlertEvidence[];
  confidence: number;
  confidenceNote: string;
  timestamp: string;
  zscore: number;
  residualBps: number;
  costBps: number;
  expectedEdgeBps: number;
  status: "open" | "acknowledged" | "dismissed";
}

export interface BacktestParams {
  legA: ProductId;
  legB: ProductId;
  entryZ: number;
  exitZ: number;
  windowDays: number;
  costMultiplier: number;
  trainDays: number;
  testDays: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
  drawdown: number;
}

export interface FoldResult {
  id: string;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  trades: number;
  sharpe: number;
}

export interface BacktestMetrics {
  trades: number;
  hitRatePct: number;
  sharpeOos: number;
  maxDrawdownPct: number;
  netPnlBps: number;
  grossPnlBps: number;
  roundTripCostBps: number;
  breakevenCostBps: number;
  halfLifeDays: number;
  dsr: number;
  pbo: number;
  powerFloorSharpe: number;
  verdict: "no edge" | "inconclusive" | "robust";
}

export interface BacktestResult {
  id: string;
  status: "queued" | "running" | "complete";
  createdAt: string;
  params: BacktestParams;
  equity: EquityPoint[];
  folds: FoldResult[];
  metrics: BacktestMetrics;
  assumptions: string[];
  limitations: string[];
}
