import type {
  Alert,
  BacktestParams,
  BacktestResult,
  Contract,
  DataStatus,
  SpreadSeries,
  TermStructure,
  WatchRow,
} from "@/lib/types";
import { productSpec } from "@/lib/products";
import { recordRun } from "@/lib/history";
import { z } from "zod";
import {
  alertSchema,
  assistantResponseSchema,
  backtestResultSchema,
  contractQuerySchema,
  contractSchema,
  dataStatusSchema,
  parseInput,
  spreadQuerySchema,
  spreadSeriesSchema,
  termStructureSchema,
  type BacktestParamsInput,
  type ContractQuery,
  type SpreadQuery,
} from "@/lib/validation";

/**
 * Single access layer for every number the UI shows. Every call goes to the
 * FastAPI engine and is validated with Zod before it reaches a component —
 * there is no bundled demo fallback: with no dataset uploaded the engine
 * reports `source: "empty"` and the app shows the upload gate.
 */

// "same-origin" (or "/api") → every path is relative to this app; the Next.js
// rewrites in next.config.ts proxy /api/* to the FastAPI engine (dev:
// 127.0.0.1:8000 via scripts/run_backend.py, prod: the api/ serverless
// function). An absolute URL calls an external backend.
const RAW_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const API_BASE = RAW_BASE === "same-origin" || RAW_BASE === "/api" ? "" : RAW_BASE;

/** Base for direct calls outside the typed access layer (multipart upload). */
export const API_BASE_URL = API_BASE;

/** True when a base URL is configured at all — false means "engine not connected". */
export const isLiveApi = RAW_BASE.length > 0;

export class ApiError extends Error {
  readonly status?: number;
  readonly path?: string;

  constructor(message: string, path?: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.path = path;
    this.status = status;
  }
}

async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const url = `${API_BASE}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Could not reach ${path}. Check NEXT_PUBLIC_API_BASE_URL.`, path);
  }
  if (!response.ok) {
    throw new ApiError(`${path} responded ${response.status}.`, path, response.status);
  }
  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      `${path} returned a payload that failed validation: ${parsed.error.issues[0]?.message ?? "unknown"}`,
      path,
      response.status,
    );
  }
  return parsed.data;
}

async function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const url = `${API_BASE}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Could not reach ${path}. Check NEXT_PUBLIC_API_BASE_URL.`, path);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ApiError(
      `${path} responded ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
      path,
      response.status,
    );
  }
  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(`${path} returned a payload that failed validation.`, path, response.status);
  }
  return parsed.data;
}

function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                  */
/* -------------------------------------------------------------------------- */

export async function fetchDataStatus(): Promise<DataStatus> {
  return getJson("/api/data/status", dataStatusSchema);
}

export async function fetchContracts(raw: Partial<ContractQuery> = {}): Promise<Contract[]> {
  const parsed = parseInput(contractQuerySchema, raw);
  if (!parsed.ok) throw new ApiError(`Invalid contract query: ${parsed.issues.join("; ")}`);
  const query = parsed.data;

  return getJson(
    `/api/contracts${queryString({
      product: query.product,
      q: query.search,
      stale: query.staleOnly,
      sort: query.sort,
    })}`,
    z.array(contractSchema) as z.ZodType<Contract[]>,
  );
}

export async function fetchRelativeValue(raw: Partial<SpreadQuery> = {}): Promise<SpreadSeries> {
  const parsed = parseInput(spreadQuerySchema, raw);
  if (!parsed.ok) throw new ApiError(`Invalid spread query: ${parsed.issues.join("; ")}`);
  const query = parsed.data;

  return getJson(
    `/api/analytics/relative-value${queryString({
      legA: query.legA,
      legB: query.legB,
      range: query.range,
    })}`,
    spreadSeriesSchema,
  );
}

export async function fetchTermStructure(): Promise<TermStructure> {
  return getJson("/api/analytics/term-structure", termStructureSchema);
}

export async function fetchAlerts(): Promise<Alert[]> {
  return getJson("/api/alerts", z.array(alertSchema) as z.ZodType<Alert[]>);
}

export async function createBacktest(raw: BacktestParamsInput): Promise<BacktestResult> {
  const params: BacktestParams = raw;
  const result = await postJson("/api/backtests", params, backtestResultSchema);

  recordRun({
    id: result.id,
    kind: "backtest",
    label: `${params.legA} vs ${params.legB}`,
    instruments: `${params.legA} · ${params.legB}`,
    status: "complete",
    href: "/backtesting",
  });
  return result;
}

export async function fetchBacktest(id: string): Promise<BacktestResult> {
  return getJson(`/api/backtests/${encodeURIComponent(id)}`, backtestResultSchema);
}

/**
 * AI mode: ask the engine's grounded assistant. `useLlm` requests the LLM
 * narrative on top of the computed facts; the engine falls back to its
 * deterministic templates when the LLM is unreachable or no key is set.
 */
export async function askAssistant(
  question: string,
  options: { useLlm?: boolean } = {},
): Promise<z.infer<typeof assistantResponseSchema>> {
  return postJson("/api/assistant/query", { question, useLlm: options.useLlm ?? false }, assistantResponseSchema);
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


/* -------------------------------------------------------------------------- */
/* Derived reads                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Watchlist = the front (non-tender) contract per product. There is no dedicated
 * route for it: the access layer projects it from GET /api/contracts so the
 * shape stays identical everywhere.
 */
export async function fetchWatchlist(): Promise<WatchRow[]> {
  const contracts = await fetchContracts({ sort: "expiry" });
  const byProduct = new Map<string, Contract>();
  for (const contract of contracts) {
    if (contract.daysToExpiry < 6) continue;
    const current = byProduct.get(contract.productId);
    if (!current || contract.daysToExpiry < current.daysToExpiry) {
      byProduct.set(contract.productId, contract);
    }
  }
  return [...byProduct.values()]
    .map((contract) => {
      const spec = productSpec(contract.productId);
      const changeAbs = contract.settle - contract.prevSettle;
      return {
        productId: contract.productId,
        name: spec.name,
        contractCode: contract.contractCode,
        expiry: contract.expiry,
        settle: contract.settle,
        changeAbs,
        changePct: contract.prevSettle === 0 ? 0 : (changeAbs / contract.prevSettle) * 100,
        finePerGram: contract.finePerGram,
        volumeLots: contract.volumeLots,
        openInterestLots: contract.openInterestLots,
        daysToExpiry: contract.daysToExpiry,
        liquidity: spec.liquidity,
        stale: contract.stale,
      } satisfies WatchRow;
    })
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}


/** One contract's settlement series — used by the explorer drawer. */
export interface ContractHistoryPoint {
  date: string;
  settle: number;
  volumeLots: number;
  stale: boolean;
}

/** Served by GET /api/contracts/{id}/history; empty until history exists. */
export async function fetchContractHistory(contractId: string): Promise<ContractHistoryPoint[]> {
  return getJson(
    `/api/contracts/${encodeURIComponent(contractId)}/history`,
    z.array(
      z.object({
        date: z.string(),
        settle: z.number(),
        volumeLots: z.number(),
        stale: z.boolean(),
      }),
    ) as unknown as z.ZodType<ContractHistoryPoint[]>,
  );
}
