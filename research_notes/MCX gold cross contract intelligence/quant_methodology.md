# Quantitative Methodology for Cross-Contract RV, Carry, and Walk-Forward Backtesting on MCX Gold (GOLDM / GOLDTEN / GOLDGUINEA / GOLDPETAL), Daily Settlement Data Only

Scope note: formulas marked "(derived)" are standard algebra the researcher worked out from the cited contract terms and models. They have no single source and should be unit-tested. Exchange-specific numbers (expiry rules, fees) change by circular. Check each one against the current MCX circular before coding it.

---

## 1. Normalization to a common basis (purity, quotation unit, expiry mismatch)

### Takeaway
Convert every contract to ₹ per gram of fine gold: settlement ÷ quotation grams ÷ fineness. MCX's own delivery rules use the proportional 999/995 ratio, so this conversion matches how the exchange values the gold. The larger problem is expiry mismatch. GOLDM expires around the 5th; the 999 small contracts expire at month-end, or the last business day. That gap of roughly 25 days is worth about 0.4–0.5% of price at Indian carry rates. It must be removed by interpolating along the curve, in log price against time to expiry, before any cross-contract comparison.

### Cited Findings
- Contract table (ICICI Direct): Gold 1 kg / Gold Mini 100 g / Gold Ten 10 g / Gold Guinea 8 g / Gold Petal 1 g. Purity is 995 for Gold and Gold Mini and 999 for Ten, Guinea and Petal. Ticks: Rs 1 per 10 g for Gold, Mini and Ten; Rs 1 per 8 g for Guinea; Rs 1 per 1 g for Petal. Expiry: 5th day of the expiry month for Gold and Gold Mini; last calendar day of the month for Ten, Guinea and Petal. — [ICICI Direct](https://www.icicidirect.com/ilearn/commodity/articles/how-to-trade-gold-in-commodity-derivatives-market-in-india-1)
- The same ICICI table gives Gold Guinea a 1 g quotation base, but its tick is "Rs 1 per 8 g" and its P&L per ₹1 move is 0.8. These figures conflict internally (see Gaps). — [ICICI Direct](https://www.icicidirect.com/ilearn/commodity/articles/how-to-trade-gold-in-commodity-derivatives-market-in-india-1)
- GOLDM: 100 g contract, quoted per 10 g, tick Rs 1/10 g, expiry on the 5th of the contract month, max order 10 kg. — [BSE-hosted GOLDM spec, via search summary](https://www.bseindia.com/downloads1/Gold_Mini_Futures_Contract_specification.pdf) (the direct fetch returned 403)
- Purity premium rule in Indian exchange bullion specs: a seller delivering 999 against a 995 contract receives a proportionate premium at the delivery rate × 999/995. Gold below 995 is rejected. — [NSE bullion contract specs](https://www.nseindia.com/static/products-services/commodity-derivatives-contract-specifications-bullion); [BSE Gold Mini spec](https://www.bseindia.com/downloads1/Gold_Mini_Futures_Contract_specification.pdf) (both from search summaries; the NSE page timed out on fetch)
- GOLDTEN: 10 g, 999 fineness (LBMA or MCX-approved refiners), quoted ex-Ahmedabad including import duty and excluding GST. Final settlement is based on the Ahmedabad spot price for 10 g of 995 gold, adjusted to 999. Delivery is compulsory, with Ahmedabad as the primary centre (Mumbai and New Delhi additional). Staggered delivery starts 5 trading days before expiry. — [HDFC Sky](https://hdfcsky.com/blogs/share-market/gold-ten-10g-futures-set-to-launch-on-mcx-from-1st-april-2025)
- Gold Petal, Gold Guinea and Gold Ten expired on 31 Oct 2025 and are classed as compulsory-delivery contracts. The staggered tender period starts 5 days before expiry. The broker's square-off deadline was 9:00 PM on 24 Oct 2025. — [FYERS notice](https://fyers.in/notice-board/precious-metals-expiry-31st-october-2025-compulsory-delivery-contracts/)
- One GoldTen contract expired on 28 Nov 2025, not the 30th (30 Nov 2025 was a Sunday). That points to a "last business day" rule rather than a strict last calendar day. — [Zerodha bulletin](https://zerodha.com/marketintel/bulletin/433706/mcx-precious-metals-expiry-november-2025)
- An MCX circular (MCX/TRD/567/2025) lists GOLDTEN contracts launching 3 Nov 2025 with expiry 30 Apr 2026, so several months trade at the same time. — [MarketScreener (MCX circular)](https://uk.marketscreener.com/news/multi-commodity-exchange-of-india-futures-and-options-contracts-launch-calendar-for-the-month-of-n-ce7d5cd8db8ef025)
- Koijen et al. avoid unreliable commodity spot data. They take the nearest two or three futures, extrapolate a synthetic spot, and linearly interpolate to a constant 1-month maturity. Interpolated prices are used only to compute signals, never to compute traded returns. — [Koijen, Moskowitz, Pedersen, Vrugt (2018), "Carry", JFE, accepted manuscript](https://research-api.cbs.dk/ws/files/57294842/lasse_heje_pedersen_et_al_carry_acceptedmanuscript.pdf)

### Inferences
- **Fine-gold normalization (derived).** Let P be the settlement price in the contract's quotation unit, q the quotation grams and φ the fineness:
  - GOLDM: p_fine = P / 10 / 0.995  (₹ per g fine)
  - GOLDTEN: p_fine = P / 10 / 0.999
  - GOLDPETAL: p_fine = P / 1 / 0.999
  - GOLDGUINEA: p_fine = P / 8 / 0.999 if quoted per 8 g, or P / 0.999 if quoted per 1 g. Check this from the raw data: a per-8 g quote is about 0.8× the GOLDTEN price.
  - Equivalently, to quote in "₹ per 10 g of 999", multiply GOLDM by 999/995 (≈ 1.00402). This is exactly the exchange's delivery-premium ratio and the GOLDTEN FSP adjustment (995 spot adjusted to 999), so the conversion is consistent with how settlement works. It is not just a modelling assumption.
- **Purity is a fixed +40.2 bps level shift.** It does not change spread dynamics. Applying it, or leaving it out, only moves the mean of a log spread. That is harmless for z-scores computed on demeaned spreads, but it matters for "absolute mispricing" alerts and breakeven analysis.
- **Expiry mismatch dominates purity.** At an implied carry of r ≈ 6–7% a year, the 25-day gap between GOLDM (around the 5th) and month-end contracts is worth about 0.065 × 25/365 ≈ 0.45% (derived). Comparing "GOLDM Dec" with "GOLDTEN Dec" without adjustment therefore builds in a large, structural, time-varying spread that shrinks as the expiries approach. That is a classic false signal.
- **Interpolation recipe (derived; constant-carry log-linear, KMPV-style):**
  1. For each date t, collect every live contract i of every product with its fine-gold price p_i and time to expiry τ_i = (T_i − t)/365, using calendar days to match accrual. Product dummies carry the cross-contract basis.
  2. Implied carry between two nodes of the same product: c_{ij} = ln(p_j/p_i) / (τ_j − τ_i). Under F = S·e^{(r+u−y)τ}, this is the net cost of carry: repo plus storage minus convenience yield.
  3. Price at a target expiry τ* between nodes: ln p(τ*) = ln p_i + c_{ij}(τ* − τ_i). Outside the node range, extrapolate with the nearest c, and flag the result as lower quality.
  4. Build the reference curve from the most liquid product (GOLDM, or big GOLD if available) and read it off at each small contract's expiry. The relative-value residual is then RV_k(t) = ln p_k(t) − ln p̂_ref(τ_k; t). This compares like with like: same delivery date, same fineness.
  5. Synthetic spot: extrapolate the front pair to τ = 0. Only GOLDM gives a node near the 5th. If big GOLD is not in the dataset, near-dated extrapolation leans on one or two GOLDM nodes plus the month-end products.
- **Interpolation must be point-in-time.** Use only contracts with a valid settlement on day t, and exclude stale nodes (zero volume on t). Otherwise a stale reference node creates a phantom RV.
- **Calendar convention.** Pick ACT/365 for accrual and trading days (about 250 a year on MCX) for volatility scaling. Mixing the two is a silent error.
- **Settlement-basis differences remain after normalization.** GOLDM delivers 995 bars and the 999 contracts deliver 999. GST and the delivery-centre logistics are the same (Ahmedabad), but the bar formats differ. Physical premia for small 999 coins and bars in the local market do not enter the futures FSP, so in theory they should not affect the futures basis at expiry.

### Gaps
- No primary MCX contract specification document could be fetched (BSE PDF returned 403; the NSE page timed out). The exact current MCX wording on GOLDM delivery logic is unconfirmed: ICICI lists GOLDM as "mark to market", while other sources treat MCX gold contracts as compulsory delivery. The purity-premium clause for GOLDM is confirmed only from BSE/NSE bullion specs, not MCX.
- The Gold Guinea quotation unit (per 8 g vs per 1 g) conflicts within the ICICI source.
- The month-end rule (last calendar day vs last business day) differs between sources, and GOLDTEN's listed contract months are not fully documented. The team should derive expiry dates from the data's own expiry column, not from a rule.

---

## 2. Spread construction: basis, implied repo/carry, calendar spreads, and carry / roll-down / curve-change decomposition

### Takeaway
Work in log fine-gold prices. Basis and spreads are then in bps (×10⁴). Implied carry is the log calendar slope divided by Δτ. P&L splits exactly into (a) carry/roll-down on an unchanged curve and (b) curve change. For cross-contract RV, the gold level cancels, so what remains is a term-structure effect plus a pure product basis. KMPV give the canonical model-free definition: "carry = futures return if prices stay the same", with bond carry = slope + roll-down.

### Cited Findings
- KMPV definition: carry is "an asset's futures return, assuming that prices stay the same", and return = carry + E(price appreciation) + unexpected price shock. — [Koijen et al. 2018](https://research-api.cbs.dk/ws/files/57294842/lasse_heje_pedersen_et_al_carry_acceptedmanuscript.pdf)
- Commodity carry (KMPV eq. 9): with F_t = S_t(1 + r_f − δ_t), where δ is the convenience yield net of storage, C_t = (S_t − F_t)/F_t = (δ_t − r_f)/(1 + r_f − δ_t). Commodity carry "is effectively the same as … the basis". — [Koijen et al. 2018](https://research-api.cbs.dk/ws/files/57294842/lasse_heje_pedersen_et_al_carry_acceptedmanuscript.pdf)
- Finite-maturity carry (KMPV eq. 10): C_t^τ = (S_t^{τ−1} − F_t^τ)/F_t^τ, which assumes the price of a fixed time-to-maturity, not a fixed expiry date, stays constant. This is the roll-down concept. Bond approximation (eq. 13): C ≈ (y^τ − r_f) − D_mod(y^{τ−1} − y^τ), i.e. "slope" plus "roll down". — [Koijen et al. 2018](https://research-api.cbs.dk/ws/files/57294842/lasse_heje_pedersen_et_al_carry_acceptedmanuscript.pdf)
- In India, gold carrying cost covers storage and insurance at MCX-accredited vaults, short-term interest rates and physical supply/demand. — [Mudrex (practitioner)](https://mudrex.com/learn/gold-futures-returns-in-india/)

### Inferences
- **Definitions (derived).** Let f = ln p_fine.
  - Cross-product basis at matched expiry: B_k(t) = [f_k(t) − f̂_ref(τ_k; t)] × 10⁴ bps.
  - Calendar spread within a product: CS_{ij}(t) = f_j − f_i (bps). Implied annualized carry: c_{ij} = CS_{ij}/(τ_j − τ_i).
  - Implied repo, given storage u and convenience yield y: r_impl = c − u + y. On daily data alone u and y are not separately identified. Report c as "net carry" and compare it with an exogenous benchmark (MIBOR or T-bill rate) as a sanity check. A persistent c − r_benchmark is the market's price of financing plus storage net of convenience, not an arbitrage.
- **Constant-maturity series (derived).** Construct f_CM(τ*; t) for τ* ∈ {30, 60, 90} days by the log-linear interpolation in §1. Use these for signal and z-score history. Never use them for P&L: KMPV make the same split.
- **Three-way decomposition for a held contract i from t to t+1 (derived).** Write f_i(t) = s(t) + g_t(τ_i), where g_t(τ) = c_t(τ)·τ is the curve's log-premium at tenor τ:
  - Δf_i = Δs (level move; cancels in any fine-gold-neutral spread)
    + [g_t(τ_i − Δt) − g_t(τ_i)] (carry/roll-down: move along today's unchanged curve)
    + [g_{t+1}(τ_i − Δt) − g_t(τ_i − Δt)] (curve change at constant tenor).
  - For a flat-carry curve (g = cτ), the roll-down term is −c·Δt, and a long futures position loses the carry each day relative to spot. That is mechanical convergence and should not be confused with signal.
  - For a cross-product RV position (long k, short the ref at the same expiry), the Δs and most of the roll-down cancel. P&L ≈ ΔB_k plus the residual from the ref being interpolated (the ref legs physically held have different τ). Decompose that residual separately so expiry-gap carry does not masquerade as alpha.
- **Expected convergence.** For two contracts with the same delivery date and the same delivered fine gold, the basis should converge to about 0 at expiry, because both settle off the Ahmedabad spot with the 999/995 adjustment. GOLDM and the 999 products never share an expiry date. Convergence of GOLDM vs PETAL is therefore never enforced by delivery: the "arbitrage" is to carry one leg to a different date, which exposes the trade to carry/repo and FSP-polling risk.

### Gaps
- No Indian-market source quantified MCX gold implied repo vs MIBOR/T-bill or storage charges; the vault charges are by circular and were not retrieved.
- The KMPV commodity treatment is monthly. No daily-frequency decomposition study on MCX gold was found.

---

## 3. Signal design: z-scores, half-life, cointegration vs a known hedge ratio, Kalman, filters, quiet thresholds

### Takeaway
These are contracts on the same underlying with a hedge ratio fixed by contract terms (fine-gold grams), so the economically correct spread is known a priori. Test it for stationarity (ADF/KPSS, OU half-life). Do not estimate hedge ratios with Engle-Granger, Johansen or a Kalman filter: that adds parameters that can be overfit and lets look-ahead in. Signals: an expanding or rolling z-score of the matched-expiry basis, with entry and exit hysteresis. Gate entries on liquidity, and require the expected reversion (in bps) to exceed the round-trip cost hurdle by a margin.

### Cited Findings
- AR(1)/OU half-life: HL = −ln 2 / ln φ, where φ is the AR(1) coefficient on the level. In Δy-on-y_{t−1} regression form, HL = −ln 2 / ln(1+β). HL ≈ −ln 2/β is a small-β approximation. It is meaningful only for 0 < φ < 1, and the estimated reversion speed is biased in small samples. — [Hudson & Thames ArbitrageLab OU docs](https://hudson-and-thames-arbitragelab.readthedocs-hosted.com/en/latest/technical/api/arbitragelab/optimal_mean_reversion/ou_model/index.html); [MetricGate OU MLE](https://metricgate.com/docs/ornstein-uhlenbeck-mle-estimation/); [LuxAlgo pairs stack](https://www.luxalgo.com/library/concept/pairs-trading-stack/)
- Kalman filter: treats the hedge ratio as a hidden state and avoids tuning a rolling-window lookback. Entry bands are set as multiples of the spread's standard deviation (Chan 2012; TLT/IEI example). — [QuantStart: Dynamic hedge ratio](https://www.quantstart.com/articles/Dynamic-Hedge-Ratio-Between-ETF-Pairs-Using-the-Kalman-Filter); [QuantStart: Kalman pairs in QSTrader](https://www.quantstart.com/articles/kalman-filter-based-pairs-trading-strategy-in-qstrader); [ArbitrageLab Kalman](https://hudson-and-thames-arbitragelab.readthedocs-hosted.com/en/latest/technical/api/arbitragelab/other_approaches/kalman_filter/index.html)
- Johansen cointegration finds MCX gold spot and futures cointegrated, consistent with cost of carry. — [Singh & Singh 2018 (RePEc)](https://ideas.repec.org/a/rej/journl/v21y2018i68p111-120.html)
- Pairs trading benchmark: distance-matched pairs plus a simple threshold rule gave up to 11% annualized excess return in 1962–2002 daily US data. — [Gatev, Goetzmann, Rouwenhorst 2006 via Alpha Architect](https://alphaarchitect.com/2013/06/pairs-trading-kicks-butt/)
- Liquidity outside Big Gold and Gold Mini is "quite bad". — [Zerodha Varsity](https://zerodha.com/varsity/chapter/gold-part-1/)

### Inferences
- **Spread to model (derived).** X_t = B_k(t), the expiry-matched, purity-normalized log basis in bps (§1–2). No estimated β: in fine-gold terms β ≡ 1. Cointegration testing reduces to unit-root testing of X_t (ADF H0: unit root; KPSS H0: stationary; report both). If X_t is not stationary, the product basis is drifting, for example through structural premia or liquidity changes. That is a finding in itself, not a cue to fit a time-varying β.
- **When Kalman is justified.** Use a local-level Kalman filter, X_t = μ_t + ε_t with μ_t = μ_{t−1} + η_t, only to track a slowly moving equilibrium basis (for example after the GOLDTEN launch in April 2025, when the basis may re-settle). The signal is then the innovation z_t = (X_t − μ̂_{t|t−1})/√S_t. Tune Q/R on the training window only.
- **Z-score (derived).** z_t = (X_t − m_{t−1})/s_{t−1}, with m and s computed through t−1. Choices: an expanding window with a minimum of about 60 obs, a rolling window of W ≈ 3–5× the half-life, or EWMA with λ matched to the half-life. The lag-by-one rule stops the day-t print from contaminating its own normalizer.
- **Half-life use.** Estimate HL by OLS of ΔX on X_{t−1} in the training window. If the 95% CI on φ includes 1, or HL > (days to the earliest tender cut-off), skip the trade: the spread cannot be expected to revert before forced exit.
- **Quiet thresholds** (the ones that keep alerts rare):
  1. Hysteresis: enter at |z| ≥ z_in (e.g. 2–2.5), exit at |z| ≤ z_out (e.g. 0–0.5), with a hard stop at |z| ≥ z_stop or at the time limit (≈ 2×HL or the tender cut-off).
  2. Edge hurdle: also require |X_t − m| (bps) × expected reversion fraction ≥ k × round-trip cost in bps (k ≈ 1.5–2), with cost estimated per product (§4). This alone removes most PETAL/GUINEA alerts, because per-lot fixed costs are large relative to notional.
  3. Robust scale: use MAD × 1.4826 instead of the standard deviation, and empirical quantiles of the training-window |z|. Split-conformal variant: calibrate the 1−α quantile of |X − m| on a held-out calibration block and alert only above it, which bounds the false-alert rate at about α under exchangeability.
  4. Persistence: require the signal on two consecutive settlements, or the second-day print, to suppress single stale prints.
- **Regime/liquidity filters (derived):** trade only if both legs show volume > 0 and OI > threshold on day t, and preferably on t−1 as well. Skip when days-to-expiry < tender start + buffer for any leg. Skip on days with |gold return| > k·σ (limit moves, where settlement is noisy). Skip if either leg's settlement equals the previous settlement with zero volume (staleness flag).

### Gaps
- No published study applies OU, half-life or conformal thresholds specifically to MCX cross-size gold spreads.

---

## 4. Walk-forward backtest without look-ahead: timing, contract handling, expiry/tender, lot sizing, costs, stale prices

### Takeaway
Simulate holdings in actual listed contracts, not continuous series. Decide on day-t settlement and fill on t+1, at the next settlement plus a slippage model, which is the conservative choice when only daily data exist. Flatten before the 5-day staggered-delivery or tender window and the broker cut-off. Size in integer lots matched on fine grams. Apply the full Indian cost stack, with flat per-order brokerage modelled explicitly, because it dominates 1 g and 8 g contracts.

### Cited Findings
- Compulsory-delivery small gold contracts start staggered delivery 5 days before expiry. Brokers force square-off earlier (9 PM on 24 Oct for a 31 Oct expiry; another broker cites 7 PM about a week before). — [FYERS](https://fyers.in/notice-board/precious-metals-expiry-31st-october-2025-compulsory-delivery-contracts/); [Zerodha bulletin](https://zerodha.com/marketintel/bulletin/433706/mcx-precious-metals-expiry-november-2025)
- Positions still open when the tender period closes require taking or giving physical delivery at an exchange-approved vault. — [Aditya Birla Capital](https://www.adityabirlacapital.com/abc-of-money/mcx-gold-trading-explained)
- CTT is 0.01% on non-agri commodity futures, paid by the seller. — [Kotak Securities](https://www.kotaksecurities.com/investing-guide/share-market/what-is-commodity-transaction-tax); [ICICI Direct](https://www.icicidirect.com/ilearn/commodity/articles/understanding-commodity-transaction-tax)
- Stamp duty is 0.002% (₹200/crore) on the buy side; SEBI fee is ₹10/crore; GST is 18% on brokerage + exchange + SEBI charges. — [Rupeezy](https://support.rupeezy.in/support/solutions/articles/2100044913-what-are-mcx-transaction-and-other-charges-as-per-exchange-and-government); [IIFL](https://help.indiainfoline.com/portal/en/kb/articles/what-are-the-various-statutory-charges-like-stamp-duty-and-taxes-etc-29-7-2021)
- MCX transaction charge: 0.0021% per Rupeezy vs 0.0026% for group A (reducible to 0.00175% above ₹350 cr turnover) per Zerodha. The sources conflict. — [Rupeezy](https://support.rupeezy.in/support/solutions/articles/2100044913-what-are-mcx-transaction-and-other-charges-as-per-exchange-and-government); [Zerodha support](https://support.zerodha.com/category/account-opening/charges-at-zerodha/articles/what-is-the-logic-behind-mcx-transactions-and-why-is-it-not-the-same-for-all-brokers)
- An MCXCCL closing-price rule (circular MCX CCL/C&S/192/2020, for index futures) uses the VWAP of the last 30 minutes, falling back to the last 10 trades if fewer than 10 trades occurred. The fallback for no trades was not retrieved. — [Motilal Oswal summary](https://www.motilaloswal.com/blog-details/settlement-procedure-for-index-futures-contracts/19883)
- KMPV compute returns only on actually traded contracts, with GSCI-style rolls, and use interpolated prices only for signals. — [Koijen et al. 2018](https://research-api.cbs.dk/ws/files/57294842/lasse_heje_pedersen_et_al_carry_acceptedmanuscript.pdf)

### Inferences
- **Timing protocol (derived)**:
  - Information set at decision time t = settlements, volume and OI for t, plus all prior data. Any parameter (μ, σ, HL, thresholds) is fit on data ≤ t.
  - Execution: Option A (default) fills at the settlement of t+1 ± slippage. Option B fills at the t+1 open ± slippage, which needs OHLC and is noisier. Option C fills at the t settlement with a heavy slippage penalty. Use C only as a sensitivity check, since the settlement is a 30-minute VWAP the trader could not fully capture once the signal was known.
  - Walk-forward: train on a rolling or expanding window (e.g. 250–500 days), test on the next block (e.g. 20–60 days), roll forward. Purge or embargo trades whose holding period crosses the train/test boundary (López de Prado's purging/embargo).
- **Contract handling.** Hold explicit contract IDs (symbol + expiry). Mark-to-market daily at that contract's settlement. Rolls are explicit trades with costs. No back-adjusted continuous series appear anywhere in the P&L path.
- **Expiry/tender rule (derived).** Force-flatten every leg at the settlement of the last day before min(broker cut-off, tender start − 1). Do not open a trade whose expected holding period (≈ HL) exceeds days remaining to that cut-off. Since GOLDM expires around the 5th and the 999 legs at month-end, the cross-product trade's binding constraint is usually GOLDM's earlier cut-off. If month-end legs pair with a later GOLDM month, the binding constraint shifts to the month-end leg.
- **Lot granularity and fine-gold matching (derived).** Fine grams per lot: GOLDM 100 × 0.995 = 99.5 g. GOLDTEN 9.99 g. GOLDPETAL 0.999 g. GOLDGUINEA 8 × 0.999 = 7.992 g.
  - 1 GOLDM ↔ 10 GOLDTEN (99.9 g) leaves a 0.4 g fine residual (0.40% net long or short gold). 1 GOLDM ↔ 100 PETAL behaves the same way. 2 GOLDM (199 g) ↔ 25 GUINEA (199.8 g) leaves a 0.8 g residual (0.40%).
  - Minimum clean GUINEA unit: LCM(100, 8) = 200 g gross means 2 GOLDM vs 25 GUINEA, or 25 GUINEA vs 20 GOLDTEN (200 g gross vs 199.8 g fine). Run an integer program to minimize |fine-gram residual| subject to max lots. Report the residual gold beta explicitly. At gold vol of ~15%/yr, a 0.4% net exposure contributes about 0.06% annualized vol per unit notional, which is usually negligible but must be accounted for.
- **Cost model per round trip, as a fraction of notional N (derived from the cited rates):**
  - Statutory/exchange: CTT 0.01% (sell leg) + stamp 0.002% (buy leg) + exchange about 0.0021–0.0026% per side × 2 + SEBI 0.0001% × 2 + 18% GST on (exchange + SEBI + brokerage). That comes to about 0.018–0.020% ≈ 1.8–2.0 bps per round trip per leg before brokerage. A two-leg spread round trip is about 3.6–4 bps.
  - Brokerage: model it as max(fixed ₹/order, % of notional), using the team's actual broker schedule. At a gold price around ₹1.2–1.3 lakh per 10 g, a PETAL lot is roughly ₹12–13k notional. A fixed ₹20 per order (a common discount-broker rate; verify) is then about 15 bps per side. Matching 1 GOLDM with 100 PETAL lots at one order each is prohibitive, so model the order count per leg.
  - Tick/half-spread: one tick is ₹1 per g on PETAL (≈ 0.8 bps of price) vs ₹1 per 10 g on GOLDM (≈ 0.08 bps). Assume a minimum slippage of ≥1 tick per side on thin contracts, scaled up by an illiquidity multiplier, for example slip = a + b·(1/√(volume)) or a step penalty when volume is under a threshold.
  - No-trade rule: if either leg has zero volume on the execution day, the order is not filled. Carry the order to the next day or cancel it.
- **Stale settlements.** On zero-volume days the settlement may be a fallback or theoretical price, not a traded price (the fallback rule was not retrieved). Flag any day with volume = 0 or an unchanged settlement. Exclude such days from signal generation, keep them for MTM, and run a sensitivity check that marks stale days at the last traded settlement of the liquid leg plus the carry adjustment. Stale prints on the small leg produce spurious z-spikes that "revert" the next day, which is an artifact that inflates backtest Sharpe.
- **Survivorship and point-in-time.** Contract lists and specs change over time: GOLDTEN was launched in April 2025, and tick sizes and expiry rules change by circular. Encode a time-stamped spec table and do not apply current specs to history.

### Gaps
- MCX's exact current gold daily settlement price (DSP) methodology and its zero-trade fallback were not retrieved; the cited rule is from an MCXCCL index-futures circular.
- The current MCX gold transaction charge rate is unresolved (0.0021% vs 0.0026%). Brokerage depends on the broker.
- No source on actual bid-ask spreads for PETAL/GUINEA/GOLDTEN was found. The slippage model must be calibrated, for example from intraday data or the OHLC range, or treated as a sensitivity parameter.

---

## 5. Performance attribution and statistical validation

### Takeaway
Show market neutrality empirically, not just by construction. Regress daily strategy returns on gold returns with HAC errors, then report alpha and the beta-hedged series. Judge significance with multiple-testing-aware tools: the deflated Sharpe ratio (DSR) over the number of configurations tried, PBO via combinatorially symmetric cross-validation (CSCV), and White's Reality Check or Hansen's SPA with a stationary bootstrap. Report block-bootstrap confidence intervals, turnover, hit rate, cost per trade and capacity.

### Cited Findings
- DSR corrects the Sharpe ratio for selection bias under multiple testing and for non-normal returns. — [Bailey & López de Prado 2014, SSRN 2460551](https://papers.ssrn.com/abstract=2460551)
- PBO is the probability that the in-sample-best configuration underperforms the out-of-sample median. It is estimated non-parametrically by CSCV. Leaving failed trials out biases it downward, and CSCV weakens time ordering, so it complements walk-forward testing rather than replacing it. — [Bailey, Borwein, López de Prado, Zhu, SSRN 2326253](https://papers.ssrn.com/abstract=2326253); [LuxAlgo PBO](https://www.luxalgo.com/library/concept/probability-of-backtest-overfitting/); [fynance CSCV code](https://fynance.readthedocs.io/en/master/_modules/fynance/research/overfit.html)
- White's Reality Check tests whether the best of the full universe of rules beats a benchmark. It can be too conservative when poor rules are included; Hansen's SPA corrects this. After correcting for data snooping, technical rules were profitable in only 2 of 17 US futures (1985–2004). — [Park & Irwin, AgEcon](https://ageconsearch.umn.edu/record/19039/files/cp05pa01.pdf); [Hsu & Kuan re-examination](https://c.mql5.com/forextsd/forum/211/Re-Examining%20the%20Profitability%20of%20Technical%20Analysis%20with%20Whitets%20Reality%20Check%20and%20Hansen9s%20SPA%20Tes.pdf)
- Harvey & Liu: the 50% Sharpe haircut is only a rule of thumb. The correct multiple-testing haircut is nonlinear, penalizing marginal Sharpe ratios heavily and high ones moderately. — [Harvey & Liu, "Backtesting" (Duke)](https://people.duke.edu/~charvey/Research/Published_Papers/P120_Backtesting.PDF); [quantstrat implementation](https://rdrr.io/github/braverock/quantstrat/src/sandbox/Harvey_Liu_Backtesting/50a170e4e37da951ea1192888418c82a/Haircut_SR%20with%20sample_random_multests.R)

### Inferences
- **Beta check (derived).** r_p,t = α + β·r_gold,t + ε_t, where r_gold is the front GOLDM log return. Use Newey-West standard errors with lag ≈ HL. Also regress on lagged r_gold (lags 1–2), because stale small-contract prints create spurious lead/lag beta. Report β, its CI, and R². A market-neutral book should show |β| ≈ residual fine-gram ratio (≈ 0.004) with R² ≈ 0. Beta-hedged return: r_p − β̂_{train}·r_gold, with β̂ estimated out-of-sample.
- **Sharpe.** SR_ann = mean/sd × √250, using P&L on gross margin or on notional (state which). Spread books are low-volatility, so a Sharpe on margin capital can look large while absolute ₹ P&L stays tiny. Report both.
- **Probabilistic and deflated Sharpe.** These are Bailey–López de Prado formulas (standard forms; verify against SSRN 2460551). PSR(SR*) = Φ[(ŜR − SR*)√(T−1) / √(1 − γ̂₃ŜR + ((γ̂₄−1)/4)ŜR²)], with ŜR the non-annualized per-period Sharpe, γ₃ skew and γ₄ kurtosis. DSR = PSR with SR* = √V[{ŜR_n}]·[(1−γ_E)Φ⁻¹(1 − 1/N) + γ_E Φ⁻¹(1 − 1/(N·e))], where N is the number of configurations tried and γ_E ≈ 0.5772. Log every configuration tried (z_in, z_out, window, filters, cost model) so N is honest.
- **CSCV (derived from the cited procedure).** Build the T×N matrix of daily net returns for all N configurations. Split it into S (e.g. 16) contiguous blocks, and for every C(S, S/2) split pick the in-sample best. Record its out-of-sample rank ω and logit λ = ln(ω/(1−ω)). PBO = share of λ < 0.
- **Reality Check / SPA.** Benchmark = zero (flat). Use a stationary bootstrap (Politis–Romano) with mean block length ≈ HL to 2×HL and 2,000–10,000 resamples, testing max_n mean(net return_n).
- **Other metrics.** Number of trades (likely small: report it prominently, since a CI on Sharpe from 30 trades is enormous), hit rate, average win/loss in bps, gross vs net P&L per trade, turnover (notional traded / average gross notional), average holding days vs HL, maximum drawdown, and percentage of days with a stale leg. Capacity: P&L per trade versus the median daily volume of the thinnest leg. Cap participation at, say, 5–10% of t+1 volume and recompute.

### Gaps
- No MCX-specific application of DSR, PBO or SPA to gold spread strategies was found.

---

## 6. Demonstrating rigorously that "no edge survives costs"

### Takeaway
Show a null result in layers. Gross edge, if any, comes with CIs. Cost breakeven is set against realistic costs. Sensitivity heatmaps across parameters and cost multipliers should show no robust profitable region. Multiple-testing-adjusted statistics (DSR, PBO, SPA) should fail to reject the null. Placebo or randomized-entry baselines should perform equivalently. The literature precedent is that most apparent futures trading-rule profits vanish once snooping and costs are accounted for.

### Cited Findings
- After a data-snooping correction, the best technical rules were significantly profitable in only 2 of 17 US futures contracts. — [Park & Irwin, AgEcon](https://ageconsearch.umn.edu/record/19039/files/cp05pa01.pdf)
- Profitable simple rules appeared in "young" markets (NASDAQ, Russell 2000) but not "mature" ones (DJIA, S&P 500), so a liquid, mature contract pair is a priori less likely to yield an edge. — [Hsu & Kuan](https://c.mql5.com/forextsd/forum/211/Re-Examining%20the%20Profitability%20of%20Technical%20Analysis%20with%20Whitets%20Reality%20Check%20and%20Hansen9s%20SPA%20Tes.pdf)
- Harvey & Liu's haircut penalizes marginal Sharpe ratios most heavily. — [Harvey & Liu](https://people.duke.edu/~charvey/Research/Published_Papers/P120_Backtesting.PDF)

### Inferences
- **Breakeven cost (derived).** c* = mean gross P&L per round trip in bps. Report the ratio c*/c_actual with a bootstrap CI. "No edge" means the upper CI bound of c* is below c_actual, or that net mean P&L per trade has a CI that includes or lies below 0.
- **Heatmaps.** Plot net Sharpe or net mean P&L per trade over (z_in × z_out) and over (z_in × cost multiplier ∈ {0, 0.5, 1, 1.5, 2}), one panel per product pair. Overlay the DSR-significance mask. A credible null shows profitability only at a cost multiplier near 0 and in isolated cells, not in a contiguous plateau.
- **Gross-edge attribution.** Split gross P&L into (a) stale-print reversion (trades triggered on days a leg had zero or low volume), (b) expiry-gap carry leakage (§2), and (c) residual. If (a) and (b) account for most of the gross edge, the "edge" is measurement artifact.
- **Placebos.** Use randomized entry dates with the same holding-period distribution, shuffled z-signals within the test window, and the same strategy on GOLDM front vs GOLDM next (a pure calendar spread) as a control.
- **Power statement.** Report the minimum detectable Sharpe given T and the trade count, for example via the PSR formula. "We had power to detect SR ≥ x, and none was found." This turns "not significant" into an informative null.
- **Report template.** Gross vs net table per pair. Breakeven cost vs actual cost. Heatmaps. DSR/PBO/SPA p-values. Placebo distribution with the realized strategy marked. Liquidity statistics (percentage of zero-volume days per contract).

### Gaps
- No published Indian-market null-result study on cross-size gold contracts was found to use as a template.

---

## 7. Relevant literature: law of one price, mini vs full-size contracts, Indian gold futures efficiency

### Takeaway
The E-mini vs big S&P literature shows that the smaller electronic contract can lead price discovery once it is liquid. It examines information share, not exploitable daily mispricing. Indian studies establish MCX gold spot/futures cointegration and futures-led price discovery. No study found directly tests GOLDM vs GOLD vs GOLDPETAL/GUINEA/TEN relative mispricing, which is a genuine literature gap.

### Cited Findings
- Kurov & Lasser (2004, JFQA): price discovery appears to originate in the E-mini rather than the regular S&P 500 futures. — [Cambridge/JFQA](https://www.cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/abs/price-dynamics-in-the-regular-and-emini-futures-markets/7DFA66D1DDCE701D5713CA6B92E18DF2); [RePEc](https://ideas.repec.org/a/cup/jfinqa/v39y2004i02p365-384_00.html)
- Ates & Wang (2005, J. Futures Markets): by Hasbrouck information shares, both contracts contribute. The E-mini share has been larger since September 1998. — [RePEc](https://ideas.repec.org/a/wly/jfutmk/v25y2005i7p679-715.html)
- Taylor (2011): the E-mini dominates price discovery only under extreme information asymmetry and when it is liquid. — [RePEc](https://ideas.repec.org/a/taf/apfiec/v21y2011i10p717-734.html)
- D.E. Shaw (2025): S&P exposure via futures was meaningfully more expensive than via cash for much of 2024–25, because a financing spread was up to about 4× its recent average. Implied financing in futures can deviate persistently from benchmark rates, and that is not an arbitrage signal. — [D.E. Shaw Imbalance Sheet](https://deshaw.com/assets/articles/DESCO_Imbalance_Sheet_20250123.pdf)
- Singh & Singh (2018): MCX gold futures lead price discovery with feedback from spot. Spot and futures are cointegrated (Johansen), and the futures' role strengthened after the crisis. — [RePEc](https://ideas.repec.org/a/rej/journl/v21y2018i68p111-120.html)
- An earlier MCX study (2010) found futures performing price discovery for gold. Gold Mini volume fell more than standard gold in Jan–Mar 2010 (−39.5% vs −31.2%). — [PublishingIndia PDF](https://publishingindia.com/storage/PDFBrochures/587.pdf)
- Sridhar & Sathish: gold futures provide price discovery, but spot plays a dominant role in futures. — [IJFM / PublishingIndia](https://www.publishingindia.com/archive/ijfm/price-discovery-in-precious-metals-market-a-study-of-gold)
- A 2011–2020 MCX gold spot–futures causality study exists (ten years of daily data). — [Management Dynamics](https://managementdynamics.researchcommons.org/journal/vol22/iss2/4)
- Gatev et al. (2006, RFS) attribute pairs-trading profits to temporary mispricing of close substitutes. — [Alpha Architect summary](https://alphaarchitect.com/2013/06/pairs-trading-kicks-butt/)
- Koijen et al. (2018): carry predicts returns across asset classes, with an average Sharpe of about 0.8 per asset-class carry strategy. — [Koijen et al.](https://research-api.cbs.dk/ws/files/57294842/lasse_heje_pedersen_et_al_carry_acceptedmanuscript.pdf)

### Inferences
- The E-mini literature implies that the liquid MCX contract (GOLDM, or big GOLD) should lead price discovery, with the small 999 contracts following. Daily cross-contract RV is then mostly lagged or stale adjustment in the small contracts. It is visible on settlement data but likely not capturable after costs, which is consistent with a "no edge" prior.
- The appropriate econometric extension is Hasbrouck information share or Gonzalo–Granger component share computed on matched-expiry normalized prices. With daily data, these mainly describe the market rather than produce a trading signal.

### Gaps
- No academic study was found on MCX GOLDM vs GOLD vs GOLDPETAL/GUINEA/TEN mispricing, law-of-one-price violations, or arbitrage after costs. Searches of RePEc, PublishingIndia and general web returned only spot-futures price-discovery papers.
- Full texts of Kurov & Lasser, and of the Indian papers, were not read; summaries rest on abstracts and listings.
- No study of a cost-of-carry or implied-repo test specifically on MCX gold (vs MIBOR) was found.
