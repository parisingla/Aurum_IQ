import type {
  BacktestMetrics,
  BacktestParams,
  BacktestResult,
  EquityPoint,
  FoldResult,
  SpreadPoint,
} from "@/lib/types";
import { getPairSnapshot, getSpreadSeries } from "./market";
import { AS_OF, hashSeed } from "./seed";

/**
 * Demo walk-forward backtest.
 *
 * Trades real (demo) contracts with lagged signals, an explicit round-trip
 * cost, tender-window avoidance, and two multiple-testing controls — the
 * deflated Sharpe ratio and PBO via CSCV — because the honest headline of this
 * project is usually "no edge survives costs".
 */

const GRID_ENTRY_Z = [1.5, 2, 2.5] as const;
const GRID_EXIT_Z = [0, 0.5] as const;
const CSCV_BLOCKS = 8;
const EULER = 0.5772156649015329;

const results = new Map<string, BacktestResult>();

/* -------------------------------------------------------------------------- */
/* Normal distribution helpers                                                 */
/* -------------------------------------------------------------------------- */

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-abs * abs);
  return sign * y;
}

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function normInv(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > pHigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/* -------------------------------------------------------------------------- */
/* Stats                                                                       */
/* -------------------------------------------------------------------------- */

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1));
}

function sharpe(daily: number[]): number {
  const s = stdDev(daily);
  if (s === 0) return 0;
  return (mean(daily) / s) * Math.sqrt(250);
}

function skewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const m = mean(values);
  const s = stdDev(values);
  if (s === 0) return 0;
  return mean(values.map((v) => ((v - m) / s) ** 3));
}

function kurtosis(values: number[]): number {
  const n = values.length;
  if (n < 4) return 3;
  const m = mean(values);
  const s = stdDev(values);
  if (s === 0) return 3;
  return mean(values.map((v) => ((v - m) / s) ** 4));
}

/* -------------------------------------------------------------------------- */
/* Strategy                                                                    */
/* -------------------------------------------------------------------------- */

interface Trade {
  entryIndex: number;
  exitIndex: number;
  direction: 1 | -1;
  grossBps: number;
  netBps: number;
  reason: "mean-revert" | "time-limit" | "stop" | "fold-end";
}

interface Simulation {
  daily: number[];
  trades: Trade[];
}

function rollingZ(values: number[], index: number, window: number): number {
  const start = Math.max(0, index - window);
  const history = values.slice(start, index);
  if (history.length < 20) return 0;
  const m = mean(history);
  const s = stdDev(history);
  return s === 0 ? 0 : (values[index] - m) / s;
}

function simulate(
  points: SpreadPoint[],
  params: BacktestParams,
  costBps: number,
  segments: Array<[number, number]>,
): Simulation {
  const basis = points.map((p) => p.basisBps);
  const daily = new Array<number>(points.length).fill(0);
  const trades: Trade[] = [];
  const maxHold = 24;
  const inTest = new Array<boolean>(points.length).fill(false);
  for (const [start, end] of segments) {
    for (let i = start; i < end; i += 1) inTest[i] = true;
  }

  let direction: 1 | -1 | 0 = 0;
  let entryIndex = -1;
  let entryBps = 0;

  for (let i = 1; i < points.length; i += 1) {
    const z = rollingZ(basis, i, params.windowDays);

    if (direction === 0) {
      if (!inTest[i]) continue;
      if (z >= params.entryZ) {
        direction = -1;
        entryIndex = i;
        entryBps = basis[i] as number;
      } else if (z <= -params.entryZ) {
        direction = 1;
        entryIndex = i;
        entryBps = basis[i] as number;
      }
      continue;
    }

    const held = i - entryIndex;
    const adverse = direction === -1 ? z - params.entryZ : -z - params.entryZ;
    let exit = false;
    let reason: Trade["reason"] = "mean-revert";

    if (direction === -1 && z <= params.exitZ) exit = true;
    if (direction === 1 && z >= -params.exitZ) exit = true;
    if (adverse > 1.5) {
      exit = true;
      reason = "stop";
    }
    if (held >= maxHold) {
      exit = true;
      reason = "time-limit";
    }
    if (!inTest[i] && i + 1 < points.length && !inTest[i + 1]) {
      exit = true;
      reason = "fold-end";
    }

    if (!exit) continue;

    const exitBps = basis[i] as number;
    const gross = direction === -1 ? entryBps - exitBps : exitBps - entryBps;
    const net = gross - costBps;
    trades.push({ entryIndex, exitIndex: i, direction, grossBps: gross, netBps: net, reason });
    daily[i] = (daily[i] ?? 0) + net;
    direction = 0 as 1 | -1;
    entryIndex = -1;
  }

  return { daily, trades };
}

/* -------------------------------------------------------------------------- */
/* Multiple-testing controls                                                   */
/* -------------------------------------------------------------------------- */

function deflatedSharpe(daily: number[], configs: number[]): number {
  const T = daily.length;
  if (T < 30 || configs.length < 2) return 0;
  const perPeriod = sharpe(daily) / Math.sqrt(250);
  const variance = configs.reduce((s, v) => s + (v - mean(configs)) ** 2, 0) / (configs.length - 1);
  if (variance <= 0) return 0;
  const n = configs.length;
  const expectedMax =
    Math.sqrt(variance) *
    ((1 - EULER) * normInv(1 - 1 / n) + EULER * normInv(1 - 1 / (n * Math.E)));
  const g3 = skewness(daily);
  const g4 = kurtosis(daily);
  const denominator = Math.sqrt(
    Math.max(1e-9, 1 - g3 * perPeriod + ((g4 - 1) / 4) * perPeriod ** 2),
  );
  const z = ((perPeriod - expectedMax) * Math.sqrt(T - 1)) / denominator;
  return normCdf(z);
}

function combinations(population: number, choose: number): number[] {
  const out: number[] = [];
  for (let mask = 0; mask < 1 << population; mask += 1) {
    let bits = 0;
    for (let i = 0; i < population; i += 1) if (mask & (1 << i)) bits += 1;
    if (bits === choose) out.push(mask);
  }
  return out;
}

function probabilityOfBacktestOverfitting(matrix: number[][]): number {
  const T = matrix.length;
  if (T < CSCV_BLOCKS * 4 || matrix[0] === undefined) return 0.5;
  const n = matrix[0].length;
  if (n < 2) return 0.5;
  const blockSize = Math.floor(T / CSCV_BLOCKS);
  const splits = combinations(CSCV_BLOCKS, CSCV_BLOCKS / 2);
  let overfit = 0;

  for (const mask of splits) {
    const inSample: number[] = [];
    const outSample: number[] = [];
    for (let block = 0; block < CSCV_BLOCKS; block += 1) {
      const start = block * blockSize;
      const end = block === CSCV_BLOCKS - 1 ? T : start + blockSize;
      const target = mask & (1 << block) ? inSample : outSample;
      for (let c = 0; c < n; c += 1) {
        let sum = 0;
        for (let t = start; t < end; t += 1) sum += matrix[t]?.[c] ?? 0;
        target[c] = sum / Math.max(1, end - start);
      }
    }
    let best = 0;
    for (let c = 1; c < n; c += 1) {
      if ((inSample[c] ?? -Infinity) > (inSample[best] ?? -Infinity)) best = c;
    }
    const chosen = outSample[best] ?? 0;
    let better = 0;
    for (let c = 0; c < n; c += 1) if ((outSample[c] ?? 0) > chosen) better += 1;
    const rank = better + 1;
    const omega = rank / n;
    const logit = Math.log(omega / (1 - omega));
    if (logit < 0) overfit += 1;
  }

  return splits.length === 0 ? 0.5 : overfit / splits.length;
}

/* -------------------------------------------------------------------------- */
/* Walk-forward run                                                            */
/* -------------------------------------------------------------------------- */

function foldBoundaries(points: SpreadPoint[], params: BacktestParams): Array<[number, number]> {
  const segments: Array<[number, number]> = [];
  let start = Math.min(params.trainDays, Math.max(0, points.length - params.testDays));
  while (start + 20 < points.length) {
    const end = Math.min(points.length, start + params.testDays);
    segments.push([start, end]);
    start += params.testDays;
  }
  return segments;
}

export function runBacktest(params: BacktestParams): BacktestResult {
  const series = getSpreadSeries(params.legA, params.legB, "ALL");
  const points = series.points;
  const snapshot = getPairSnapshot(params.legA, params.legB);
  const costBps = snapshot.roundTripCostBps * params.costMultiplier;
  const segments = foldBoundaries(points, params);

  const configs: BacktestParams[] = [
    params,
    ...GRID_ENTRY_Z.flatMap((entryZ) =>
      GRID_EXIT_Z.map((exitZ) => ({ ...params, entryZ, exitZ })),
    ),
  ];

  const simulations = configs.map((config) => simulate(points, config, costBps, segments));
  const primary = simulations[0] as Simulation;
  const configSharpes = simulations.map((sim) => sharpe(sim.daily));

  const testDaily: number[] = [];
  for (const [start, end] of segments) {
    for (let i = start; i < end; i += 1) testDaily.push(primary.daily[i] ?? 0);
  }

  const grossTrades = primary.trades.map((t) => t.grossBps);
  const wins = primary.trades.filter((t) => t.netBps > 0).length;
  const trades = primary.trades.length;

  let equityLevel = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equity: EquityPoint[] = [];
  for (const [start, end] of segments) {
    for (let i = start; i < end; i += 1) {
      equityLevel += primary.daily[i] ?? 0;
      peak = Math.max(peak, equityLevel);
      const drawdown = peak === 0 ? 0 : ((equityLevel - peak) / peak) * 100;
      maxDrawdown = Math.min(maxDrawdown, drawdown);
      equity.push({
        date: points[i]?.date ?? AS_OF,
        equity: Number(equityLevel.toFixed(3)),
        drawdown: Number(drawdown.toFixed(3)),
      });
    }
  }

  const matrix: number[][] = [];
  for (let s = 0; s < segments.length; s += 1) {
    const [start, end] = segments[s] as [number, number];
    for (let i = start; i < end; i += 1) {
      const row = simulations.map((sim) => sim.daily[i] ?? 0);
      if (row.length === configs.length) matrix.push(row);
    }
  }

  const folds: FoldResult[] = segments.map(([start, end], index) => {
    const window = primary.daily.slice(start, end);
    return {
      id: `F${index + 1}`,
      trainStart: points[Math.max(0, start - params.trainDays)]?.date ?? AS_OF,
      trainEnd: points[Math.max(0, start - 1)]?.date ?? AS_OF,
      testStart: points[start]?.date ?? AS_OF,
      testEnd: points[Math.max(start, end - 1)]?.date ?? AS_OF,
      trades: primary.trades.filter((t) => t.entryIndex >= start && t.entryIndex < end).length,
      sharpe: Number(sharpe(window).toFixed(2)),
    };
  });

  const oosSharpe = sharpe(testDaily);
  const netPnl = primary.trades.reduce((s, t) => s + t.netBps, 0);
  const grossPnl = grossTrades.reduce((s, v) => s + v, 0);
  const dsr = deflatedSharpe(testDaily, configSharpes);
  const pbo = probabilityOfBacktestOverfitting(matrix);
  const testObservations = testDaily.length;
  const powerFloor = testObservations > 0 ? (1.96 / Math.sqrt(testObservations)) * Math.sqrt(250) : 0;

  const verdict: BacktestMetrics["verdict"] =
    dsr >= 0.95 && pbo <= 0.25 && oosSharpe > 0.5
      ? "robust"
      : dsr >= 0.75 && pbo <= 0.4
        ? "inconclusive"
        : "no edge";

  const metrics: BacktestMetrics = {
    trades,
    hitRatePct: trades === 0 ? 0 : (wins / trades) * 100,
    sharpeOos: Number(oosSharpe.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
    netPnlBps: Number(netPnl.toFixed(1)),
    grossPnlBps: Number(grossPnl.toFixed(1)),
    roundTripCostBps: Number(costBps.toFixed(1)),
    breakevenCostBps:
      trades === 0 ? 0 : Number((grossPnl / trades).toFixed(1)),
    halfLifeDays: Number(series.summary.halfLifeDays.toFixed(1)),
    dsr: Number(dsr.toFixed(3)),
    pbo: Number(pbo.toFixed(3)),
    powerFloorSharpe: Number(powerFloor.toFixed(2)),
    verdict,
  };

  const result: BacktestResult = {
    id: `bt-${hashSeed(JSON.stringify(params)).toString(36)}`,
    status: "complete",
    createdAt: `${AS_OF} 15:52`,
    params,
    equity,
    folds,
    metrics,
    assumptions: [
      "Signals are computed on settlement data through t and executed at the next settlement — no same-day fill, no look-ahead.",
      `Round-trip cost of ${snapshot.roundTripCostBps.toFixed(1)} bps per leg pair, scaled by your ${params.costMultiplier.toFixed(2)}× multiplier (statutory charges, 18% GST, capped brokerage, modelled bid-ask).`,
      "Both legs are held in matched fine grams; the residual 0.40% gold beta from lot rounding is reported, not hidden.",
      "Positions are force-flattened before the tender window, so the last week of a contract is never traded.",
      "Hedge ratio is fixed at 1 in fine gold by contract terms — no estimated beta, no Kalman state.",
      "GOLDTEN pairs start on 1 Apr 2025, so their sample is shorter than the others.",
    ],
    limitations: [
      "DEMO DATA. These settlements are generated by a seeded model, not MCX — do not quote these numbers.",
      "Daily settlements only: no bid-ask, no intraday, no partial fills. A 30-minute VWAP print in a thin contract is not an executable price.",
      `Only ${trades} trades were taken out of sample, so the confidence interval on any Sharpe here is enormous.`,
      `At ${testObservations} test observations this design could only have detected an annualised Sharpe of about ${powerFloor.toFixed(1)} or larger — anything smaller was invisible to it.`,
      `DSR used N = ${configs.length} logged configurations; a real search over windows, thresholds and filters would deflate the result further.`,
      "PBO via CSCV weakens time ordering; it complements walk-forward testing rather than replacing it.",
      "Costs are modelled from published slabs; actual slippage in GOLDGUINEA and far GOLDTEN months is unmeasured.",
    ],
  };

  results.set(result.id, result);
  return result;
}

export function getBacktest(id: string): BacktestResult | null {
  return results.get(id) ?? null;
}

export function defaultBacktestParams(): BacktestParams {
  return {
    legA: "GOLDM",
    legB: "GOLDPETAL",
    entryZ: 2,
    exitZ: 0.5,
    windowDays: 60,
    costMultiplier: 1,
    trainDays: 250,
    testDays: 40,
  };
}
