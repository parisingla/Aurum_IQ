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
import { getAlerts } from "@/lib/mock/alerts";
import { defaultBacktestParams, getBacktest, runBacktest } from "@/lib/mock/backtest";
import {
  getDataStatus,
  getContractHistory,
  getLiveContracts,
  getSpreadSeries,
  getTermStructure,
  getWatchlist,
} from "@/lib/mock/market";
import {
  alertSchema,
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
 * Single access layer for every number the UI shows.
 *
 * With NEXT_PUBLIC_API_BASE_URL unset the demo fixtures answer each call after
 * a short simulated latency, so loading and error states are real code paths.
 * With it set, the same functions call the production routes documented in the
 * brief and validate the payload with Zod before it reaches a component.
 */

// "same-origin" (or "/api") → every path is relative to this app; the Next.js
// rewrites in next.config.ts proxy /api/* to the FastAPI engine (dev:
// 127.0.0.1:8000 via scripts/run_backend.py, prod: the api/ serverless
// function). An absolute URL calls an external backend; empty means demo.
const RAW_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const API_BASE = RAW_BASE === "same-origin" || RAW_BASE === "/api" ? "" : RAW_BASE;
const DEMO_LATENCY_MS = Number(process.env.NEXT_PUBLIC_DEMO_LATENCY_MS ?? 450);

export const isLiveApi = RAW_BASE.length > 0;
export const DATA_MODE: "demo" | "api" = isLiveApi ? "api" : "demo";

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (isLiveApi) return getJson("/api/data/status", dataStatusSchema);
  await wait(DEMO_LATENCY_MS);
  return getDataStatus();
}

export async function fetchContracts(raw: Partial<ContractQuery> = {}): Promise<Contract[]> {
  const parsed = parseInput(contractQuerySchema, raw);
  if (!parsed.ok) throw new ApiError(`Invalid contract query: ${parsed.issues.join("; ")}`);
  const query = parsed.data;

  if (isLiveApi) {
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

  await wait(DEMO_LATENCY_MS);
  let contracts = getLiveContracts();
  if (query.product) contracts = contracts.filter((c) => c.productId === query.product);
  if (query.search) {
    const needle = query.search.toLowerCase();
    contracts = contracts.filter(
      (c) =>
        c.contractCode.toLowerCase().includes(needle) ||
        c.productId.toLowerCase().includes(needle),
    );
  }
  if (query.staleOnly) contracts = contracts.filter((c) => c.stale);

  const sorters: Record<ContractQuery["sort"], (a: Contract, b: Contract) => number> = {
    expiry: (a, b) => a.expiry.localeCompare(b.expiry),
    volume: (a, b) => b.volumeLots - a.volumeLots,
    oi: (a, b) => b.openInterestLots - a.openInterestLots,
    settle: (a, b) => b.settle - a.settle,
  };
  return [...contracts].sort(sorters[query.sort]);
}

export async function fetchRelativeValue(raw: Partial<SpreadQuery> = {}): Promise<SpreadSeries> {
  const parsed = parseInput(spreadQuerySchema, raw);
  if (!parsed.ok) throw new ApiError(`Invalid spread query: ${parsed.issues.join("; ")}`);
  const query = parsed.data;

  if (isLiveApi) {
    return getJson(
      `/api/analytics/relative-value${queryString({
        legA: query.legA,
        legB: query.legB,
        range: query.range,
      })}`,
      spreadSeriesSchema,
    );
  }

  await wait(DEMO_LATENCY_MS);
  return getSpreadSeries(query.legA, query.legB, query.range);
}

export async function fetchTermStructure(): Promise<TermStructure> {
  if (isLiveApi) return getJson("/api/analytics/term-structure", termStructureSchema);
  await wait(DEMO_LATENCY_MS);
  return getTermStructure();
}

export async function fetchAlerts(): Promise<Alert[]> {
  if (isLiveApi) return getJson("/api/alerts", z.array(alertSchema) as z.ZodType<Alert[]>);
  await wait(DEMO_LATENCY_MS);
  return getAlerts();
}

export async function createBacktest(raw: BacktestParamsInput): Promise<BacktestResult> {
  const params: BacktestParams = raw;
  const result = isLiveApi
    ? await postJson("/api/backtests", params, backtestResultSchema)
    : await (async () => {
        await wait(DEMO_LATENCY_MS * 2);
        return runBacktest(params);
      })();

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
  if (isLiveApi) return getJson(`/api/backtests/${encodeURIComponent(id)}`, backtestResultSchema);
  await wait(DEMO_LATENCY_MS);
  const found = getBacktest(id);
  if (found) return found;
  throw new ApiError(`No backtest with id ${id} in this session.`, `/api/backtests/${id}`);
}

export { defaultBacktestParams };


/* -------------------------------------------------------------------------- */
/* Derived reads                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Watchlist = the front (non-tender) contract per product. There is no dedicated
 * route for it: live mode projects it from GET /api/contracts, demo mode uses
 * the precomputed fixture so both branches show the same shape.
 */
export async function fetchWatchlist(): Promise<WatchRow[]> {
  if (isLiveApi) {
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
  await wait(DEMO_LATENCY_MS);
  return getWatchlist();
}


/** One contract's settlement series — used by the explorer drawer. */
export interface ContractHistoryPoint {
  date: string;
  settle: number;
  volumeLots: number;
  stale: boolean;
}

/**
 * Contract-level history is not part of the documented endpoint list, so live
 * mode deliberately returns an empty series and the drawer shows its own empty
 * state instead of inventing a route.
 */
export async function fetchContractHistory(contractId: string): Promise<ContractHistoryPoint[]> {
  if (isLiveApi) {
    await wait(DEMO_LATENCY_MS);
    return [];
  }
  await wait(DEMO_LATENCY_MS);
  return getContractHistory(contractId);
}
