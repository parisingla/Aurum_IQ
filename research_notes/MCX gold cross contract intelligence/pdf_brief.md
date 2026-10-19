# TimelessXO_Aurum.pdf — extraction and analysis

Source for every citation below: `/Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf` (8 pages, 960x540 pt slides, PDF 1.7, 2.2 MB). Cited as [PDF p.N](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf).

Extraction note: the PDF has **no text layer**. `pdftotext -layout` returned nothing, so every page is a rendered image. All quotes below were transcribed visually from the page images. Wording is faithful, but OCR-level verification was not possible.

## What is the document, and who are TimelessXO and Aurum?

### Takeaway
This is an 8-slide **team pitch/proposal deck** (idea-stage submission), not the organisers' problem brief. "TimelessXO" is the team name. "AURUM IQ" is their proposed product, "Explainable relative-value intelligence for MCX gold futures". The deck is for the **Hack in Hills** hackathon. The page header shows the logos of Web3 India, builder base and EXIDO.

### Cited Findings
- Title slide: "AURUM IQ" with the subtitle "Explainable relative-value intelligence for MCX gold futures". [PDF p.1](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Team: "Team TimelessXO". Members: **Pari Singla, AI/ML developer**; **Himanshu Solanki, Backend developer**; **Prerak Jain, Frontend developer**. [PDF p.1](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Branding on every slide header: logos for "Web3 India", "builder base" and "EXIDO" on the left, and "hack in hills" on the right. Pages 1 and 8 use a Himalayan-peak banner photo. [PDF p.1–8](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- The problem track is referenced as "Commodity Derivatives Intelligence: prices cannot be compared by simple subtraction." The number "03." does **not** appear in the PDF. [PDF p.2](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Page structure:
  1. Title/team
  2. Problem (the four contracts)
  3. Solution approach
  4. Architecture and stack
  5. Users and value
  6. Roadmap
  7. Comparison with a raw price gap
  8. "Thank you!"

  [PDF p.1–8](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)

### Inferences
- The deck reads as a round-1 or idea submission. The roadmap starts at "18-24 Oct" with a prototype, and today is 2026-10-19, so the build has not started or has only just started.
- The year is not printed anywhere. 2026 is inferred from the date context and from the reference to "GOLDTEN only exists since its 2025 listing".

### Gaps
- The PDF does not state which organisation set the problem, and it does not name a sponsor for the track. EXIDO appears only as a header logo.
- The deck does not contain the organisers' official problem statement text.

## Requirements, deliverables, judging criteria, constraints, timeline, submission format

### Takeaway
The deck contains **no organiser rules, judging criteria or submission-format specs**. The only dates are the team's own roadmap milestones:
- 18–24 Oct: prototype
- by 27 Oct: demo video and GitHub repo
- 20–21 Nov: finale

These milestones suggest that a demo video and GitHub repo are expected deliverables around 27 Oct, with a finale on 20–21 Nov.

### Cited Findings
- Roadmap title: "Roadmap: working prototype first, polish second". [PDF p.6](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Phase 1, "**18-24 Oct — Prototype**": "Bhavcopy ingest and checks", "Contract metadata", "Normalisation". [PDF p.6](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Phase 2, "**By 27 Oct — Demo and repo**": "Spread and z-score alerts", "Walk-forward backtest, net of costs", "Demo video and GitHub". [PDF p.6](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Phase 3, "**20-21 Nov — Finale**": "Dashboard polish", "Evidence-backed explanations", "Expiry-aware analysis". [PDF p.6](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- "Later" (out of scope): "Silver, crude and base metals"; "Licensed intraday and bid-ask data"; "ML only where a leakage-safe task justifies it". [PDF p.6](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Self-imposed constraints and disclaimers ("Honest by design"): "Research and decision support only."; "Historical results do not guarantee future returns."; "An anomaly is not automatically a tradable opportunity." [PDF p.7](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)

### Inferences
- "By 27 Oct — Demo and repo" is very likely the hackathon's online-round submission deadline. It needs a demo video plus a GitHub link.
- "20–21 Nov — Finale" is very likely the in-person Hack in Hills finale.
- Both points are inferred from the team's roadmap and are not stated as official rules.

### Gaps
- The deck has no judging criteria, scoring rubric, submission portal, file-format rules, team-size rules, or eligibility rules.
- Whether 27 Oct is an official deadline cannot be confirmed from this document.
- The deck does not say what must be shown live at the finale.

## Data specs, contract specs, formulas, tables, diagrams, tech stack, proposed approach

### Takeaway
The deck gives:
- a contract-spec table that matches the brief exactly
- a four-step method: validate, normalise, flag (rolling z-score, percentile, median/MAD), then walk-forward backtest net of costs
- a six-stage pipeline: Ingest → Metadata → Normalise → Analytics → Backtest → API+UI
- a stack of Next.js/TS/Recharts + FastAPI/pandas/NumPy/SciPy + PostgreSQL or SQLite/pytest/Docker

No explicit normalisation formula is written out.

### Cited Findings

**Contract table** (p.2, headed "Four gold contracts, one metal, four different bases"). It has columns Contract | Trading unit (bar scaled to grams) | Quoted | Purity | Expiry. A horizontal bar for each contract is drawn proportional to its gram size. GOLDM is shown as a long gold bar, and the others as short navy bars.

| Contract | Trading unit | Quoted | Purity | Expiry |
|---|---|---|---|---|
| GOLDM | 100 g | per 10 g | 995 | 3rd-5th |
| GOLDTEN | 10 g | per 10 g | 999 | 27th-31st |
| GOLDGUINEA | 8 g | per 8 g | 999 | 27th-31st |
| GOLDPETAL | 1 g | per 1 g | 999 | 27th-31st |

— [PDF p.2](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)

**Callout boxes on p.2.** [PDF p.2](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- "Same gold, different basis — Unit, quote basis and purity differ, so a raw price gap mixes real mispricing with contract design."
- "Expiry windows differ — GOLDM expires in the 3rd-5th; the other three in the 27th-31st. Contracts must be tracked by expiry."
- "Short overlap — GOLDTEN only exists since its 2025 listing, so shared history is limited and must be checked first."

**Method (p.3).** The slide is titled "AURUM IQ separates real signals from contract noise", with the subtitle "Normalise, flag, then test it honestly before anyone trusts it." [PDF p.3](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
1. "Validate the data — Check dates, padded symbols, gaps and stale prices from the MCX Bhavcopy."
2. "Normalise to one basis — Handle size, quote basis and purity per contract; keep the original price."
3. "Flag unusual spreads — Rolling z-score, percentile and median/MAD, each with a reason."
4. "Test net of costs — Walk-forward replay, thin-day liquidity, strategy kept apart from gold moves."

The slide's banner reads: "It can reject false signals, and show why an attractive spread is not tradable."

**Chart (p.3).** A line chart titled "Spread z-score, normalised pair":
- The y-axis runs from −4 to 4, with red dashed threshold lines at ±2.
- The series mostly stays between about −1.5 and +1.5, with one spike to about +3.4 that breaches +2 and then reverts.
- Caption: "Illustrative synthetic data to show the alert view. Not MCX results."

[PDF p.3](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)

**Architecture (p.4).** The slide is titled "Architecture: from Bhavcopy file to explainable alert". It shows a six-box left-to-right flow, with Analytics highlighted in gold. [PDF p.4](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Ingest: "Upload and validate MCX Bhavcopy"
- Metadata: "Contract specs with dates"
- Normalise: "Common basis, formula logged"
- Analytics: "Spreads, z-score, anomalies"
- Backtest: "Walk-forward, net of costs"
- API + UI: "FastAPI to dashboard"

**Stack (p.4).** "Next.js, TypeScript, Recharts" / "FastAPI, pandas, NumPy, SciPy" / "PostgreSQL or SQLite, pytest, Docker". [PDF p.4](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)

**Data flow (p.4).** "Raw file to validated observations" / "Normalised prices, original kept" / "Spreads and alerts, then backtest runs". [PDF p.4](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)

**Data source (p.4).** [PDF p.4](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- "MCX Daily Bhavcopy: symbol, date, expiry, OHLC, volume, open interest"
- "No API key needed"
- "Optional LLM explanations; works without one"

**Users and value (p.5).** The slide is titled "Built for people who need to trust a spread before acting on it". [PDF p.5](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Who uses it: "Commodity traders and derivatives researchers"; "Broker and fintech research desks"; "Students and quant analysts".
- How they use it: "Load a Bhavcopy file and pick two gold contracts"; "Read the normalised spread, alerts and data warnings"; "Replay the signal net of costs".
- What changes: "Fewer false mispricing calls"; "Every alert traces to a calculation"; "A clear no-edge answer when there is none".
- Footnote: "Existing tools: charting terminals, broker dashboards and generic backtesters mostly show raw prices. We still need to verify the landscape before claiming uniqueness."

**Comparison table (p.7).** The slide is titled "What a raw price gap cannot do". [PDF p.7](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Every row is "No" for "Raw gap" and "Yes" for "AURUM IQ".
- Rows: "Adjusts for unit, quote basis and purity"; "Checks data quality before any signal"; "Tracks each contract by its own expiry"; "Tests the signal net of costs and liquidity"; "Explains every alert with its calculation"; "Reports "no edge" when that is the answer".
- Footnote: "Comparison shows what a plain price-gap view does. Competing products are not yet verified."

### Inferences
- The implied normalisation is price per gram of fine gold. The formula would be `quoted_price / quote_grams / (purity/1000)`. For example, GOLDM ÷10 ÷0.995, GOLDGUINEA ÷8 ÷0.999, and GOLDPETAL ÷1 ÷0.999. This is **my inference**: the deck says only "formula logged" and does not write the formula.
- The spread and z-score are computed on a "normalised pair", meaning two contracts picked by the user (p.5). The analysis is pairwise, not a four-way index.
- The data is end-of-day only (daily Bhavcopy). Intraday and bid-ask data are explicitly deferred to "Later" (p.6). Any liquidity or cost model must therefore be built from daily volume and open interest.

### Gaps
- The deck gives no explicit formulas for normalisation, the z-score lookback window, percentile window, MAD threshold, alert thresholds (the chart shows ±2, but only as an illustration), cost assumptions (brokerage, exchange fees, CTT, GST, stamp duty, slippage), or margin/lot handling.
- It does not define how contracts are matched across different expiries. GOLDM expires on the 3rd–5th, the others on the 27th–31st, and the deck does not say whether pairing uses near-month, nearest expiry or a constant-maturity interpolation.
- It does not specify how "strategy kept apart from gold moves" is implemented. Possibilities include a hedge ratio, a beta-neutral leg sizing, or a dollar-neutral position.
- It defines no walk-forward train/test window sizes and no metrics (Sharpe, hit rate, drawdown).
- No real results are shown. The only chart is explicitly synthetic.
- The deck does not specify which LLM is used, or what the "optional LLM explanations" produce.

## Differences from, or additions to, the reference brief

### Takeaway
All four contract specs in the deck match the brief exactly, including the GOLDTEN 2025 listing. The deck mentions "padded symbols" and date checks, but it **does not** spell out the following Bhavcopy quirks from the brief:
- the request date format DD/MM/YYYY versus the response date format MM/DD/YYYY
- the ExpiryDate format (for example 04SEP2026)
- the fact that a request for a holiday returns the latest trading day

### Cited Findings
- Matches: GOLDM 100 g / per 10 g / 995 / 3rd-5th; GOLDTEN 10 g / per 10 g / 999 / 27th-31st; GOLDGUINEA 8 g / per 8 g / 999 / 27th-31st; GOLDPETAL 1 g / per 1 g / 999 / 27th-31st. [PDF p.2](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- GOLDTEN 2025 listing: matches the brief ("GOLDTEN only exists since its 2025 listing"). [PDF p.2](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Space-padded symbols are referenced only briefly: "Check dates, padded symbols, gaps and stale prices". [PDF p.3](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- Additions beyond the brief:
  - stale-price detection and gap detection (p.3)
  - thin-day liquidity filtering (p.3)
  - a "no edge" verdict (p.5, p.7)
  - optional LLM explanations (p.4)
  - "No API key needed" (p.4)
  - Bhavcopy fields listed as symbol, date, expiry, OHLC, volume, open interest (p.4)

  [PDF p.3–7](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)

### Inferences
- The validation step on p.3 is where the brief's unstated quirks need to be implemented:
  - parse dates as DD/MM for requests and MM/DD for responses
  - parse ExpiryDate in DDMONYYYY format
  - `.strip()` the symbols
  - de-duplicate holiday responses by checking that the returned date equals the requested date

### Gaps
- The deck does not say whether the data is pulled programmatically from the MCX Bhavcopy endpoint or uploaded manually. P.4 and p.5 say "Upload"/"Load a Bhavcopy file", which suggests manual upload. "No API key needed" leaves room for automated fetching.

## Gaps and ambiguities the team should resolve

### Takeaway
The deck is strong on framing and honesty but leaves the quantitative core unspecified. The team needs to decide on:
- the formulas
- expiry pairing
- windows and thresholds
- the cost model
- the hedge ratio
- the minimum overlap check for GOLDTEN
- real results to replace the synthetic chart

### Cited Findings
- The team acknowledges two open items:
  - "We still need to verify the landscape before claiming uniqueness." [PDF p.5](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
  - "Competing products are not yet verified." [PDF p.7](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)
- The chart is placeholder data: "Illustrative synthetic data to show the alert view. Not MCX results." [PDF p.3](file:///Users/himanshusolanki/Downloads/TimelessXO_Aurum.pdf)

### Inferences
Open decisions for the team (my synthesis, not stated in the PDF):
1. Write down the normalisation formula: per gram of fine gold, or per 10 g of 999 gold.
2. Decide whether to purity-adjust GOLDM's 995 quote, or treat the purity difference as a structural basis.
3. Choose an expiry-matching rule for pairs whose expiry windows differ (GOLDM on the 3rd–5th, the others on the 27th–31st), and decide how to handle rollover days.
4. Set the lookback windows and alert thresholds for the z-score, percentile and median/MAD signals.
5. Build the cost model from MCX fees, CTT, GST, stamp duty, brokerage and slippage, and decide how lot-size mismatch is handled. For example, 1 GOLDM lot is 100 g, which equals 100 GOLDPETAL lots.
6. Define liquidity filters ("thin-day") using volume and open interest thresholds.
7. Set the minimum shared history needed for GOLDTEN pairs given its 2025 listing.
8. Define how "kept apart from gold moves" is achieved (a hedge ratio).
9. Choose walk-forward window sizes and reporting metrics.
10. Make the fetch-versus-upload decision for Bhavcopy data.
11. Pick the database: the deck says "PostgreSQL or SQLite", which is undecided.
12. Specify what the LLM explains and choose a fallback.
13. Verify the competitor landscape.

### Gaps
- The deck gives no official hackathon rules or judging rubric to prioritise these items against. The organiser's problem brief must be consulted separately.
