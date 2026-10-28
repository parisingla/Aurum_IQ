# AURUM IQ

**Explainable relative-value intelligence for MCX gold futures.**

Team **TimelessXO**, built for the *Hack in Hills* track **Commodity Derivatives Intelligence**: *prices cannot be compared by simple subtraction.*

MCX lists gold in several contract sizes: GOLD, GOLDM, GOLDTEN, GOLDGUINEA and GOLDPETAL. All of them track the same metal, but they differ in lot size, quotation unit, purity and expiry date. AURUM IQ puts every contract on one fine-gold basis and explains the gap between any two of them term by term. It sends an alert only when a gap is large enough to survive real trading costs. If no edge survives, it reports that too.

> **Status:** upload-driven research terminal. The engine ships with **no market data at all** — until you upload a MCX date-wise bhavcopy CSV, every page shows an upload gate with zero invented numbers. After the upload, all analytics (contracts, spreads, term structure, backtests, alerts, AI assistant) run on the **real settlements you provided**. Deployment guide below (see [Deploy on Vercel](#deploy-on-vercel)).

---

## Contracts covered

| Contract | Trading unit | Quoted per | Purity | Expiry |
|---|---|---|---|---|
| GOLD | 1 kg | 10 g | 995 | 5th of month |
| GOLDM | 100 g | 10 g | 995 | 5th of month |
| GOLDTEN | 10 g | 10 g | 999 | Month end (listed since Apr 2025) |
| GOLDGUINEA | 8 g | 8 g | 999 | Month end |
| GOLDPETAL | 1 g | 1 g | 999 | Month end |

Specs that public sources disagree on are shown in the UI as caveats. They are not silently resolved. See `src/lib/products.ts`.

## How the gap is explained

1. **Normalize:** `₹ per fine gram = settlement ÷ quoted grams ÷ fineness`. The original quoted price is always kept next to the normalized one.
2. **Purity term:** `−ln(fineA ÷ fineB) × 10⁴`. This is a fixed shift of about 40 bps between 999 and 995 contracts.
3. **Carry term:** GOLDM expires around the 5th and the small contracts expire at month end. Each pair is matched by expiry along the curve, so time to expiry isn't mistaken for mispricing.
4. **Residual:** whatever remains is scored with a rolling z-score that uses only data up to the previous day.
5. **Gate:** an alert fires only if `|z| ≥ 2` **and** the expected capture exceeds the round-trip cost. Cost includes brokerage, CTT, stamp duty, exchange and SEBI fees, GST and bid-ask slippage. On quiet days the app shows "no gated alert" by design.

The **Spreads** page walks through every step with its formula, the substituted values and the result.

## Pages

| Route | Purpose |
|---|---|
| `/` **Overview** | The desk at a glance: data trust status, watchlist, key stats |
| `/contracts` | Contract explorer for all five products, including stale-price and liquidity flags |
| `/spreads` | Spread lab: pick two legs and see the normalized spread, a step-by-step explanation and a decomposition into purity, carry and residual |
| `/signals` | Gated alerts and a walk-forward backtest net of costs, with an equity curve |
| `/research` | Method, limitations and sources |

### Walk-forward backtest parameters

These are validated with Zod in `src/lib/validation.ts`:

| Parameter | Range |
|---|---|
| Entry z | 1 to 4 |
| Exit z | −1 to 2, and must be below entry |
| Rolling window | 20 to 250 days |
| Train window | 120 to 400 days |
| Test window | 20 to 120 days |
| Cost multiplier | 0.5× to 3×, for cost sensitivity |

Leg A and leg B must be different contracts.

## Tech stack

| Area | Tools |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, framer-motion, lucide-react |
| Charts | Recharts |
| Validation | Zod, applied to every API payload before it reaches a component |

## Project structure

One repository deploys as **one Vercel project**: Next.js at the root, the FastAPI engine mounted as Python serverless functions from `api/`.

```
src/                      # Next.js app (public)
├── app/                  # Routes: overview, contracts, spreads, signals, research
├── components/
│   ├── charts/           # Spread, term structure, equity, z-gauge, sparkline…
│   ├── contracts/        # Contract explorer
│   ├── spreads/          # Spread lab, leg cards, calculation explainer
│   ├── signals/          # Alert cards, backtest panel
│   ├── overview/         # Stat tiles, watchlist
│   ├── layout/           # Shell, side nav, top bar, footer
│   └── ui/               # Primitives (button, panel, modal, toast…)
└── lib/
    ├── products.ts       # Contract specifications
    ├── analytics.ts      # Spread explanation & decomposition
    ├── validation.ts     # Zod schemas
    ├── api/              # Single data-access layer — live engine only, no fixtures
public/
api/                      # FastAPI engine → Vercel Python serverless functions
├── index.py              # Vercel entrypoint (create_app)
├── app/                  # Routes, engine, assistant, methodology
└── data/                 # Runtime datasets.json + raw uploads (gitignored)
tests/                    # pytest suite (engine + API)
scripts/run_backend.py    # local uvicorn entry for the engine
research_notes/           # Source research (dataset, specs, methods, market, stack)
reports/                  # Consolidated deep-research report
vercel.json               # minimal Next.js config
```

In development the rewrites in `next.config.ts` proxy same-origin `/api/*` calls to the engine on `127.0.0.1:8000`; in production they land on the bundled serverless function. No CORS setup is needed anywhere.

## Getting started

Requires Node.js 22 or later and Python 3.12+ (`.python-version` pins 3.12 for Vercel).

```bash
npm install
python3 -m venv api/.venv && api/.venv/bin/pip install -r requirements.txt

# terminal 1 — engine on http://127.0.0.1:8000
api/.venv/bin/python scripts/run_backend.py

# terminal 2 — app on http://localhost:3000 (live data through the rewrite)
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server; proxies `/api/*` to the engine |
| `npm run dev:backend` | Serve the FastAPI engine on `PORT` (default 8000) |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm run test:py` | Engine and API tests (`api/.venv/bin/python -m pytest tests -q`) |

## Deploy on Vercel

### Empty until you upload — by design

The engine ships with **no bundled or synthetic market**. On a cold start `GET /api/data/status` reports `source: "empty"`, every analytics route answers **503**, and the UI shows a full-page upload gate that lists exactly what the dataset unlocks (purity-normalised spreads, residual/carry/z-score decomposition, net-of-cost edge, walk-forward backtests with DSR/PBO). Upload a MCX date-wise bhavcopy CSV in-app and the same endpoints go live with those real settlements — nothing is invented between the CSV and the screen. `POST /api/datasets/reset` clears back to the empty gate.

One import, one project. The Next.js app is the deployment; the engine rides along as Python serverless functions from `api/` (Vercel detects `api/index.py` + root `requirements.txt` + `.python-version`).

1. Push the repo to GitHub, then import it at [vercel.com/new](https://vercel.com/new).
2. Keep **Root Directory** at the repository root; the framework preset is Next.js (root `vercel.json`).
3. In Project → Settings → Environment Variables, add `NEXT_PUBLIC_API_BASE_URL = same-origin` (Production, Preview and Development). The pages then call the engine same-origin; without it every request fails validation against the Next server and the gate shows **Engine not connected**.
4. Deploy. Every preview deployment gets the same treatment.

For the CLI instead: `vercel link`, then `vercel --prod` from the repository root.

### Make uploads persist (serverless storage)

Vercel serverless functions keep **no state between requests** and mount a read-only filesystem, so an uploaded CSV would evaporate and the raw-file write would fail. The engine solves this with an optional Redis mirror: when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set, every upload is persisted and restored by each cold instance. Without them it runs in-memory (local dev, unchanged).

To enable on Vercel: Project → **Storage** → **Upstash Redis** → create (free tier is plenty) — the integration injects both variables automatically. `vercel.json` already raises the upload function's timeout to 60 s for the 16k-row parse.

### AI mode (OpenRouter)

`POST /api/assistant/query` accepts `"useLlm": true`. The engine computes a compact fact brief — dataset status, trust checks, spread summaries, front-contract fines, the latest backtest — and hands **only that brief** to the LLM, so the narrative can annotate but never contradict the dashboard. Responses carry `mode: "llm"` (OpenRouter answered) or `mode: "template"` (deterministic grounded answers; also the fallback whenever the LLM is unset, out of credits, or unreachable — the assistant never breaks).

Configure with `OPENROUTER_API_KEY` (get one at openrouter.ai/keys) and optionally `OPENROUTER_MODEL`. The default chain tries `qwen/qwen3-30b-a3b-instruct-2507` (OpenRouter deprecated the Qwen `:free` tier in Oct 2026) and falls through to a live zero-cost model. In the UI, uploading a CSV enables the **“Analyze my dataset”** button on the AI Research Assistant page — one click, full read of the loaded data.

## Data flow

All frontend data goes through `src/lib/api/index.ts` — every call is a real engine request, validated with Zod before it reaches a component. There are no fixtures and no demo branch.

- **Same origin (recommended):** keep `NEXT_PUBLIC_API_BASE_URL=same-origin` (or unset). Calls go browser → same-origin `/api/*` → rewrites → FastAPI engine (locally `127.0.0.1:8000` via `scripts/run_backend.py`, on Vercel the serverless function).
- **External backend:** set `NEXT_PUBLIC_API_BASE_URL` to a full URL (e.g. `http://127.0.0.1:8000`).
- **Engine unreachable:** panels and the upload gate degrade to **Engine not connected** — no placeholder data is ever rendered.

Routes served by the backend:

```
GET  /api/data/status
GET  /api/contracts
GET  /api/analytics/relative-value
GET  /api/analytics/term-structure
GET  /api/alerts
POST /api/backtests
GET  /api/backtests/:id
```

Plus: `/api/instruments`, `/api/watchlist`, `/api/prices`, `/api/contracts/{id}/history`,
`/api/analytics/front-series`, `/api/methodology`, `/api/assistant/query`, `/api/health`,
and dataset upload (`POST /api/datasets/upload`, `GET /api/datasets`, `POST /api/datasets/reset`).

## Data source and caveats

- The source is the **MCX Daily Bhavcopy**: symbol, date, expiry, OHLC, volume, open interest. No API key is needed, but mcxindia.com blocks plain scripted requests, so the backend should also accept manual file upload.
- Check that the date returned matches the date requested. For holidays or invalid dates, MCX may return the latest trading day instead. Symbols can be space-padded, and the expiry date uses a compact format such as `04SEP2026`.
- Contracts are tracked by expiry date, never as a continuous near-month series.
- Settlement prices are not executable fills. They can be stale for thin contracts, and volume is not market depth.
- GOLDTEN has only been listed since 2025, so any comparison involving it has a shorter history.

## Roadmap

- **Prototype:** bhavcopy ingestion with checks, contract metadata, normalization, all served from the uploaded CSV. *(Done.)*
- **Engine:** spread and z-score alerts, walk-forward backtests net of costs — computed from the upload. *(Done.)*
- **Finale:** scheduled ingestion of daily bhavcopy, expiry-aware analysis, richer evidence-backed explanations.
- **Later:** silver, crude and base metals; licensed intraday and bid-ask data.

## Team

- **Pari Singla:** AI/ML
- **Himanshu Solanki:** Backend
- **Prerak Jain:** Frontend

---

*This is an analytical prototype, not investment advice. All figures come from the user's uploaded bhavcopy CSV — the terminal serves nothing else.*
