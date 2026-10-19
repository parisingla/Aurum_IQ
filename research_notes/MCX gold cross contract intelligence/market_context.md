# Indian Gold Market Structure and Why MCX Gold Contracts Trade at Different Normalized Prices (as of Oct 2026)

Researcher notes. Budget limited to about 17 tool calls, so several items are gaps; check MCX circulars and contract specs at mcxindia.com before relying on spec details.

## 1. Who trades each contract, why small contracts exist, liquidity, and mini vs big premium evidence

### Takeaway
GOLD (1 kg) and GOLDM (100 g) are 995-purity contracts used by bullion dealers, jewellers/hedgers, prop desks and HNIs. GOLDTEN (10 g), GOLDGUINEA (8 g) and GOLDPETAL (1 g) are 999-purity, retail-sized contracts with month-end, staggered-delivery expiries. Recent data puts GOLDPETAL near the top of MCX by contract count, but in notional terms it is tiny. Normalized price gaps between the groups come from purity (995 vs 999), different expiry dates (carry), different delivery mechanics, and thinner books. Arbitrage is not frictionless. I found only anecdotal evidence of persistent mini vs big gaps, not systematic studies.

### Cited Findings
- MCX announced GOLDTEN (10 g) in a circular dated 18 March 2025, with April, May and June 2025 expiries first. Price is quoted ex-Ahmedabad including import duty and levies, excluding GST. Tick size is Rs 1 per 10 g, max order size 10 kg, minimum initial margin 6% or SPAN, daily price limit 3%, expandable to 6% and 9%. — [5paisa](https://www.5paisa.com/index.php/news/mcx-to-introduce-gold-ten-futures-contracts-starting-april-1); [HDFC Sky](https://hdfcsky.com/blogs/share-market/gold-ten-10g-futures-set-to-launch-on-mcx-from-1st-april-2025)
- Launch date conflict: most sources say trading began 1 April 2025, but Zerodha said 2 April 2025, "subject to regulatory and operational readiness." — [Zerodha bulletin](https://zerodha.com/marketintel/bulletin/408469/mcx-is-launching-gold-ten-10-gram-futures-contracts); [Angel One](https://www.angelone.in/news/commodities/gold-ten-futures-to-begin-trading-on-mcx-from-april-1)
- MCX positioned GOLDTEN as "a more accessible and cost-effective avenue" for investors and traders hedging in bullion, sitting beside Gold (1 kg), Gold Mini (100 g), Gold Guinea (8 g) and Gold Petal (1 g). — [5paisa](https://www.5paisa.com/index.php/news/mcx-to-introduce-gold-ten-futures-contracts-starting-april-1); [Outlook Money](https://www.outlookmoney.com/invest/gold-10-contracts-know-all-about-new-trading-unit-launched-by-mcx)
- Quotation and purity: GOLD and GOLDM are 995 and quoted per 10 g. GOLDGUINEA is quoted per 8 g, GOLDPETAL per 1 g, and GOLDTEN, GUINEA and PETAL are 999. — [ICICI Direct](https://www.icicidirect.com/ilearn/commodity/articles/how-to-trade-gold-in-commodity-derivatives-market-in-india-1); [Flattrade](https://flattrade.in/learn/glossary/gold-trading/)
- Expiry differs by group. GOLD and GOLDM expire on the 5th of the expiry month. The small variants expire on the last calendar day of the month. — [ICICI Direct](https://www.icicidirect.com/ilearn/commodity/articles/how-to-trade-gold-in-commodity-derivatives-market-in-india-1)
- GOLDGUINEA and GOLDPETAL use staggered delivery. Example: May 2024 contracts expired 31 May 2024, and Zerodha told clients to square off by 7 PM on 24 May or face forced square-off. — [Zerodha bulletin](https://zerodha.com/marketintel/bulletin/378912/mcx-precious-metals-expiry-may-2024)
- On 2 April 2026, GOLDPETAL showed about 254,776 contracts in one entry and about 115,996 in another on IIFL's MCX top-volume table. At 1 g per lot that is roughly 255 kg notional, against about 15,000 lots/day (15 t) historically for big GOLD. — [IIFL](https://www.indiainfoline.com/commodity/MCX/top-traded-volume); [5paisa Finschool](https://www.5paisa.com/finschool/course/currency-commodity-government-securities-course/gold-part-1/)
- Sources disagree on GOLDPETAL spreads. A 5paisa broker explainer says most Indian retail traders trade it and spreads are narrow. Flattrade says Petal liquidity can be lower than Gold and Gold Mini, with possibly wider bid-ask spreads, and calls Guinea "less commonly used." — [5paisa](https://www.5paisa.com/hindi/commodity-trading/mcx-goldpetal-price); [Flattrade](https://flattrade.in/learn/glossary/gold-trading/)
- Anecdotal GOLDM vs GOLD arbitrage (10 GOLDM lots vs 1 GOLD lot): a poster on Zerodha's forum reports a gap of about 150 points persisting into expiry. This is an unverified user post. — [TradingQnA](https://tradingqna.com/t/arbitrage-between-gold-and-gold-mini-contract/26923)
- Background (2013): far-month gold usually trades above near-month on carry, and duty expectations widen calendar spreads. MCX's calendar-spread facility executed as two separate legs. — [Business Standard 2013](https://www.business-standard.com/amp/article/markets/bullion-punters-seeking-to-maximise-profit-from-trading-113011900435_1.html)
- Background (2018): gold's share of MCX turnover fell to a 12-year low of 10.4%. — [Business Standard 2018](https://www.business-standard.com/amp/article/markets/gold-loses-sparkle-on-mcx-as-share-in-volume-hits-12-year-low-of-10-4-118032300866_1.html)

### Inferences
- GOLD vs GOLDM (both 995, same 5th-of-month expiry) should be the tightest pair. Any normalized gap there is mostly microstructure: tick size, book depth, and the retail/HNI mix in GOLDM.
- The 999 contracts (TEN/GUINEA/PETAL) need a purity scaling of 999/995 ≈ 1.00402 (+0.40%) before comparison. Beyond that, the month-end expiry (vs the 5th) adds about 25 days of carry. At around 6–7% INR rates that is roughly 0.4–0.5% of price, so it is material when comparing like-named months.
- Staggered delivery and early broker square-off windows mean the small contracts' final week is driven by forced retail exits, a plausible source of last-week dislocation.
- Mini contracts tend to show discretionary retail flow, while 1 kg is the hedger and bullion-desk instrument. The 1 kg price is the likelier "anchor" in price discovery. This is not verified with lead-lag data.

### Gaps
- No official MCX volume/OI time series by contract (2023–2026) was retrieved. MCX bhavcopy or annual reports are needed.
- No published academic or broker study quantifying persistent normalized premiums between GOLDPETAL/GUINEA/TEN and GOLD/GOLDM.
- Exact GOLDTEN expiry rule and delivery centre not confirmed from the MCX spec sheet.
- Launch years for PETAL and GUINEA not retrieved here. From memory, about 2011 and 2007/08, unverified.

## 2. Purity premium: 999 vs 995 (IBJA) and how it shows in futures

### Takeaway
IBJA polls 995 first and derives 999 from it. On 18 Sep 2026 the published gap (Rs 615 per 10 g on Rs 1.53 lakh) equals the pure fineness ratio 999/995. The benchmark carries no extra "purity premium" beyond metal content. Any 999-over-995 premium in futures beyond about 0.40% is a market or friction effect, not a benchmark one.

### Cited Findings
- IBJA, 18 Sep 2026 AM fixing: Gold 999 Rs 1,53,658 and Gold 995 Rs 1,53,043 per 10 g, a gap of Rs 615 (about 0.40%). Previous PM: Rs 1,51,849 vs Rs 1,51,241, a gap of Rs 608. Rates exclude GST and making charges. — [5paisa](https://www.5paisa.com/blog/gold-rate-today-18-sep-26)
- IBJA methodology: physical market participants are polled twice daily, 11:30–12:00 and 16:30–17:00. "After arriving at 995 purity rates, the price for 999 purity is worked out", and other purities derive from 999. — [IBJA spot polling mechanism PDF](https://ibjarates.com/pdf/spot-polling-mechanism/spot-polling-mechanism.pdf) (as quoted in search; the PDF text could not be extracted in fetch)
- IBJA rates are also used as the benchmark for gold-loan valuation under RBI's 30-day-average standard. — [IIFL](https://www.iifl.com/gu/blogs/gold-loans/ibja-gold-rate-for-loan-valuation-new-rbi-standard)

### Inferences
- Check: 1,53,043 × 999/995 = 1,53,658, which matches exactly. IBJA 999 is therefore a mechanical fineness scale-up of 995.
- To normalize futures: GOLD/GOLDM (995, per 10 g) × 1.00402 gives a 999 equivalent per 10 g. GOLDGUINEA ÷ 8 × 10 and GOLDPETAL × 10 give per 10 g.
- In the physical market, small 999 bars/coins carry fabrication and minting premia that 1 kg 995 bars do not. Deliverable 999 small-denomination units cost more to produce per gram, which could support a 999 futures premium above the pure ratio. Not quantified from a source.

### Gaps
- No source found on the physical-market premium for 999 small bars over 995 1 kg bars (refiner fabrication charges).
- Whether MCX settles GOLD/GOLDM against 995 and PETAL/GUINEA/TEN against 999 IBJA/MCX polled spot was not confirmed from a primary circular.

## 3. Delivery economics: centres, vaulting, GST, import duty and domestic premium/discount

### Takeaway
Import duty is the dominant structural driver of the MCX level versus international parity. It went 15% → 6% (July 2024) → about 5% (Feb 2026 Budget, sources conflict) → 15% (13 May 2026). The May 2026 hike created a record dealer discount of up to $207/oz, which shrank to about $19/oz by July 2026. GST of 3% applies on delivery and is excluded from MCX quotes. Duty is a level shift common to all five contracts, but its effect differs: the 1 kg contract is the importer/bullion-desk instrument and reprices fastest.

### Cited Findings
- July 2024 Budget cut duty to 6% (5% BCD + 1% AIDC) from 15%, effective 24 July 2024. — [Motilal Oswal](https://www.motilaloswal.com/news/commodities/12458); [A2Z Taxcorp](https://a2ztaxcorp.net/budget-2026-27-keeps-customs-duty-unchanged-for-gold-and-silver-bullions/)
- Duty history: raised to 10% in stages in 2013; 12.5% in 2019; 2021 BCD 7.5% plus 2.5% AIDC; about 15% from July 2022; 6% in July 2024; reduced to 5% in the Feb 2026 Budget (market reports cited a fall of about Rs 3,500–4,200 per 10 g in a day); 15% (10% BCD + 5% AIDC) via 13 May 2026 notifications. — [IIFL](https://www.iifl.com/blogs/gold-loan/how-union-budget-customs-duty-announcements-move-gold-prices-in-india)
- Feb 2026 Budget conflict: Motilal Oswal and A2Z say bullion duty was unchanged at 6%. Global Trade Alert says a 1 Feb 2026 notification withdrew a concessional 5% duty on gold and silver doré. The IIFL "5%" claim may be a misreading of the doré change; treat it as unverified. — [Motilal Oswal](https://www.motilaloswal.com/news/commodities/12458); [A2Z](https://a2ztaxcorp.net/budget-2026-27-keeps-customs-duty-unchanged-for-gold-and-silver-bullions/); [Global Trade Alert](https://globaltradealert.org/intervention/152436-india-customs-duty-amendments); vs [IIFL](https://www.iifl.com/blogs/gold-loan/how-union-budget-customs-duty-announcements-move-gold-prices-in-india)
- 13 May 2026 (Reuters): India raised gold and silver import tariffs to 15% from 6% to curb imports and protect FX reserves. Domestic gold futures jumped 7.2% that day to Rs 164,497 per 10 g. Dealer discounts hit a record of up to $207/oz over official prices (including 15% duty and 3% GST), from $17 the day before. Grey-market margins widened to about 18% from about 9%, raising smuggling risk. ETF profit-taking added supply. — [Reuters via Kitco](https://www.kitco.com/news/off-the-wire/2026-05-13/gold-discounts-india-breach-200ounce-record-amid-profit-taking)
- July 2026 (Reuters): discounts eased to up to $19/oz. Volatility hurt demand, and old-jewellery exchange dominated, so jewellers had little need to restock from banks. — [Reuters via Kitco](https://www.kitco.com/news/off-the-wire/2026-07-10/asia-gold-gold-discounts-india-deepen-volatility-hurts-demand)
- March 2025: discounts reached about $39/oz, an 8-month high, as record prices dampened demand. — [Business Standard](https://www.business-standard.com/markets/commodities/gold-discounts-in-india-hit-8-month-high-as-record-prices-dampen-demand-125031400267_1.html)
- Budget 2026 baggage rules kept 40 g (female) / 20 g (male) duty-free jewellery allowances and removed the value cap. — [Gulf News](https://gulfnews.com/uae/people/big-win-for-indian-expats-in-uae-india-budget-2026-eases-customs-rule-for-gold-jewellery-1.500428785)
- MCX gold quotes include import duty and levies but exclude GST. GST at 3% is charged on delivery or retail sale. — [5paisa](https://www.5paisa.com/index.php/news/mcx-to-introduce-gold-ten-futures-contracts-starting-april-1); [IIFL](https://www.iifl.com/blogs/gold-loan/how-union-budget-customs-duty-announcements-move-gold-prices-in-india)
- GOLDTEN is priced ex-Ahmedabad. Open positions after the tender period require giving or taking delivery at an exchange-approved vault. — [5paisa](https://www.5paisa.com/index.php/news/mcx-to-introduce-gold-ten-futures-contracts-starting-april-1); [Aditya Birla Capital / search summary](https://www.adityabirlacapital.com/abc-of-money/mcx-gold-trading-explained)

### Inferences
- A duty change is a step change in parity: 6% → 15% is about +8.5% on landed cost. The domestic market then lags, which shows as dealer discounts (May 2026). During such shocks, contracts with different holder bases (hedgers in 1 kg, retail in PETAL) may reprice at different speeds, opening temporary normalized gaps.
- Delivery cost per gram (vaulting, assaying, transport, GST working capital) is roughly fixed per delivery event. Small contracts therefore carry higher per-gram delivery friction, which discourages delivery-based arbitrage of small vs big contracts.
- GST of 3% on delivery is a cash outflow, creditable only for GST-registered jewellers. Retail longs cannot reclaim it, which makes delivery-based convergence trades unattractive to retail.

### Gaps
- MCX delivery centre lists per contract (Ahmedabad is the base for GOLD/GOLDM/TEN; additional centres such as Mumbai, Delhi, Chennai, Kolkata, Bengaluru, Hyderabad were not confirmed) and vault/delivery charges (Sequel, Brinks) were not retrieved.
- The CBIC tariff value (the fortnightly notified base for duty, not spot) was not retrieved.
- RBI or WGC statements on 2025–26 import volumes were not retrieved.

## 4. Reference prices and theoretical fair value (external benchmark)

### Takeaway
External benchmark per 10 g of 995: COMEX or LBMA $/oz × USDINR × (10/31.1035) × 0.995 × (1 + duty) + carry to expiry. Scale by 999/995 for the 999 contracts. Expect a residual of tens to hundreds of dollars per oz (dealer premium or discount), driven by demand, seasonality and duty shocks.

### Cited Findings
- Common method: COMEX $/oz × USDINR × (100/311) per 10 g, plus duty, compared with live MCX. One TradingView script ("Silvara MCX-COMEX") defaults to 15% duty as an editable input. — [TradingView script](https://it.tradingview.com/script/3Xm0bBc8-Silvara-Mcx-Comex/)
- Practitioner build-up: CIF and logistics in $, convert to per kg, adjust for 995 purity, × FX, + duty + cess + bank charges. The residual between MCX and this value reflects local supply and demand. — [TradingQnA](https://tradingqna.com/t/how-to-calculate-gold-silver-international-prices-and-mcx-price-parity-and-disparity/2457/2)
- The premium shifts "dramatically overnight" on duty changes and moves with the rupee and festival or wedding demand. MCX can trade near or below international parity when demand is soft. — [metalcharts.org](https://metalcharts.org/india/xau) (secondary, quality uncertain)
- IBJA polls physical participants twice daily. MCX's own spot (used for settlement) is a separate polled price. — [IBJA](https://ibjarates.com/pdf/spot-polling-mechanism/spot-polling-mechanism.pdf)

### Inferences
- Concrete formula (per 10 g, contract purity p = 0.995 or 0.999):
  FV = S_usd/oz × USDINR × (10 / 31.1035) × p × (1 + d) × (1 + r × T/365) + bank/logistics premium.
  Here d is the effective duty (BCD + AIDC, 15% since 13 May 2026), r is the INR funding rate, and T is days to the contract's expiry. Duty is legally assessed on the CBIC tariff value, not live spot, so there is a small basis.
- For cross-contract work the external FV matters less than internal relative value. Since duty, FX and spot are common to all five contracts, normalized gaps should be explained mainly by purity (+0.40%), expiry mismatch (carry) and liquidity.
- Use the matching COMEX month and the USDINR futures expiry to avoid mixing carries.

### Gaps
- No authoritative published MCX "fair value" methodology.
- LBMA vs COMEX choice and the bank premium components (freight, insurance, bank margin of about $1–3/oz) were not sourced.

## 5. Key events 2024–2026

### Takeaway
2024–26 brought duty whipsaws (6% July 2024, 15% May 2026), a parabolic rally to a January 2026 peak (MCX above Rs 1.8–2.0 lakh/10 g, sources conflict) followed by a 12% one-day crash, repeated MCX margin hikes, and new products (GOLDTEN in April 2025, BULLDEX options in October 2025). Each of these can temporarily dislocate contracts with different participant mixes.

### Cited Findings
- February 2025: MCX April gold reached an all-time high of Rs 85,469 per 10 g. — [Angel One / search summary](https://www.angelone.in/news/commodities/gold-price-hits-all-time-high-check-gold-and-silver-prices-in-your-city)
- 9 Sep 2025: December gold hit Rs 1,10,400 per 10 g. 22 Sep 2025: record Rs 1,11,166. — [AIR News](https://www.newsonair.gov.in/gold-prices-up-by-06-silver-prices-by-0-1); [Motilal Oswal](https://www.motilaloswal.com/news/commodities/11604)
- 16 Oct 2025: December gold hit a record Rs 1,28,395 per 10 g, and February 2026 gold hit Rs 1,29,380. — [HDFC Sky](https://hdfcsky.com/news/gold-hits-record-rs-128395-per-10g-on-mcx)
- October 2025: MCXCCL raised gold margins by 1 percentage point (silver by 1.5) on global volatility. — [Business Standard](https://www.business-standard.com/amp/markets/commodities/mcx-raises-margins-on-gold-and-silver-amid-global-price-volatility-125101400935_1.html)
- Late January 2026 peak: one report says MCX gold hit an all-time high of Rs 1,80,501 on 29 January. Univest gives about Rs 2,04,375, and Swastika says it breached Rs 2 lakh. International peak figures also conflict: $5,602/oz on 28 January (Univest) vs $5,220 (Motilal Oswal). On 30 January gold fell about Rs 20,000 (12%) to about Rs 1.49 lakh. By 24 June 2026 MCX was around Rs 1.44–1.46 lakh. — [Univest](https://univest.in/blogs/gold-price-today-mcx-crash-june-24-2026); [Swastika](https://www.swastika.co.in/blog/mcx-gold-price-trends-and-silver-moves-a-retail-investors-guide); [Motilal Oswal](https://www.motilaloswal.com/news/commodities/12392); [Dainik Jagran](https://english.dainikjagranmpcg.com/business/-gold-and-silver-prices-plunge-sharp-drop-hits-mcx/article-13441)
- February 2026 margins: MCXCCL added 1% on gold from 5 February and another 2% from 6 February (3% total), withdrawn on 19 February 2026. NSE Clearing mirrored the move. ICICI Securities said average gold futures margin rose from about 10% to about 30% in February. — [Business Today](https://www.businesstoday.in/amp/markets/story/gold-silver-mcx-nse-withdraw-additional-margins-on-gold-silver-futures-after-sharp-price-correction-516843-2026-02-18); [Business Today](https://www.businesstoday.in/amp/markets/stocks/story/mcx-shares-additional-margin-on-gold-silver-futures-withdrawn-what-icici-sec-says-516865-2026-02-19)
- 13 May 2026: duty raised to 15%, MCX gold up 7.2% in a day, record discounts. — [Reuters via Kitco](https://www.kitco.com/news/off-the-wire/2026-05-13/gold-discounts-india-breach-200ounce-record-amid-profit-taking)
- Regulatory items: MCX launched BULLDEX options on 27 Oct 2025. A SEBI panel was to propose easing commodity-derivative curbs (Business Standard, December 2025). SEBI floated a consultation (around May 2026) to raise client exposure limits in commodity derivatives (Sahi; unverified against SEBI primary). The SEBI chair said RBI and IRDAI are not inclined to let banks or insurers trade commodity derivatives. FPIs got direct access in 2023. — [Search summary incl. Sahi](https://sahi.com/news/sebi-proposes-2x-increase-in-client-exposure-limits-to-boost-mcx-derivative-liquidity-3496-PE1_COR); [Business Standard topic page](https://www.business-standard.com/topic/commodity-derivatives); [Arihant/Muthoot](https://www.muthootsecurities.com/News/Detailed-News/MCX-slips-as-SEBI-chiefs-remarks-weigh/1689381)

### Inferences
- Margin hikes in percentage terms are the same across contracts. But retail-heavy mini contracts (PETAL/GUINEA/TEN) see more forced deleveraging, so margin-hike days and crash days (30 Jan 2026) are candidate windows for normalized gaps to blow out.
- Duty shock days (24 July 2024, 13 May 2026) are natural event-study points for cross-contract lag analysis.

### Gaps
- No MCX outage specific to 2024–26 was found in this search pass. A known earlier incident is the 2023 transition to the new CDP/TCS platform, not verified here.
- The 2026 peak level needs a primary MCX bhavcopy to settle the conflict.
- No primary SEBI circular retrieved for 2025–26 commodity rule changes.

## 6. Existing tools and what Indian arbitrage traders do

### Takeaway
Existing public tooling covers MCX vs COMEX parity (TradingView scripts, metalcharts, broker spread screens) and the classic GOLD vs 10×GOLDM pair trade. I found no dedicated product that normalizes all five MCX gold contracts (purity, unit, expiry carry) into a live cross-contract spread monitor. That looks like an open niche, though the absence is not proven.

### Cited Findings
- TradingView open-source "Silvara MCX-COMEX" indicator: converts COMEX to INR per 10 g plus duty and shows the MCX premium or discount. — [TradingView](https://it.tradingview.com/script/3Xm0bBc8-Silvara-Mcx-Comex/)
- metalcharts.org and goldsilver.ai publish India gold price vs international comparisons. — [metalcharts](https://metalcharts.org/india/xau); [goldsilver.ai](https://goldsilver.ai/metal-prices/india-gold-price)
- Retail practitioners discuss GOLD vs GOLDM arbitrage (1 GOLD vs 10 GOLDM) and parity calculations on Zerodha's TradingQnA. Users report the gap does not always converge by expiry. — [TradingQnA arbitrage](https://tradingqna.com/t/arbitrage-between-gold-and-gold-mini-contract/26923); [TradingQnA parity](https://tradingqna.com/t/calculating-the-impact-of-international-prices-on-gold-silver-trading-on-mcx/316)
- Calendar spreads are a known strategy, driven by carry and duty expectations. — [Business Standard 2013](https://www.business-standard.com/amp/article/markets/bullion-punters-seeking-to-maximise-profit-from-trading-113011900435_1.html)

### Inferences
- Common Indian arbitrage desk trades (general practice, not sourced here): cash-futures (buy physical or IBJA-linked bars, sell MCX, deliver), MCX vs COMEX/DGCX with USDINR hedge, calendar spreads, gold ETF vs MCX, and GOLD vs GOLDM ratio trades.
- Barriers to closing small vs big gaps: different expiry dates, staggered delivery, purity mismatch (995 vs 999 is not fungible for delivery), GST on delivery, and lot-ratio rounding (1 GOLD = 10 GOLDM = 100 GOLDTEN = 125 GUINEA = 1,000 PETAL). Order-size caps and exchange transaction charges and stamp duty across many small lots raise costs further.

### Gaps
- No broker product (Zerodha, Sensibull-like, Dhan, Upstox) offering a multi-contract MCX gold normalized-spread screen was found. Absence of evidence only; a dedicated search of broker feature pages would be needed.
- No information found on institutional arbitrage desk behaviour (prop firms, bullion banks) or algo share in MCX gold.
