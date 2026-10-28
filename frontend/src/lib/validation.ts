import { z } from "zod";
import type {
  Alert,
  BacktestResult,
  Contract,
  DataStatus,
  SpreadSeries,
  TermStructure,
} from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Request validation                                                          */
/* -------------------------------------------------------------------------- */

export const productIdSchema = z.enum([
  "GOLD",
  "GOLDM",
  "GOLDTEN",
  "GOLDGUINEA",
  "GOLDPETAL",
]);

export const timeRangeSchema = z.enum(["1M", "3M", "6M", "1Y", "ALL"]);

export const spreadQuerySchema = z
  .object({
    legA: productIdSchema.default("GOLDM"),
    legB: productIdSchema.default("GOLDPETAL"),
    range: timeRangeSchema.default("6M"),
  })
  .refine((value) => value.legA !== value.legB, {
    message: "Pick two different products",
    path: ["legB"],
  });

export type SpreadQuery = z.output<typeof spreadQuerySchema>;

export const contractQuerySchema = z.object({
  product: productIdSchema.optional(),
  search: z.string().trim().max(32).default(""),
  staleOnly: z.boolean().default(false),
  sort: z.enum(["expiry", "volume", "oi", "settle"]).default("expiry"),
});

export type ContractQuery = z.output<typeof contractQuerySchema>;

export const backtestParamsSchema = z
  .object({
    legA: productIdSchema,
    legB: productIdSchema,
    entryZ: z.number().min(1).max(4),
    exitZ: z.number().min(-1).max(2),
    windowDays: z.number().int().min(20).max(250),
    costMultiplier: z.number().min(0.5).max(3),
    trainDays: z.number().int().min(120).max(400),
    testDays: z.number().int().min(20).max(120),
  })
  .refine((value) => value.legA !== value.legB, {
    message: "Leg A and leg B must be different products",
    path: ["legB"],
  })
  .refine((value) => value.exitZ < value.entryZ, {
    message: "Exit threshold must sit below the entry threshold",
    path: ["exitZ"],
  });

export type BacktestParamsInput = z.output<typeof backtestParamsSchema>;

export interface ParseFailure {
  ok: false;
  issues: string[];
}

export interface ParseSuccess<T> {
  ok: true;
  data: T;
}

export function parseInput<S extends z.ZodType>(
  schema: S,
  input: unknown,
): ParseSuccess<z.output<S>> | ParseFailure {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    issues: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "value"}: ${issue.message}`,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Response validation — used when NEXT_PUBLIC_API_BASE_URL is set             */
/* -------------------------------------------------------------------------- */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const trustCheckSchema = z.object({
  label: z.string(),
  passed: z.boolean(),
  detail: z.string(),
});

export const dataStatusSchema: z.ZodType<DataStatus> = z.object({
  asOf: isoDate,
  generatedAt: z.string(),
  source: z.enum(["demo", "api"]),
  rows: z.number().int(),
  contracts: z.number().int(),
  trustScore: z.number().min(0).max(100),
  checks: z.array(trustCheckSchema),
  ingestPath: z.string(),
  nextExpected: isoDate,
  fromDate: isoDate.optional(),
  toDate: isoDate.optional(),
});

export const contractSchema: z.ZodType<Contract> = z.object({
  id: z.string(),
  symbol: productIdSchema,
  contractCode: z.string(),
  productId: productIdSchema,
  expiry: isoDate,
  lastTradingDay: isoDate,
  tenderStart: isoDate,
  tradeDate: isoDate,
  settle: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  prevSettle: z.number(),
  volumeLots: z.number(),
  openInterestLots: z.number(),
  valueLakh: z.number(),
  stale: z.boolean(),
  finePerGram: z.number(),
  quotedPerGram: z.number(),
  daysToExpiry: z.number().int(),
});

export const alertSchema: z.ZodType<Alert> = z.object({
  id: z.string(),
  severity: z.enum(["critical", "warning", "info"]),
  productId: productIdSchema,
  pairLabel: z.string(),
  title: z.string(),
  summary: z.string(),
  evidence: z.array(z.object({ label: z.string(), value: z.string() })),
  confidence: z.number().min(0).max(100),
  confidenceNote: z.string(),
  timestamp: z.string(),
  zscore: z.number(),
  residualBps: z.number(),
  costBps: z.number(),
  expectedEdgeBps: z.number(),
  status: z.enum(["open", "acknowledged", "dismissed"]),
});

export const spreadPointSchema = z.object({
  date: isoDate,
  basisBps: z.number(),
  zscore: z.number(),
  madZ: z.number(),
  percentile: z.number(),
  refAvgBps: z.number(),
  refUpperBps: z.number(),
  refLowerBps: z.number(),
  naiveGapBps: z.number(),
  purityBps: z.number(),
  carryBps: z.number(),
  costBps: z.number(),
});

export const spreadSeriesSchema: z.ZodType<SpreadSeries> = z.object({
  summary: z.object({
    pairKey: z.string(),
    legA: productIdSchema,
    legB: productIdSchema,
    window: timeRangeSchema,
    observations: z.number().int(),
    currentBps: z.number(),
    refAvgBps: z.number(),
    zscore: z.number(),
    madZ: z.number(),
    percentile: z.number(),
    naiveGapBps: z.number(),
    purityBps: z.number(),
    carryBps: z.number(),
    residualBps: z.number(),
    carryAssumptionPct: z.number(),
    roundTripCostBps: z.number(),
    expectedEdgeBps: z.number(),
    halfLifeDays: z.number(),
    staleDays: z.number().int(),
  }),
  points: z.array(spreadPointSchema),
  legAExpiry: isoDate,
  legBExpiry: isoDate,
  pairLabel: z.string(),
});

export const termStructureSchema: z.ZodType<TermStructure> = z.object({
  asOf: isoDate,
  curves: z.array(
    z.object({
      productId: productIdSchema,
      name: z.string(),
      points: z.array(
        z.object({
          daysToExpiry: z.number().int(),
          expiry: isoDate,
          contractCode: z.string(),
          per10g999: z.number(),
          finePerGram: z.number(),
          volumeLots: z.number(),
          stale: z.boolean(),
        }),
      ),
      impliedCarryPct: z.number(),
    }),
  ),
  benchmarkRatePct: z.number(),
  note: z.string(),
});

export const backtestResultSchema: z.ZodType<BacktestResult> = z.object({
  id: z.string(),
  status: z.enum(["queued", "running", "complete"]),
  createdAt: z.string(),
  params: z.object({
    legA: productIdSchema,
    legB: productIdSchema,
    entryZ: z.number(),
    exitZ: z.number(),
    windowDays: z.number(),
    costMultiplier: z.number(),
    trainDays: z.number(),
    testDays: z.number(),
  }),
  equity: z.array(
    z.object({ date: isoDate, equity: z.number(), drawdown: z.number() }),
  ),
  folds: z.array(
    z.object({
      id: z.string(),
      trainStart: isoDate,
      trainEnd: isoDate,
      testStart: isoDate,
      testEnd: isoDate,
      trades: z.number().int(),
      sharpe: z.number(),
    }),
  ),
  metrics: z.object({
    trades: z.number().int(),
    hitRatePct: z.number(),
    sharpeOos: z.number(),
    maxDrawdownPct: z.number(),
    netPnlBps: z.number(),
    grossPnlBps: z.number(),
    roundTripCostBps: z.number(),
    breakevenCostBps: z.number(),
    halfLifeDays: z.number(),
    dsr: z.number(),
    pbo: z.number(),
    powerFloorSharpe: z.number(),
    verdict: z.enum(["no edge", "inconclusive", "robust"]),
  }),
  assumptions: z.array(z.string()),
  limitations: z.array(z.string()),
});
