# AURUM IQ

**Explainable relative-value intelligence for MCX gold futures.**

Team **TimelessXO**, built for the *Hack in Hills* track **Commodity Derivatives Intelligence**: *prices cannot be compared by simple subtraction.*

MCX lists gold in several contract sizes: GOLD, GOLDM, GOLDTEN, GOLDGUINEA and GOLDPETAL. All of them track the same metal, but they differ in lot size, quotation unit, purity and expiry date. AURUM IQ puts every contract on one fine-gold basis and explains the gap between any two of them term by term. It sends an alert only when a gap is large enough to survive real trading costs. If no edge survives, it reports that too.

> **Status:** frontend prototype. Every screen runs on bundled, deterministic **demo data**. The numbers are illustrative and are **not MCX results**. A live backend can be connected with one environment variable (see [Data modes](#data-modes)).

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
    ├── api/              # Single data-access layer (demo ↔ live)
    └── mock/             # Seeded, deterministic demo market, alerts, backtests
public/
api/                      # FastAPI engine → Vercel Python serverless functions
├── index.py              # Vercel entrypoint (create_app)
├── app/                  # Routes, engine, assistant, methodology
└── data/                 # Seed datasets.json + raw uploads
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

One import, one project. The Next.js app is the deployment; the engine rides along as Python serverless functions from `api/` (Vercel detects `api/index.py` + root `requirements.txt` + `.python-version`).

1. Push the repo to GitHub, then import it at [vercel.com/new](https://vercel.com/new).
2. Keep **Root Directory** at the repository root; the framework preset is Next.js (root `vercel.json`).
3. In Project → Settings → Environment Variables, add `NEXT_PUBLIC_API_BASE_URL = same-origin` (Production, Preview and Development). This switches every page from demo fixtures to the live engine.
4. Deploy. Every preview deployment gets the same treatment.

For the CLI instead: `vercel link`, then `vercel --prod` from the repository root.

## Data modes

All frontend data goes through `src/lib/api/index.ts`.

- **Demo** (default): leave `NEXT_PUBLIC_API_BASE_URL` unset. Seeded fixtures answer each call after `NEXT_PUBLIC_DEMO_LATENCY_MS` (default 450 ms), so loading and error states run as real code paths.
- **Live — same origin (recommended):** set `NEXT_PUBLIC_API_BASE_URL=same-origin`. Calls go browser → same-origin `/api/*` → rewrites → FastAPI engine (locally `127.0.0.1:8000`, on Vercel the serverless function). Each response is validated with Zod.
- **Live — external backend:** set `NEXT_PUBLIC_API_BASE_URL` to a full URL (e.g. `http://127.0.0.1:8000`).

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

Plus: `/api/instruments`, `/api/spot`, `/api/watchlist`, `/api/prices`, `/api/contracts/{id}/history`,
`/api/analytics/front-series`, `/api/methodology`, `/api/assistant/query`, `/api/health`,
and dataset upload (`POST /api/datasets/upload`, `GET /api/datasets`, `POST /api/datasets/reset`).

## Data source and caveats

- The source is the **MCX Daily Bhavcopy**: symbol, date, expiry, OHLC, volume, open interest. No API key is needed, but mcxindia.com blocks plain scripted requests, so the backend should also accept manual file upload.
- Check that the date returned matches the date requested. For holidays or invalid dates, MCX may return the latest trading day instead. Symbols can be space-padded, and the expiry date uses a compact format such as `04SEP2026`.
- Contracts are tracked by expiry date, never as a continuous near-month series.
- Settlement prices are not executable fills. They can be stale for thin contracts, and volume is not market depth.
- GOLDTEN has only been listed since 2025, so any comparison involving it has a shorter history.

## Roadmap

- **Prototype:** Bhavcopy ingestion with checks, contract metadata, normalization. *(Done in the UI on demo data.)*
- **Demo and repo:** spread and z-score alerts, walk-forward backtest net of costs.
- **Finale:** live backend, expiry-aware analysis, evidence-backed explanations.
- **Later:** silver, crude and base metals; licensed intraday and bid-ask data.

## Team

- **Pari Singla:** AI/ML
- **Himanshu Solanki:** Backend
- **Prerak Jain:** Frontend

---

*This is an analytical prototype, not investment advice. Demo figures are synthetic.*
