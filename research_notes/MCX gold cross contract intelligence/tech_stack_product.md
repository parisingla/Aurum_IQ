# Tech Stack, Architecture and Product/UX for an MCX Gold Cross-Contract Intelligence Prototype

Scope note: 18 tool calls. Primary/official sources were preferred. Several search results came from low-quality or likely auto-generated sites (e.g. runtimewire.com, endoflife.ai, claudeissues.com). Those are flagged or left out. Anything stated without a citation is in "Inferences" (opinion and engineering judgement) or "Gaps".

## 1. Ingestion (MCX site, scrapers, scheduling, caching, validation)

### Takeaway
No official MCX API showed up. The most current community reference is `mcxlib` 0.4 (May 2026), which wraps public MCX endpoints, including Excel reports, and warns that it breaks whenever the site changes. Build a thin httpx fetcher with a cookie-warming session and a Playwright fallback. Keep every raw file, keyed by content hash. Run it from GitHub Actions cron at an off-the-hour minute, with a "missing run" detector.

### Cited Findings
- `mcxlib` (PyPI) is "a Python library for fetching publicly available market data from the MCX India website" and returns pandas DataFrames. It exposes `get_bhav_copy(trade_date="YYYYMMDD", instrument="ALL")`, `get_historical_date_wise_data()`, `get_available_contracts()`, `get_recent_expires()`, `get_ccl_delivery()` and others. — [mcxlib on PyPI](https://pypi.org/project/mcxlib/)
- mcxlib versions: 0.1 (Nov 3 2023), 0.2/0.3 (Apr 10 2026), 0.4 (May 1 2026). Its warnings: it depends on public MCX endpoints staying available, "MCX website changes can break functions without a new package release", date-wise historical queries are capped at a 365-day range, some datasets are Excel (it depends on `xlrd`), and it raises `ValueError` on changed endpoint formats. It is not published via Trusted Publishing. — [mcxlib on PyPI](https://pypi.org/project/mcxlib/)
- `mcxpy` has `mcx_bhavcopy(bhavdate)` but calls itself experimental, "for educational purpose", and cautions against using it to pull MCX data programmatically. — [mcxpy on PyPI](https://pypi.org/project/mcxpy)
- Most "bhavcopy" packages (bhavcopy, pybhav, bhavkit, R `nser`) cover NSE/BSE only, not MCX. — [bhavcopy](https://pypi.org/project/bhavcopy), [pybhav](https://pypi.org/project/pybhav/), [bhavkit](https://pypi.org/project/bhavkit/), [nser (CRAN)](https://cloud.r-project.org/web/packages/nser/index.html)
- A plain HTTP fetch of `https://www.mcxindia.com/market-data/bhavcopy` from the research tool returned **HTTP 403 Forbidden**. This shows bot or WAF protection against naive clients. — direct fetch attempt, [MCX bhavcopy page](https://www.mcxindia.com/market-data/bhavcopy)
- GitHub Actions scheduling (official docs): scheduled runs can be delayed under high load, and the top of every hour counts as high load. If load is severe enough, some queued jobs may be dropped. GitHub recommends a different minute of the hour. — [GitHub Docs: troubleshooting workflows](https://docs.github.com/en/enterprise-cloud@latest/actions/monitoring-and-troubleshooting-workflows/troubleshooting-workflows/about-troubleshooting-workflows)
- In public repos, scheduled workflows are auto-disabled after 60 days with no repository activity, and they are disabled by default on forks. Re-enable with `gh workflow enable` or the REST API. — [GitHub Docs: disable and enable workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)
- Real incident: on Jan 20 2026, GitHub reported delayed job starts (about 11 min average) caused by a load-pattern shift in scheduled jobs. — [GitHub Status incident](https://www.githubstatus.com/incidents/fw294tth5m8y)
- Pandera supports `polars.DataFrame` and `LazyFrame` (since 0.19.0) through `DataFrameModel` and `@check_types`. On LazyFrames only schema-level checks run unless `PANDERA_VALIDATION_DEPTH=SCHEMA_AND_DATA` is set. pandera >= 0.21 needs polars >= 1.0. An opt-in Narwhals backend arrived in 0.32.0. — [Pandera Polars docs](https://pandera.readthedocs.io/en/latest/polars.html), [Pandera 0.19.0 release](https://github.com/unionai-oss/pandera/releases/tag/v0.19.0)
- The CERN mirror lists pandera 0.30.1 on Mar 18 2026. A third-party aggregator says v0.32.1 (Jun 29 2026), which I could not confirm officially. — [CERN mirror](https://simple-repository.app.cern.ch/project/pandera)

### Inferences
- **Recommended fetcher:** Use `httpx.Client(http2=True, follow_redirects=True)` with browser-like headers. GET the bhavcopy landing page first to collect ASP.NET session cookies and `__VIEWSTATE`/`__EVENTVALIDATION`, then POST the date form or call whatever XHR/JSON endpoint the page uses. Find that endpoint by reading the network tab in DevTools, or by reading the `mcxlib` source (`pip download mcxlib`, then read it). Treat `mcxlib` as a reference implementation and a second source. Don't take it as a hard dependency, since it is a one-person project with no Trusted Publishing.
- **Fallback chain:** (1) httpx direct, (2) `mcxlib.get_bhav_copy`, (3) Playwright headless Chromium driving the form and capturing the download, (4) manual CSV drop into `data/raw/manual/`. Log which path produced each file, because that feeds the data-quality trust score.
- **Idempotency:** Store raw responses unmodified at `data/raw/mcx/bhavcopy/date=YYYY-MM-DD/<sha256>.{csv,xlsx,json}`, plus a `manifest.parquet` (date, url, fetched_at, sha256, bytes, method, http_status). Skip a refetch if a successful hash exists. Write a new version only if the hash changed, which catches MCX revising a file.
- **Date-mismatch validation (key correctness check):** Assert that (a) the requested trade date equals the date inside the file, (b) the date is an MCX trading day (holiday calendar), (c) the file is not byte-identical to the previous day's file (stale re-serve), (d) for each contract, settlement price > 0, OI >= 0 and volume >= 0, and close/settle stay within a sanity band of the prior settle, (e) expiry date >= trade date. Pydantic v2 handles the per-row raw parsing. Pandera on polars handles the frame-level checks. Great Expectations is overkill for one dataset at hackathon scale.
- **Scheduling:** GitHub Actions cron at an odd minute after MCX publishes (for example `17 15 * * 1-5` UTC ≈ 20:47 IST; check MCX's actual publish time). Add a `workflow_dispatch` trigger and a keepalive commit, either data commits or a weekly digest commit, so the 60-day disable never fires. Prefect is optional and only worth it if you want a visible flow UI for the demo. Local cron plus a Makefile is the simplest backup.
- Comply with MCX terms of use. Rate-limit to one request per few seconds and backfill slowly.

### Gaps
- The exact MCX bhavcopy endpoint (URL, JSON vs CSV vs ASP.NET postback) could not be verified. The page returned 403 to the fetch tool, and no public writeup surfaced. Inspect it in a real browser.
- MCX's publish time for daily bhavcopy, and whether historical archives go back further than the 365-day window mcxlib mentions, were not confirmed.
- I couldn't fetch MCX terms of use or robots.txt.

## 2. Storage (DuckDB + Parquet vs SQLite vs Postgres/Timescale; layering and lineage)

### Takeaway
For a few thousand rows per year, use DuckDB (stable 1.5.x; 2.0 imminent) over partitioned Parquet in raw/clean/feature layers. It needs zero ops, is fast, works directly from polars and pandas, and the files ship inside the repo or Docker image. Pin the DuckDB version, because 2.0 changes the storage format.

### Cited Findings
- Latest stable is DuckDB **1.5.6** (Sep 28 2026), a patch release of the 1.5 "Variegata" line with Parquet read/write fixes and other correctness fixes. — [DuckDB 1.5.6 announcement](https://duckdb.org/2026/09/28/announcing-duckdb-156)
- The same post says v2.0.0 is expected in October 2026 and shows a v2.0.0-dev alpha that was more than 6x faster on TPC-H SF300 on Windows, with some queries regressing. — [DuckDB 1.5.6 announcement](https://duckdb.org/2026/09/28/announcing-duckdb-156)
- Secondary reports say v2.0 ("Cyanoptera") brings a new SQL parser, a new default storage format, a reworked C API and some breaking changes. Treat this as unverified; the sources are low quality. — [InfoQ (via search snippet)](https://infoq.com/news/2026/08/duckdb-v2-distributed)

### Inferences
- **Layout:** `data/raw/` (immutable source files + manifest) → `data/clean/bhavcopy_gold.parquet` (typed, validated, one row per trade_date x symbol x expiry, with `source_sha256` and `ingest_run_id` lineage columns) → `data/features/` (per-gram normalized prices, spreads, carry, roll calendar) → `data/results/` (backtest runs keyed by config hash). A single `warehouse.duckdb` file only holds views over the Parquet, so it is disposable.
- **Version pinning:** Pin `duckdb==1.5.*` in the lockfile. Use Parquet as the durable format, not the `.duckdb` file, so the 2.0 storage change can't break you.
- **SQLite** also works but is a row store and adds nothing here. **Postgres/TimescaleDB** only pays off with multi-user writes or intraday ticks, and it costs a hosted DB. Skip it.
- Lineage without a tool: every derived row carries `source_sha256`. `run_manifest.json` records git SHA, config hash, library versions and input hashes. That is enough to claim reproducibility to judges.

### Gaps
- I didn't confirm whether DuckDB 2.0 has actually shipped as of Oct 19 2026.

## 3. Analytics and backtesting (pandas/polars, vectorbt vs custom vs backtrader)

### Takeaway
Use polars for transforms and numpy/statsmodels for statistics. Write a small custom, expiry-aware walk-forward engine. vectorbt's open-source edition (1.1.2, Oct 2026) is under Apache 2.0 + Commons Clause and lacks futures multipliers and leverage, which are PRO features. For a 4-product calendar-and-cross-spread problem with tender periods, a 200-line daily loop is easier to make correct and easier to explain to judges.

### Cited Findings
- vectorbt latest is **1.1.2** (Oct 9 2026). The license is "Apache 2.0 with Commons Clause", so you "may not sell products or services that are primarily this software". The open-source version is the "community edition". PRO adds parallelization, limit orders, leverage, and tips for simulating "futures contract multipliers". — [vectorbt on PyPI](https://pypi.org/project/vectorbt/)
- Snyk lists vectorbt 0.28.0 (Jun 3 2025) and 0.28.1 (Aug 16 2025) as the previous line. — [Snyk vectorbt](https://security.snyk.io/package/pip/vectorbt)
- Deflated Sharpe Ratio: Bailey & López de Prado, "The Deflated Sharpe Ratio: Correcting for Selection Bias, Backtest Overfitting and Non-Normality", *Journal of Portfolio Management* 40(5):94-107, 2014. It corrects for multiple-testing selection bias and non-normal returns. — [SSRN 2460551](https://papers.ssrn.com/abstract=2460551)
- PBO: Bailey, Borwein, López de Prado & Zhu, "The Probability of Backtest Overfitting", *Journal of Computational Finance* 20(4), 2017, DOI 10.21314/jcf.2016.322. It uses combinatorially symmetric cross-validation (CSCV), and the authors argue hold-out is "unreliable and inaccurate" for investment backtests. — [SSRN 2326253](https://papers.ssrn.com/abstract=2326253), [eScholarship PDF](https://escholarship.org/content/qt4w1110bb/qt4w1110bb.pdf)
- Python implementation: `esvhd/pypbo` covers PBO, PSR, MinTRL, MinBTL and DSR (deps joblib, seaborn, statsmodels; tests are "to-do"). There is also an R `pbo` package on CRAN. — [esvhd/pypbo](https://github.com/esvhd/pypbo), [CRAN pbo README](https://packages.oit.ncsu.edu/cran/web/packages/pbo/readme/README.html)

### Inferences
- **Why custom beats vectorbt/backtrader/zipline here:** (a) The instruments are a set of dated contracts that roll, not continuous series. Signals have to be computed on *matched* contracts (same or nearest expiry across GOLDM/GOLDTEN/GOLDGUINEA/GOLDPETAL), and generic engines assume one price series per symbol. (b) Tender/delivery periods need hard rules: no new entries N days before expiry, forced exit before the tender window, and margin step-ups. Expressing those as config is simpler in your own loop. (c) Costs differ per contract (tick size per lot, brokerage, CTT, exchange fees, stamp duty, slippage as a function of volume/OI). (d) Daily data and a few hundred contracts mean speed doesn't matter. zipline-reloaded and backtrader are effectively legacy for this, and vectorbt's futures features are behind PRO.
- **Engine sketch:** `for each fold in walk_forward(train=N_days, test=M_days, step=M):` fit parameters (z-score window, entry threshold) on train only, then on test iterate day by day: compute signals on the t-1 settlement → execute at the t settlement ± modeled slippage → apply costs → mark to market. Log every trade with reason codes (entry signal, hysteresis exit, tender guard, stop). Report out-of-sample folds concatenated, never in-sample.
- **Normalization:** convert every contract to ₹/gram (or ₹/10g) using its quoted unit, at 995 vs 999 purity where it applies. Keep the conversion table in one config file with a unit test. Contract unit details belong to the market-structure researcher's notes. Encode them with property tests (see section 6).
- **Research integrity:** compute DSR using the *number of configurations tried* (log every grid point) and PBO via CSCV over the parameter grid. Implement DSR directly from the paper (about 20 lines with scipy.stats). `pypbo` can serve as a cross-check, not a dependency, since it has no tests.

### Gaps
- I couldn't confirm the current maintenance status of backtrader or zipline-reloaded in 2026.
- No open-source expiry-aware Indian commodity futures backtester turned up.

## 4. Frontend / dashboard and deployment

### Takeaway
Use Streamlit (1.6x, 2026) with Plotly, plus one TradingView Lightweight Charts component for the price/spread pane. It is the fastest credible path and runs on free Streamlit Community Cloud or HF Spaces. Choose Next.js + FastAPI + lightweight-charts only if the team already has strong frontend skills and wants a "product" look. That route roughly doubles build time.

### Cited Findings
- Streamlit 2026 releases: 1.58.0 (May 28 2026) added `@st.fragment(parallel=True)` and `st.pagination`. A forum post for 1.63.0 (Sep 1 2026) describes event-scoped fragment reruns (`@st.fragment(key=...)`) and `on_change="ignore"`. Sources disagree on which version is latest. — [Streamlit 2026 release notes](https://docs.streamlit.io/develop/quick-reference/release-notes/2026), [Streamlit forum 1.63.0](https://discuss.streamlit.io/t/version-1-63-0/122544)
- Community Cloud limits (official docs, as of Feb 2024): CPU 0.078 to 2 cores, memory 690 MB to 2.7 GB, storage up to 50 GB. They "may change at any time without notice", and apps over the limits get throttled or become nonfunctional. — [Streamlit docs: resource limits](https://docs.streamlit.io/knowledge-base/deploy/resource-limits)
- A third-party 2026 guide says the free tier is about 1 GB RAM, apps sleep after 12 idle hours, and only one private app is allowed. This conflicts with the official numbers. — [livemy.app guide](https://livemy.app/blog/deploy-streamlit-app)
- TradingView Lightweight Charts is Apache-2.0 (v5.x; 5.1.0 and 5.2.1 are referenced). You must credit TradingView as the product creator, usually through the `attributionLogo` chart option, or with NOTICE text plus a link on a visible page. — [lightweight-charts (bestofjs)](https://bestofjs.org/projects/lightweight-charts), [Algolia docs index](https://docsearch.algolia.com/mcp/docs/repo/tradingview/lightweight-charts)

### Inferences
- **Default stack:** Streamlit multipage app with pages *Today* (digest + alerts), *Relative Value* (cross-contract per-gram premium/discount heatmap and z-scores), *Term Structure* (curve per product, annualized carry vs an implied rate), *Calendar* (Gantt of listing → tender → expiry per contract), *Backtest Lab* (walk-forward folds, equity, cost breakeven map), *Integrity* (DSR, PBO, data trust score). Use `@st.cache_data` keyed by the Parquet hash. Use fragments so changing filters doesn't recompute everything.
- **Charts:** Plotly for heatmaps, Gantt (`px.timeline`) and surfaces. Lightweight Charts, through a community Streamlit wrapper or `st.components.v1.html`, for the trader-feel spread chart with markers. Keep the attribution logo on.
- **Dash** gives more layout control than Streamlit but takes longer to build. **Evidence.dev/Observable Framework** are great for static, SQL-driven reports over DuckDB/Parquet, and a nightly static build is attractive (no cold starts). They are weaker for an interactive backtest lab.
- **Deployment:** Streamlit Community Cloud (free, deploys from GitHub; watch the sleep/cold start before a demo, so open it 5 minutes early) or Hugging Face Spaces (Docker or Streamlit SDK) as a mirror. Render or Railway free tiers have cold starts and changing quotas. If going Next.js, Vercel for the frontend plus FastAPI on Render/Railway/HF.
- Data refresh path: the GitHub Actions job commits updated Parquet (small) to the repo or a release asset, and the app redeploys or reads it. This also gives a free audit trail and keeps the cron alive.

### Gaps
- Current (2026) Streamlit Community Cloud quotas weren't confirmed from an official page. Neither were current HF Spaces, Render or Railway free-tier terms.
- I didn't evaluate a maintained 2026 Streamlit wrapper for lightweight-charts.

## 5. Alerts and alert-fatigue design

### Takeaway
Send alerts through a Telegram bot as the primary channel (free, trivial HTTP API, good on phones), with email as the daily-digest fallback. The product idea is "quiet by default": alert only when a signal clears a cost hurdle with hysteresis and persistence. Otherwise send one daily digest that says explicitly "no actionable signal today".

### Cited Findings
- No sources were fetched in this session on Telegram Bot API limits or on alert-fatigue literature (see Gaps).

### Inferences
- **Gating stack, in order:** (1) data trust score for the day ≥ threshold, else suppress and say why. (2) |z| > entry threshold *and* expected edge in ₹ > round-trip cost × k (cost-hurdle gating, k≈1.5 to 2). (3) Hysteresis: arm at |z| > 2.0, re-arm only after |z| < 1.0, so it doesn't flap around a single threshold. (4) Persistence: the condition holds for 2 consecutive settlements. (5) Lifecycle guard: no entry alerts inside the tender/expiry window. (6) Cooldown per pair: max 1 alert per pair per N days. (7) Confidence score shown on every alert (historical hit rate for similar z-level and days-to-expiry bucket, OOS only).
- **Message format:** one line of what happened, one line of why it matters, one line of the cost-adjusted number, and a deep link to the dashboard. Example: "GOLDPETAL rich vs GOLDM by ₹X/10g (z=2.4, 2nd day). Edge after costs ≈ ₹Y/lot. Confidence: medium (OOS hit rate 58%, n=31)."
- **Implementation:** `httpx.post(f"https://api.telegram.org/bot{TOKEN}/sendMessage", ...)` from the same GitHub Actions job. Keep the token in GitHub Secrets. Slack incoming webhooks are just as easy if judges are on Slack. Skip push notifications and PWAs, since they add complexity without improving the demo.

### Gaps
- Telegram Bot API rate limits and 2026 terms, and published research on alert fatigue in trading tools, were not researched in this session.

## 6. Optional AI layer (LLM daily brief) and guardrails

### Takeaway
An LLM-written "daily brief" is a cheap crowd-pleaser, and several fintech rubrics explicitly score LLM use. It must be grounded. Pass the model only a computed JSON of facts. Make it write from those facts, then validate every number in the output against the input before publishing. Fall back to a deterministic template if validation fails.

### Cited Findings
- At least one fintech hackathon rubric weights "how effectively Large Language Models are utilized for delivering personalized financial advice" at 20%. — [Notion: evaluation process](https://planet-echium-3b0.notion.site/Evaluation-Process-c34e2f671c9548709e2f74c955c4e6a6)
- Claude's Citations feature gives "detailed references to the exact sentences and passages it uses" from provided documents. — [Claude features overview](https://platform.claude.com/docs/en/build-with-claude/overview), [Anthropic cookbook: citations](https://platform.claude.com/cookbook/misc-using-citations)
- A secondary source says Citations is incompatible with Structured Outputs (`output_format`), and that this is noted in the Structured Outputs guide. It's unverified, so check the official docs. — [secondary issue tracker](https://claudeissues.com/issue/19417-docs-missing-structured-outputs-incompatibility-notice-in-citations-guide)

### Inferences
- **Guardrail pattern:** (1) Python computes a `facts.json` (signals, z-scores, costs, trust score, days-to-expiry, "no-signal" flags). (2) Prompt: "Use only these facts; every number must appear verbatim in facts; if no signal, say so plainly; no price forecasts or advice." (3) Post-check: regex-extract every number and contract symbol from the output and assert each one is in `facts.json`. Reject the brief, or use the template, otherwise. (4) Show a "Generated from N facts, all verified" badge, plus a toggle to reveal the facts. Judges value that visible integrity more than the prose.
- Use structured outputs, or a JSON response, for sections (headline, three bullets, risks) *or* Citations over the facts document, not both if they really are incompatible.
- Cost is negligible: one short call per day. Cache by facts hash so redeploys don't re-bill.

### Gaps
- Current Claude model IDs and pricing weren't checked here. The implementer should consult the official Claude API docs.

## 7. Reproducibility and engineering hygiene

### Takeaway
The minimum that convinces judges: `uv`-locked deps, a Makefile (`make ingest|validate|features|backtest|app|test`), a Dockerfile, pytest with Hypothesis property tests on normalization and the cost model, a run manifest per backtest, and a README with a 60-second quickstart using a bundled sample dataset.

### Cited Findings
- The research-integrity metrics with a peer-reviewed basis are DSR (JPM 2014) and PBO (JCF 2017). Citing them in the README and UI is defensible. — [SSRN 2460551](https://papers.ssrn.com/abstract=2460551), [SSRN 2326253](https://papers.ssrn.com/abstract=2326253)

### Inferences
- **Property tests (Hypothesis):** per-gram normalization is invariant to the contract unit (same spot gives the same ₹/g across products, within a purity adjustment); spread(A,B) = −spread(B,A); costs are always ≥ 0 and monotone in quantity; the backtest with zero signal gives zero PnL and zero cost; there is no lookahead (shifting future data never changes past signals, tested by truncation equivalence); every trade's exit date is ≤ its contract's last trading day.
- **Golden-file test:** one real bhavcopy file checked in, with its expected parsed output.
- **Experiment tracking:** an append-only `results/runs.parquet` (config hash, git SHA, fold metrics, n_trials) beats MLflow at this scale, and it feeds the DSR trial count directly.
- Notebooks only for exploration. The app and tests import from a `src/` package. Run CI on every push (ruff + pytest).

### Gaps
- Current versions of uv, Hypothesis and polars weren't checked in this session.

## 8. Uniqueness / differentiation ideas and what judges reward

### Takeaway
Rubrics commonly weight innovation, technical complexity/execution, real-world usefulness and presentation roughly equally, with presentation often around 20%. The strongest differentiator is honesty: a product that says when there is *no* edge, shows why (costs, liquidity, overfitting), and proves its data is trustworthy. Few hackathon quant projects do that.

### Cited Findings
- Flow hackathon: five equally weighted criteria, including Innovation & Originality, Technical Complexity & Execution, and Real-world Impact & Usefulness, each scored 1 to 8. — [Flow judging criteria](https://flowhackathon.notion.site/Judging-Criteria-07b6cbeb99654a67aeb4ecfd88197dce)
- Kennesaw State fintech hackathon: 30% feasibility & innovation, 20% presentation & communication, plus problem framing, product/requirements planning and go-to-market. — [KSU FinTech Hackathon](https://www.kennesaw.edu/fintech/hackathon/fall-2025.php)
- Microsoft-backed fintech hackathon criteria: Creativity, Ethical Considerations, Practical Viability, Social Impact, Technical Complexity, Innovation, Design & Implementation. — [Microsoft for Startups blog](https://www.microsoft.com/en-us/startups/blog/fintech-hackathon/)
- An edtech rubric framed technical sophistication (30%) as "technically robust and feasible to implement". — search snippet summarizing rubrics (lower confidence), [Notion evaluation process](https://planet-echium-3b0.notion.site/Evaluation-Process-c34e2f671c9548709e2f74c955c4e6a6)
- PBO and DSR are recognized, citable tools for exposing backtest overfitting. — [SSRN 2326253](https://papers.ssrn.com/abstract=2326253), [SSRN 2460551](https://papers.ssrn.com/abstract=2460551)

### Inferences (ranked by impact per build-hour)
1. **Data-quality trust score per day** (0 to 100). Inputs: fetch path used, schema checks passed, date match, staleness, cross-contract consistency (implied ₹/g agreement across the 4 products), and missing contracts. It gates alerts and appears as a badge. Cheap, visible, novel.
2. **"Signal silence" as a feature.** The daily digest leads with "No actionable dislocation today: largest gap ₹X/g, below cost hurdle ₹Y/g". Pair it with a "silence streak" counter and a percentage of days with a signal. It tells the judges the product respects traders' attention.
3. **Cost breakeven map.** A heatmap of pair × days-to-expiry showing the minimum spread needed to break even after brokerage, fees, taxes and slippage, with today's spread overlaid. It makes the economics obvious at a glance.
4. **Contract lifecycle Gantt.** Every live gold contract from listing through tender to expiry, a "today" line, and shading for the tender/no-trade zone. Clicking a bar opens that contract's history. It fixes a real pain point and is easy to build with `px.timeline`.
5. **Research-integrity report card.** OOS-only Sharpe, DSR given the number of trials, PBO from CSCV, fold-by-fold stability, and a plain verdict ("likely overfit / inconclusive / robust"). Frame null results honestly ("cross-contract RV is mostly arbitraged; edge disappears after costs except around X"). Judges with quant backgrounds reward this heavily.
6. **Liquidity-adjusted executable price vs settlement.** Haircut the settlement price by a slippage model scaled by volume and OI, and show how much "paper edge" disappears. This is especially relevant for thin GOLDGUINEA/GOLDPETAL far months.
7. **Attribution panel.** Split strategy PnL into gold-beta (regression on near-month GOLDM returns) and residual relative value. It shows the strategy isn't just long gold.
8. **Tender-period "what-if" guardrail simulator.** A slider for the "exit N days before tender" rule shows the PnL and risk trade-off and the tail events it prevents.
9. **Grounded AI brief** with the verified-numbers badge (section 6).
- **Demo craft:** Open with a 30-second story ("On date D, PETAL traded ₹X/g rich to GOLDM; here's why our system *didn't* alert, and it was right"). Show a live alert arriving in Telegram. End on the integrity card. Keep a recorded fallback video in case the scrape or the cold start fails.

### Gaps
- I couldn't verify GitHub-hosted open-source futures spread dashboards or MCX-specific analytics repos, because the GitHub MCP failed to connect and searches surfaced only PyPI packages. Search GitHub directly for "mcx bhavcopy", "calendar spread dashboard streamlit" and "futures term structure streamlit".
- No published judging rubric specific to quant/trading hackathons turned up. The rubrics above are general fintech ones.
