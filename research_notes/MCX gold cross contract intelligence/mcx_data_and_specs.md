# MCX Gold Futures: Data Source (Bhavcopy) and Contract Specifications (GOLD, GOLDM, GOLDTEN, GOLDGUINEA, GOLDPETAL), as of Oct 2026

Research date: 2026-10-19. Important caveat: mcxindia.com and mcxccl.com sit behind Akamai and returned **HTTP 403 "Access Denied"** to every automated request made during this research (curl with browser UA + Referer + cookie jar, and WebFetch), including plain HTML pages. So official MCX contract-spec pages and circular PDFs could not be read directly. Specs below come from (a) an MCX-authored Gold Petal spec PDF (2019) mirrored on a broker site, (b) third-party library source code that calls MCX's JSON endpoints, and (c) broker/news pages. Verify current values against the MCX product page (https://www.mcxindia.com/products/bullion/gold), which per search snippets lists spec PDFs revised "July 2026 onwards".

## 1. MCX Daily Bhavcopy: how to fetch it, fields, quirks, history

### Takeaway
The Bhavcopy web page (https://www.mcxindia.com/market-data/bhavcopy) is backed by an ASP.NET page-method JSON endpoint, `POST https://www.mcxindia.com/backpage.aspx/GetDateWiseBhavCopy`, with body `{"Date":"YYYYMMDD","InstrumentName":"ALL|FUTCOM|OPTFUT|..."}`, and the rows come back under `d.Data`. Akamai bot protection blocks plain scripted clients (confirmed 403 from this environment), so a production pipeline needs a browser-like client (real browser or headless browser, or a TLS-fingerprint-matching HTTP client) and should expect it to break.

### Cited Findings
- **Endpoint and payload:** mcxlib (PyPI, v0.4) `get_bhav_copy()` POSTs to `https://www.mcxindia.com/backpage.aspx/GetDateWiseBhavCopy` with payload `{'Date': 'YYYYMMDD', 'InstrumentName': instrument}`, where instrument is one of `['ALL','FUTCOM','FUTIDX','OPTCOM','OPTFUT']`, and reads `response.json()['d']['Data']`, dropping the `__type` column — [mcxlib on PyPI](https://pypi.org/project/mcxlib/) (source inspected: `mcxlib/market_data.py`)
- **Headers used by scrapers:** `Content-Type: application/json`, `Accept: application/json, text/javascript, */*; q=0.01`, `X-Requested-With: XMLHttpRequest`, `Origin: https://www.mcxindia.com`, `Referer: https://www.mcxindia.com/market-data/bhavcopy`, a desktop Chrome User-Agent, and `sec-ch-ua*`/`Sec-Fetch-*` headers. An older mcxlib version hard-coded a `Cookie: ASP.NET_SessionId=...` — [mcxlib on PyPI](https://pypi.org/project/mcxlib/) (`mcxlib/libutil.py`)
- **Session warm-up fallback:** mcxpy first POSTs directly. If that fails it creates a `requests.Session`, GETs `https://www.mcxindia.com` to obtain cookies, then retries the POST with `json=data` — [mcxpy on PyPI](https://pypi.org/project/mcxpy) (`mcxpy/mcx.py`, `fallback_fetch`/`get_session`)
- **Field list:** mcxpy selects these response fields: `DateDisplay, InstrumentName, Symbol, ExpiryDate, OptionType, StrikePrice, Open, High, Low, Close, PreviousClose, Volume, VolumeInThousands, Value, OpenInterest`. It renames them `Volume -> "Volume(Lots)"`, `Value -> "Value(Lacs)"` and `OpenInterest -> "Open Interest(Lots)"`, so volume and OI are in **lots** and value is in **₹ lakh** — [mcxpy on PyPI](https://pypi.org/project/mcxpy)
- **Date parsing:** mcxpy parses `DateDisplay` and `ExpiryDate` with `pd.to_datetime(..., format='mixed', dayfirst=True)`, so the date strings come in more than one format — [mcxpy on PyPI](https://pypi.org/project/mcxpy)
- **ExpiryDate format:** MCX JSON (MarketWatch endpoint) returns `ExpiryDate` as `"17DEC2026"` / `"05JUN2026"` (DDMONYYYY) and contract names like `"GOLD05JUNFUT"`. Timestamps such as `LTT` are .NET `"/Date(1777441209000)/"` epoch-ms strings — [mcxlib tests](https://pypi.org/project/mcxlib/) (`tests/test_market_data.py`)
- **Other backpage endpoints (same pattern):** `GetMarketWatch`, `GetHistoricalDataDetails` (body `{"GroupBy":"D","Segment":"ALL","CommodityHead":"ALL","Commodity":"ALL","Startdate":"YYYYMMDD","EndDate":"YYYYMMDD","InstrumentName":"ALL"}`; the library enforces a range of 365 days or less), `GetOptionChain`, `GetMostActiveContractByVolumeFilter`, `GetHeatMap`, `GetGainer`/`GetLosers`, `GetPROClientDetailsSegmentWise`, and static monthly files under `https://www.mcxindia.com/docs/default-source/market-data/historicaldata/{year}/{month}/...` — [mcxlib on PyPI](https://pypi.org/project/mcxlib/)
- **Anti-bot (first-hand test, 2026-10-19):** `POST .../GetDateWiseBhavCopy` with browser UA, Referer, Origin and JSON body returned **403 Akamai "Access Denied"** (errors.edgesuite.net reference). A GET of `/market-data/bhavcopy` with a cookie jar also returned 403. WebFetch of mcxindia.com and mcxccl.com pages and circular PDFs also returned 403. (Direct observation; no URL to cite beyond the endpoint itself.)
- **Other Python packages:** mcxlib describes itself as fetching "publicly available market data from the MCX India website" into pandas, and mcxpy calls itself "experimental... for educational purpose" — [mcxlib](https://pypi.org/project/mcxlib/), [mcxpy](https://pypi.org/project/mcxpy)

### Inferences
- The quirks named in the brief (request DD/MM/YYYY vs response MM/DD/YYYY, space-padded symbols, latest trading day returned for holiday/future dates) are **plausible but not verified here**, because the endpoint was blocked. Note that the scrapers send `Date` as `YYYYMMDD`, not DD/MM/YYYY. mcxpy's `format='mixed', dayfirst=True` suggests that the response date formats really are inconsistent. A robust parser should: `.strip()` every Symbol; parse ExpiryDate with `%d%b%Y`; parse the row date defensively and **assert the returned row date equals the requested date** (to catch the "returns the last trading day" behaviour); and drop duplicate (Symbol, Expiry, Date) rows.
- `Close` in the bhavcopy is most likely MCX's official closing price / DSP (see section 3), not the last traded price, but no source available here confirmed which field it is.
- Keep a polite rate (for example, 1 request every few seconds, one date per call). No published rate limit was found. Akamai blocking is the binding constraint.
- **Alternatives:** (i) a broker API (Zerodha Kite historical, Upstox, Dhan, Fyers) for OHLCV+OI by contract; (ii) MCX `GetHistoricalDataDetails` (365-day windows); (iii) TradingView continuous symbols such as `MCX:GOLDPETAL1!` ([TradingView](https://www.tradingview.com/symbols/MCX-GOLDPETAL1!/?contract=GOLDPETALZ2026)). For the bhavcopy, MCX publishes no NSE-style zipped CSV archive that I could find.

### Gaps
- Exact current JSON key list and casing (for example `DateDisplay` vs `Date`, whether a `Unit` or `ContractName` field exists), the response date format, and the holiday behaviour could not be checked first-hand because of the 403.
- No published rate limit. No Kaggle or GitHub dataset with a full MCX gold bhavcopy history was found in the searches (GitHub MCP was unavailable this session).
- How far back the history goes on the bhavcopy endpoint is unconfirmed.

## 2. Contract specifications: GOLD, GOLDM, GOLDTEN, GOLDGUINEA, GOLDPETAL

### Takeaway
All five contracts trade with a ₹1 tick, but their quote bases differ, so the tick value per lot differs: GOLD ₹100, GOLDM ₹10, GOLDTEN ₹1, GOLDGUINEA ₹0.80, GOLDPETAL ₹0.10. GOLD and GOLDM expire on the 5th of the month, are quoted per 10 g and deliver 995 purity bars from Ahmedabad. GOLDTEN, GOLDGUINEA and GOLDPETAL expire on the last calendar day of the month and deliver 999 purity. GOLDTEN launched on 1 April 2025. In September 2025 the small contracts went from 3 to 6 listed expiries. Every contract is compulsory/staggered delivery, and brokers force square-off ahead of the tender period.

### Summary table (best available; verify against current MCX PDFs)
| Field | GOLD | GOLDM | GOLDTEN | GOLDGUINEA | GOLDPETAL |
|---|---|---|---|---|---|
| Trading unit | 1 kg | 100 g | 10 g | 8 g | 1 g |
| Quote basis | ₹/10 g | ₹/10 g | ₹/10 g | ₹/8 g | ₹/1 g |
| Tick | ₹1 | ₹1 | ₹1 | ₹1 | ₹1 |
| Tick value / lot | ₹100 | ₹10 | ₹1 | ₹0.8 | ₹0.1 |
| Purity delivered | 995 | 995 | 999 | 995 per older docs; DDR converted to 999 (conflict) | 999 |
| Expiry | 5th of month | 5th of month | last calendar day | last calendar day | last calendar day |
| Listing | bimonthly (Feb/Apr/Jun/Aug/Oct/Dec) | monthly | monthly | monthly | monthly |
| Max order size | (not found) | (not found) | 10 kg | (not found) | 10 kg |

### Cited Findings
**GOLDPETAL (MCX spec sheet, reference circular MCX/TRD/350/2019 dated 28 Jun 2019, Oct 2019 contracts onwards)** — [MCX Gold Petal spec PDF (mirror)](https://www.achiieversequitiesltd.com/wp-content/uploads/2019/04/gold-petal-october-2019-contract-onwards.pdf)
- Symbol GOLDPETAL. Description format `GOLDPTLMMMYY`. Contract start: 1st day of the launch month. Last trading day: **last calendar day** of the expiry month (preceding working day if that is a holiday).
- Trading Mon–Fri 9:00 a.m. to 11:30/11:55 p.m. Unit 1 g. Quote ₹ per 1 g, **ex-Mumbai**, inclusive of import duty and customs, excluding GST. Max order size 10 kg. Tick ₹1 per 1 g.
- Daily price limit: base 3%, relaxed to 6% with no cooling-off, then to 9% after a 15-minute cooling-off. Can be relaxed further in 3% steps if international moves exceed that.
- Initial margin: minimum 4% or SPAN, whichever is higher (MPOR 2 days, scaled by √2). ELM minimum 1%. Additional/special margins at the exchange's discretion.
- Position limits: client 5 MT or 5% of market-wide OI; member 50 MT or 20% of market-wide OI, both across **all gold contracts combined**.
- Delivery unit 1 g. Quality: **999 purity**, coins from LBMA-approved (or MCX-approved) suppliers, with a serial-numbered certificate. Packaging: 1 g coin, tamper-proof.
- Delivery centre: **Mumbai**, with additional centres at Ahmedabad and New Delhi. Additional-centre intentions are matched about 5 calendar days before expiry.
- **DDR / final settlement price:** "based on the Mumbai Spot price for Gold (10gms) 995 purity, which shall be converted to 999 purity (Gold Spot price 995 purity × 999/995), polled on the last day of the expiry ... by around 5.00pm", then × 1/10 for 1 g. No trading after the DDR is declared.
- Delivery logic: compulsory. Tender period: 5 working days before expiry, with a **5% incremental tender-period margin** on all open positions. Delivery period margin is the higher of 3% + 5-day 99% VaR, or 25%. Pay-in/pay-out at E+2.
- Seller default penalty: 3% of settlement price + replacement cost. Buyer default not permitted.
- In 2019 the launch calendar listed 3 expiries rolling monthly (for example, July 2019 launch → October 2019 expiry).

**GOLDTEN (launched 2025)**
- Announced by an MCX circular dated **18 March 2025**. Launched **1 April 2025** with April, May and June 2025 expiries — [HDFC Securities](https://www.hdfcsec.com/blog/details/the-golden-age-of-investment-mcx-launches-10-gram-gold-futures), [Angel One](https://www.angelone.in/news/commodities/gold-ten-futures-to-begin-trading-on-mcx-from-april-1). One Zerodha bulletin said trading was "set to commence on April 2, 2025, subject to readiness" — [Zerodha bulletin 19 Mar 2025](https://zerodha.com/marketintel/bulletin/408469/mcx-is-launching-gold-ten-10-gram-futures-contracts) (conflict between 1 and 2 April; most sources say 1 April).
- Unit 10 g. Quote ₹/10 g **ex-Ahmedabad**, including import duties, excluding GST. Tick ₹1. Max order 10 kg. Initial margin minimum 6% or SPAN. ELM 1% — [Angel One](https://www.angelone.in/news/commodities/gold-ten-futures-to-begin-trading-on-mcx-from-april-1)
- 999 purity from LBMA-approved or other approved suppliers. Price limits 3% → 6% → 9% (15-minute cooling-off before 9%) — [Outlook Money](https://www.outlookmoney.com/invest/gold-10-contracts-know-all-about-new-trading-unit-launched-by-mcx)
- Clearing house at Ahmedabad, additional delivery centres New Delhi and Mumbai, pay-in/pay-out at tender/expiry day + 2, tamper-proof packaging — [Zeebiz](https://www.zeebiz.com/personal-finance/news-10-gm-gold-futures-contract-mcx-trading-from-april-1-2025-sip-transparent-price-discovery-retail-investor-353191) (via search snippet; the page returned 402)
- Last trading day is the last calendar day of the month (preceding working day if a holiday) — [Anand Rathi](https://anandrathi.com/commodity-trading/goldten-futures)
- A 5paisa page claims GOLDTEN is cash-settled — [5paisa](https://www.5paisa.com/commodity-trading/mcx-goldten-price). This conflicts with the launch material describing physical delivery. Treat 5paisa as wrong unless MCX confirms otherwise.

**GOLD (1 kg) and GOLDM (100 g)**
- GOLD: ₹/10 g, 1 kg lot, ₹1 tick = ₹100/lot, expiry **5th** of the contract month, delivery unit 1 kg. GOLDM: ₹/10 g, 100 g lot, ₹1 tick = ₹10, expiry **5th**, delivery 100 g. Gold contracts were listed every two months, with 6 live at a time (2016 article) — [Zerodha Varsity, Gold part 1](https://zerodha.com/varsity/chapter/gold-part-1/)
- In 2026 GOLDM is listed monthly (Jan/Feb/Mar 2026 expiries on the 5th each) — [MarketScreener: MCX/TRD/456/2025](https://www.marketscreener.com/news/multi-commodity-exchange-of-india-modification-in-launch-calendar-of-gold-mini-gold-ten-gold-gui-ce7d59d3d88bf32c)
- GOLD 1 kg: 995 delivery, price ex-Ahmedabad. A January 2026 MCX circular (MCX/TRD/040/2026, 27 Jan 2026) names **Ahmedabad** as the clearing house/base centre with Mumbai and New Delhi as additional centres. It also says the staggered tender period is the last **3** trading days including expiry day, with all open positions at expiry marked for compulsory delivery — [MCX circular 040/2026](https://www.mcxindia.com/docs/default-source/circulars/english/2026/january/circular---040---2026.pdf?sfvrsn=ccd93a9e_0) (search-snippet only; the PDF returned 403, so which contract that "3 days" applies to is unconfirmed); [Bhaav Brief](https://bhaavbrief.in/learn/mcx-gold-contracts)
- Expiry on the 5th, or the prior working day if the 5th is a holiday (GOLD and GOLDM) — [Bhaav Brief](https://bhaavbrief.in/learn/mcx-gold-contracts)

**GOLDGUINEA**
- 8 g lot, ₹/8 g, ₹1 tick (₹0.80/lot), last-day expiry, delivery 8 g — [Zerodha Varsity](https://zerodha.com/varsity/chapter/gold-part-1/), [Bhaav Brief](https://bhaavbrief.in/learn/mcx-gold-contracts)
- DDR (the snippet is from a Gold Guinea DDR rule, possibly NSE's mirror contract): "based on the Ahmedabad Spot price for Gold (10gms) 995 purity, converted to 999 purity (×999/995), polled on the last day of expiry by around 5.00pm", then converted to 8 g — [NSE circular COM58924](https://nsearchives.nseindia.com/content/circulars/COM58924.pdf) (snippet; NSE launched its own Gold Guinea on 16 Oct 2023, so this may be NSE's spec, not MCX's)
- Historical MCX guinea deliveries were LBMA-approved, serially numbered coins with **995** purity certificates, mostly at Ahmedabad (2008) — [Mondo Visione](https://mondovisione.com/media-and-resources/news/mcx-gold-guinea-contract-witnessed-delivery-of-3118-coins-delivery-ranging-from--2011124/)

**Launch-calendar change (Sept 2025)**
- Circular **MCX/TRD/456/2025 (11 Sep 2025)**: the number of available contracts for Gold Mini, Gold Ten, Gold Guinea and Gold Petal went from **3 to 6**, effective **22 Sep 2025** — [MarketScreener](https://www.marketscreener.com/news/multi-commodity-exchange-of-india-modification-in-launch-calendar-of-gold-mini-gold-ten-gold-gui-ce7d59d3d88bf32c)
- Monthly launch calendars are issued by circular (for example MCX/TRD/567/2025, 31 Oct 2025, for November) — [MarketScreener](https://uk.marketscreener.com/news/multi-commodity-exchange-of-india-futures-and-options-contracts-launch-calendar-for-the-month-of-n-ce7d5cd8db8ef025)

**Tender / square-off practice (2026)**
- Zerodha, May 2026: GOLDM and GOLD expiring 5 Jun 2026 must be squared off by 10:30 PM on **2 Jun** (GOLDM) and **29 May** (GOLD). Gold Guinea, GoldTen, Gold10G and Gold Petal expiring **29 May 2026** must be squared off by 10:30 PM on **26 May**. All are "staggered delivery" contracts — [Zerodha bulletin May 2026](https://zerodha.com/marketintel/bulletin/448097/mcx-precious-metals-expiry-may-2026)
- FYERS: the GOLDM tender period starts 3 days before expiry; its notice for the Feb 2026 GOLD contract says 5 days — [FYERS GOLDM Mar 2026](https://fyers.in/notice-board/precious-metals-gold-m-expiry-5th-march-2026-staggered-delivery-contract/), [FYERS GOLD Feb 2026](https://fyers.in/notice-board/gold-futures-expiry-5th-february-2026-staggered-delivery-contract/)
- Zerodha does not let clients take physical delivery and closes positions before the expiry-month window — [Zerodha Varsity](https://zerodha.com/varsity/chapter/gold-part-1/)

### Inferences
- The May 2026 expiry date of 29 May (a Friday; 31 May was a Sunday) is consistent with "last calendar day, or preceding working day".
- The tender period is effectively about 5 trading days for GOLD 1 kg and about 3 for GOLDM and the small contracts. Data on the last few trading days before expiry is therefore distorted by forced broker exits (OI collapses, volume thins). An analytics product should roll to the next contract before the tender period, not at expiry.
- Spread analysis across contracts must normalise every price to ₹/g: GOLD and GOLDM /10, GOLDTEN /10, GOLDGUINEA /8, GOLDPETAL /1. It should also account for **purity basis**: 995 for GOLD/GOLDM vs 999 for TEN/PETAL (and GUINEA DDR). The ×999/995 factor (≈ +0.40%) means a "fair" 999 contract trades about 0.4% above 995 contracts on a per-gram basis. Delivery-centre basis (ex-Mumbai for PETAL in 2019 vs ex-Ahmedabad for the rest) adds small differences on top.
- Calendar mismatch: GOLD/GOLDM settle on the 5th, the small contracts on month-end. "Same month" contracts are about 25 days apart in expiry, which matters for carry-adjusted comparisons.

### Gaps
- Current (2026) official values for daily price limits, max order size and initial margin % of GOLD, GOLDM and GOLDGUINEA. Whether the GOLDPETAL base centre moved from Mumbai to Ahmedabad after 2019 (Angel One says Petal is priced ex-Mumbai — [Angel One](https://www.angelone.in/commodity/gold-petal)).
- GOLDGUINEA purity: 995 coins historically vs a DDR converted to 999. Unresolved without the current MCX PDF.
- The exact current tender-period length per contract (3 vs 5 days) and the size of the tender/delivery-period margin in 2026.
- The quality-allowance and premium/discount schedule for 995 vs 999 delivery in GOLD/GOLDM was not found.

## 3. Settlement price methodology (DSP vs Close vs FSP/DDR)

### Takeaway
MCXCCL's daily settlement / closing price is the VWAP of trades in the last 30 minutes of the session. If there are fewer than 10 trades in that window, it uses the last 10 trades. This follows SEBI circular SEBI/HO/CDMRD/DNPMP/CIR/P/2021/9 (11 Jan 2021). The final settlement price (DDR) for gold contracts is a **domestic spot price polled by the exchange on expiry day at about 5 pm** (995 purity per 10 g, converted to 999 for the 999 contracts), not the LBMA AM/PM fix.

### Cited Findings
- Closing price = VWAP of all trades in the last 30 minutes. If fewer than 10 trades occur, the last 10 trades are used. The basis is SEBI circular SEBI/HO/CDMRD/DNPMP/CIR/P/2021/9 of 11 Jan 2021 — [MCXCCL: Calculation of Closing Price / DSP](https://www.mcxccl.com/clearing-and-settlement/calculation-of-closing-price-daily-settlement-price) (search snippet; the page returned 403 on fetch)
- Gold Petal DDR: Mumbai spot, 995 purity, 10 g × 999/995, polled on expiry day around 5:00 pm, ×1/10 for 1 g. No trading after the DDR is declared — [MCX Gold Petal spec](https://www.achiieversequitiesltd.com/wp-content/uploads/2019/04/gold-petal-october-2019-contract-onwards.pdf)
- Gold Guinea DDR: Ahmedabad spot, 995, converted to 999, polled about 5 pm on expiry day, converted to 8 g — [NSE COM58924 snippet](https://nsearchives.nseindia.com/content/circulars/COM58924.pdf)
- On expiry, the DDR / final settlement price replaces the closing price for settlement (BSE gold spec, same industry convention) — [BSE Gold Futures spec](https://www.bseindia.com/downloads1/Gold_Futures_Contract_specification.pdf)
- NSE's commodity rule for comparison (not MCX): the bullion FSP is the simple average of the last polled spot prices on expiry day, E-1 and E-2 — [NSE Clearing settlement price](https://www.nseclearing.in/clearing-settlement/commodity-derivatives/settlement-price)

### Inferences
- For thin contracts (GOLDGUINEA, far GOLDTEN months), "Close" can be a 10-trade VWAP stretching well back before the close, so it can be stale relative to GOLDM. Cross-contract "premium" signals computed from closes should be treated with care. Filtering on traded volume, and preferring time-aligned LTP snapshots, will help.
- The bhavcopy `Close` on expiry day may equal the DDR. Unverified.

### Gaps
- MCX's current fallback when there are zero trades (theoretical / near-month-plus-spread price) was not retrieved.
- Whether MCX gold DDRs today use a single expiry-day poll or a multi-day average was not confirmed for 2026.

## 4. Transaction costs for commodity futures in India

### Takeaway
For non-agri futures such as gold: CTT 0.01% on the sell side; MCX transaction charge 0.0021% of turnover per side (₹210/crore); SEBI fee ₹10/crore; stamp duty 0.002% on the buy side (₹200/crore); GST 18% on brokerage + exchange + SEBI charges. Discount brokerage is ₹20 or 0.03% per order, whichever is lower. No contract-specific MCX charge for Mini or Petal was found in the sources.

### Cited Findings
- Zerodha commodity futures: brokerage 0.03% or ₹20/executed order (lower). CTT 0.01% sell side (non-agri). Transaction charges MCX 0.0021%, NSE 0.0001%. SEBI ₹10/crore non-agri (₹1 agri). GST 18% on (brokerage + SEBI + transaction charges). Stamp 0.002% or ₹200/crore buy side — [Zerodha charges](https://zerodha.com/charges/)
- MCX options transaction charge 0.0418%. Options CTT 0.05% sell side. Agri futures are CTT-exempt — [webnotes: Zerodha commodity brokerage 2026](https://v2.webnotes.in/zerodha-commodity-brokerage)
- Gold Petal bid-ask "often ₹5–10/lot" (per 1 g quote) — [Bhaav Brief](https://bhaavbrief.in/learn/mcx-gold-contracts)

### Inferences
- Approximate round-trip statutory cost, excluding brokerage: 0.01% CTT + 2×0.0021% exchange charge + 0.002% stamp + ~0.0002% SEBI + GST ≈ **0.017% of notional**. At ₹1.48 lakh/10 g (Oct 2026):
  - GOLDPETAL notional ≈ ₹14.8k → statutory ≈ ₹2.5, but a ₹40 round-trip brokerage (₹20 × 2, 0.03% cap = ₹4.4/side, so ~₹9 total) dominates. The 0.03% cap makes Zerodha brokerage only about ₹4.4/side on Petal.
  - GOLDM notional ≈ ₹14.8 lakh → statutory ≈ ₹250 + ₹40 brokerage.
- Bid-ask cost: a ₹5–10 spread on a ₹14.8k Petal is about 3.4–6.8 bps, which exceeds all statutory costs. GOLDM spreads of ₹1–3 per 10 g on ₹1.48 lakh are about 0.1–0.2 bps (inference; not sourced).

### Gaps
- No verified 2026 MCX circular on transaction-charge slabs. Whether MCX charges a different rate for Petal or Guinea was not found; Zerodha lists a single MCX futures rate.
- No systematic bid-ask spread data per contract.

## 5. Liquidity profile, trading hours, holidays

### Takeaway
GOLDM and GOLD (near month) dominate MCX gold volume and OI. GOLDPETAL has meaningful lot counts but tiny notional. GOLDGUINEA and GOLDTEN are thin. Liquidity is concentrated in the nearest expiry that is not yet in its tender period. Trading runs 9:00 a.m. to 11:30 p.m. (11:55 p.m. during US winter time). Several Indian holidays close only the morning session, with the evening session (from 5 pm) open.

### Cited Findings
- 2016 daily volume: GOLD about 12–13K lots, GOLDM about 14–15K, GUINEA about 1–1.5K, PETAL about 8–9K. The nearest month is most liquid — [Zerodha Varsity](https://zerodha.com/varsity/chapter/gold-part-1/) (dated)
- GOLDM snapshot (Nov 5 contract, undated): volume 1,73,920, OI 51,221 lots — [Groww GOLDM](https://groww.in/commodities/futures/mcx_goldm)
- GOLDGUINEA OI on 7 Sep 2026: Sep about 11,357, Oct 5,673, Nov 3,720 lots — [INDmoney](https://www.indmoney.com/commodities/futures/gold-guinea)
- GOLDPETAL rows among MCX most-active contracts (24 Sep 2026), with row volumes of about 67.7K, 45.9K and 22.9K contracts — [IIFL most active](https://www.indiainfoline.com/commodity/mcx/top-traded-volume)
- GOLD accounts for "the bulk" of MCX gold OI/volume. GUINEA liquidity is "Low" — [Bhaav Brief](https://bhaavbrief.in/learn/mcx-gold-contracts)
- Trading session Mon–Fri 9:00 a.m. to 11:30/11:55 p.m. — [MCX Gold Petal spec](https://www.achiieversequitiesltd.com/wp-content/uploads/2019/04/gold-petal-october-2019-contract-onwards.pdf)
- 2026 holidays: some (for example Holi, Maha Shivaratri) close only the morning session, with the evening session at about 5:00 pm–11:30/11:55 pm open. Good Friday and Christmas are full closures. Muhurat trading is on Sun 8 Nov 2026. The holiday lists conflict across sources — [Jainam MCX holidays](https://www.jainam.in/mcx-holidays/), [BankBazaar](https://bankbazaar.com/indian-holiday/mcx-holidays.html)

### Inferences
- In notional terms (lots × grams), GOLDM at about 170K lots ≈ 17 t/day dwarfs GOLDPETAL at about 70K lots ≈ 70 kg, and GOLDGUINEA OI of about 11K lots ≈ 90 kg. For relative-value signals, GOLDM (or GOLD) should be the price anchor, with the small contracts measured as premium/discount to it.
- Holiday evening-only sessions mean bhavcopy rows can exist on dates that equity calendars treat as holidays. Use MCX's own calendar, not the NSE equity calendar.

### Gaps
- No authoritative ADV/OI time series per contract for 2025–26. GOLDTEN volume figures were not found at all. Build them from the bhavcopy once access works.
- The official 2026 MCX holiday circular was not retrieved (403).
