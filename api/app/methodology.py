"""Embedded methodology docs — distilled from the project research files.

Served as markdown so the /methodology page and the AI assistant can cite the
same text. Nothing here drifts from the engine: the constants quoted are the
ones in app/config.py and app/engine/*.
"""

from __future__ import annotations

DOCS: list[dict[str, str]] = [
    {
        "id": "data-pipeline",
        "kind": "method",
        "title": "Data pipeline — Bhavcopy intake, uploads and the 403 reality",
        "body": (
            "MCX publishes bhavcopy rows through an ASP.NET page method: "
            "`POST https://www.mcxindia.com/backpage.aspx/GetDateWiseBhavCopy` with a JSON body like "
            "`{\"Date\":\"YYYYMMDD\",\"InstrumentName\":\"FUTCOM\"}`. Community scrapers add browser-shaped "
            "headers (Origin/Referer, XMLHttpRequest, desktop UA). In a first-hand test on 19 Oct 2026 that "
            "pattern returned **403 Access Denied** from Akamai — mcxlib caps range queries at 365 days and "
            "mcxpy is labelled experimental. The engine therefore treats scripted fetch as best-effort and "
            "the manual CSV upload as the *first-class* intake path: `POST /api/datasets/upload` validates "
            "every row (dates in several formats, duplicate (date, symbol, expiry) keys dropped, settlement "
            "> 0, OI ≥ 0, expiry ≥ trade date, gold-family symbols only), reports every fix and rejection, "
            "and flips `source` to api only after a clean parse — before any upload the engine reports "
            "`source: \"empty\"` and every data route answers 503. Byte-identical files are rejected "
            "by sha256 so a re-served stale file cannot fabricate a second day.\n\n"
            "Files land raw → clean with `source_sha256` carried per dataset, and the registry lives in "
            "`backend/data/datasets.json`."
        ),
        "sources": "MCX bhavcopy page; mcxlib (pypi); mcxpy (pypi); Zerodha market intel, Nov-2025 expiry bulletin",
    },
    {
        "id": "normalisation",
        "kind": "method",
        "title": "Normalisation — purity, unit and expiry carry, exactly three terms",
        "body": (
            "All definitions live in fine ₹ per gram of gold: "
            "`fine = settle / quote_grams / fineness`.\n\n"
            "**Purity.** IBJA polls 995 first and derives 999 mechanically; exchange bullion specs pay the "
            "proportionate 999/995 premium on delivery. That fixes a cross-purity comparison at "
            "`+log(999/995)·10⁴ ≈ +40.2 bps` — set by settlement rules, not chosen by the model. Skip it and "
            "every GOLDPETAL-vs-GOLDM comparison starts 40 bps \"rich\".\n\n"
            "**Unit.** Contracts are quoted per 10 g (GOLD, GOLDM, GOLDTEN), 8 g (GOLDGUINEA) or 1 g "
            "(GOLDPETAL); dividing by quote_grams removes the unit entirely.\n\n"
            "**Expiry carry.** GOLD/GOLDM expire on the 5th, the 999 contracts at month-end, so a naive "
            "same-month pair carries ~25 days of financing (~45 bps at 6.5%/yr) that decays toward zero — a "
            "naive z-score reads the decay as mean reversion. The engine estimates leg A's own net carry "
            "curve from non-stale nodes and reads it at leg B's tenor (log interpolation in tau space), "
            "leaving the *expiry-matched basis*.\n\n"
            "**The invariant.** The naive quoted gap decomposes additively in log basis points: "
            "`naive = −purity + carry + residual`. The data-status check re-derives this identity for five "
            "representative pairs each request and fails loudly if it drifts beyond 0.01 bps. Cross-contract "
            "₹/g agreement is also checked against the GOLDM anchor (300+ contracts tracked; max deviation "
            "7.4 bps on the bundled dataset)."
        ),
        "sources": "IBJA spot-polling mechanism PDF; NSE bullion contract specs; MCX Gold Petal DDR (Achiiever); ICICI Direct commodity guide",
    },
    {
        "id": "signal-math",
        "kind": "method",
        "title": "Signal maths — lagged z, robust MAD-z, percentile, half-life",
        "body": (
            "Three detectors run per pair, all *lagged by one session* — they see only data through t−1, so "
            "no signal can peek at today:\n\n"
            "- **Rolling z**: `z_t = (B_t − mean_{past 60}) / sd_{past 60}` — the classic normalised gap.\n"
            "- **Robust z**: median and `MAD × 1.4826` replace mean and sd, so a single stale print cannot "
            "yank the scale.\n"
            "- **Percentile**: rank of today's basis inside the 60-session window (0–100).\n\n"
            "The mean-reversion clock is estimated from an AR(1) fit: `HL = −ln 2 / ln φ` where "
            "`φ = 1 + β` of ΔB on B₋₁, valid for 0 < φ < 1. A signal whose half-life exceeds the days left "
            "before the earliest cut-off is not expected to revert in time — the alert layer withholds it. "
            "The window (60 sessions) sits near 3–5× typical half-lives on this book."
        ),
        "sources": "ArbitrageLab OU half-life docs; deck p.3 detector list",
    },
    {
        "id": "costs",
        "kind": "method",
        "title": "Cost model — the hurdle that decides the verdict",
        "body": (
            "Per leg, round trip:\n\n"
            "- **Statutory**: CTT 0.01% on sells, exchange txn charge, SEBI fee ₹10/crore, stamp duty "
            "0.002% on buys, 18% GST on the rest → **≈ 1.9 bps** (config `STATUTORY_BPS`).\n"
            "- **Brokerage**: ₹20 or 0.03% per order, whichever lower, both sides → on small notional the "
            "flat ₹40 dominates and *splitting orders cannot reduce it*.\n"
            "- **Bid-ask crossing** (modelled): GOLD 0.1 bps, GOLDM 0.15, GOLDTEN 1.2, GOLDGUINEA 3.5, "
            "GOLDPETAL 5.0 — guesses acknowledged as guesses; the petal estimate comes from published ₹5–10 "
            "lot spreads.\n\n"
            "At ₹1.48 lakh per 10 g: GOLDM leg ≈ 2–2.5 bps, GOLDPETAL leg ≈ 11–15 bps, so the "
            "GOLDM-vs-GOLDPETAL spread faces a **~14–18 bps** hurdle (25–35 bps at a 1.5–2× cost "
            "multiplier). The alert layer charges `edge = 80% × |residual| − cost` and stays silent when it "
            "is negative — which is most days, by design."
        ),
        "sources": "Zerodha charges page; Zerodha support (MCX txn charges); Bhaav Brief (petal spreads); Angel One GOLDTEN notice",
    },
    {
        "id": "alerts",
        "kind": "method",
        "title": "Alert gating — quiet by default, every silence explained",
        "body": (
            "A pair alert fires only if the gates stack: |z| ≥ 2 to arm (hysteresis re-arms above 2, resets "
            "below 1), the 80%-capture edge clears the round-trip cost, persistence holds two consecutive "
            "settlements, and neither leg is stale or in its tender window. Severity scales with |z| "
            "(critical ≥ 2.5 with streak ≥ 2). An *armed but cost-blocked* pair still prints an info card — "
            "the system says why it stays quiet. If nothing gated all day, a **signal-silence** digest names "
            "the largest residual and the cheapest round trip that could have monetised it. A deterministic "
            "data-quality card reports stale-row counts and the trust-score impact.\n\n"
            "Every card quotes the same numbers its chart shows: z, robust z, naive premium, purity, carry, "
            "residual, cost, expected edge, persistence and stale-print count."
        ),
        "sources": "Deck p.5 (fewer false calls); quant methodology notes",
    },
    {
        "id": "validation",
        "kind": "method",
        "title": "Validation — walk-forward, DSR, PBO, and the power floor",
        "body": (
            "The backtest trades real contract IDs with a lagged signal (decide on day t, fill at t+1), "
            "explicit round-trip costs, and force-flattening before tender. Walk-forward rolls a 250-day "
            "train window and a 40-day test window; folds never share trades.\n\n"
            "Two controls defend against fooling ourselves: the **Deflated Sharpe Ratio** (Bailey & López de "
            "Prado) corrects for the 7 configurations actually tried on this run and for skew/kurtosis; "
            "**PBO via CSCV** (8 blocks) estimates how often the in-sample best config lands below the "
            "out-of-sample median. The verdict needs all three stars — DSR ≥ 0.95, PBO ≤ 0.25, OOS Sharpe "
            "> 0.5 — before the word *robust* is used; otherwise the card reads *inconclusive* or *no "
            "edge*, and the breakeven-cost line reports gross P&L per round trip.\n\n"
            "The power statement converts test-day count into the minimum detectable Sharpe "
            "(≈ 1.96/√N · √250). Below it, absence of evidence is stated as exactly that."
        ),
        "sources": "SSRN 2460551 (DSR); SSRN 2326253 (PBO/CSCV); Park & Irwin (2 of 17); Harvey & Liu haircut",
    },
    {
        "id": "limitations",
        "kind": "limitation",
        "title": "Limitations — what this build does not claim",
        "body": (
            "- **Dataset**: there is no built-in market — the engine answers from the last uploaded CSV "
            "only, and reports `source: \"empty\"` with 503s until one arrives. Nothing is synthesised "
            "or preloaded at runtime.\n"
            "- **Daily settlements only**: no bid-ask, no intraday, no partial fills; a 30-minute VWAP print "
            "in a thin contract is not an executable price.\n"
            "- **Tender window**: sources give 3 vs 5 days for compulsory-delivery cut-offs (MCX circular "
            "040/2026 vs FYERS). The engine treats 6 days as the conservative guard and shades broader.\n"
            "- **GOLDGUINEA unit** is contested: per-8 g ICICI vs older 995-coin records; treated as a "
            "config value, surfaced in the spec card, and settled by the Value-implied-price check.\n"
            "- **Costs are modelled** from published slabs; real slippage in GOLDGUINEA and far GOLDTEN "
            "months is unmeasured.\n"
            "- **No MCX-serving SLA**: Akamai blocks scripted clients; uploads are the dependable path."
        ),
        "sources": "MCX circular 040/2026; FYERS notice board; ICICI Direct; Mondo Visione delivery history",
    },
    {
        "id": "sources",
        "kind": "source",
        "title": "Sources — what the ground truths rest on",
        "body": (
            "- [MCX Bhavcopy page](https://www.mcxindia.com/market-data/bhavcopy) and the ASP.NET page-method "
            "endpoint behind it (`backpage.aspx/GetDateWiseBhavCopy`), via mcxlib/mcxpy docs.\n"
            "- [IBJA spot polling mechanism](https://ibjarates.com/pdf/spot-polling-mechanism/spot-polling-mechanism.pdf) "
            "— 995 polled first, 999 derived.\n"
            "- [NSE bullion contract specifications](https://www.nseindia.com/static/products-services/"
            "commodity-derivatives-contract-specifications-bullion) — 999/995 delivery premium.\n"
            "- [MCX Gold Petal DDR](https://www.achiieversequitiesltd.com/wp-content/uploads/2019/04/"
            "gold-petal-october-2019-contract-onwards.pdf) — 995→999 conversion factor.\n"
            "- [ICICI Direct commodity guide](https://www.icicidirect.com/ilearn/commodity/articles/"
            "how-to-trade-gold-in-commodity-derivatives-market-in-india-1) — expiry bands, quote units.\n"
            "- [Zerodha charges](https://zerodha.com/charges/) and support pages — brokerage cap, txn charges.\n"
            "- [MCX circular 040/2026](https://www.mcxindia.com/docs/default-source/circulars/english/2026/"
            "january/circular---040---2026.pdf) and [FYERS notices](https://fyers.in/notice-board/"
            "gold-futures-expiry-5th-february-2026-staggered-delivery-contract/) — tender windows.\n"
            "- [SSRN 2460551](https://papers.ssrn.com/abstract=2460551) and [SSRN 2326253](https://papers.ssrn.com/abstract=2326253) "
            "— DSR and PBO methodology.\n"
            "- Zerodha marketintel bulletin 433706 — the 28-Nov-2025 month-end expiry observation."
        ),
        "sources": "Compiled from reports/MCX gold cross contract intelligence.md",
    },
]


def methodology_docs() -> list[dict[str, str]]:
    return [dict(doc) for doc in DOCS]
