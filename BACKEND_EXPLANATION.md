# AURUM IQ Backend Explanation (For Beginners)

## What is this backend?

The backend is a Python application that analyzes gold futures contracts on the MCX (Multi Commodity Exchange of India). It's like a smart calculator that helps traders understand whether there's a real opportunity to make money by trading different gold contracts against each other.

## How does it work? (Simple explanation)

Imagine you're comparing apples at two different stores. Store A sells apples for ₹100/kg, Store B sells them for ₹105/kg. You might think "Buy at A, sell at B, profit ₹5!" But that's too simple. You need to consider:
- Transportation costs (getting apples from A to B)
- Quality differences (maybe A's apples are smaller)
- Timing (will B still pay ₹105 when you arrive?)

Our backend does this for gold contracts, but it's much more sophisticated:
1. **Normalize**: Convert different gold contracts to the same unit (₹ per gram of pure gold)
2. **Adjust**: Remove differences caused by purity and time-to-expiry
3. **Test**: Check if the remaining gap is big enough to survive all trading costs
4. **Alert**: Only notify traders when a real opportunity exists

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  - Web interface                                             │
│  - Shows charts, tables, alerts                             │
│  - Runs in browser                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP requests
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  - Python application                                        │
│  - Processes data, runs calculations                        │
│  - Exposes REST API endpoints                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Storage                            │
│  - CSV files (raw bhavcopy data)                            │
│  - Pandas DataFrames (in-memory processing)                 │
└─────────────────────────────────────────────────────────────┘
```

## Key Components (File-by-File)

### 1. **main.py** - The Application Entry Point
```python
def create_app() -> FastAPI:
    app = FastAPI(title="AURUM IQ engine", version="1.0.0")
    # ... configuration ...
    return app
```

**What it does**: This creates our web server. Think of it as starting a restaurant - it sets up the space, installs equipment, and gets ready to serve customers.

**Why it matters**: Without this, there's no server to handle requests from the frontend.

---

### 2. **routes.py** - The API Menu
This file defines all the endpoints (URLs) the frontend can call:

| Endpoint | What it returns | Why it's useful |
|----------|----------------|-----------------|
| `/api/data/status` | Data quality score | Checks if data is trustworthy |
| `/api/contracts` | List of all gold contracts | Shows what's available to trade |
| `/api/analytics/relative-value` | Spread analysis between two contracts | The core calculation |
| `/api/analytics/term-structure` | Forward curve data | Shows future pricing expectations |
| `/api/alerts` | Trading signals | Notifications when opportunities arise |
| `/api/backtests` | Historical performance | Tests if the strategy would have worked |

**Example**:
```python
@router.get("/api/contracts")
def contracts(product: str | None = None, sort: str = "expiry"):
    rows = contract_rows(_frame())
    # ... filtering and sorting ...
    return sorted(rows, key=keys[sort])
```

When the frontend calls `/api/contracts?product=GOLDM`, this function:
1. Gets all contract data from memory
2. Filters to only GOLDM contracts
3. Sorts by expiry date
4. Returns the list as JSON

---

### 3. **config.py** - Settings & Parameters
```python
@dataclass(frozen=True)
class Settings:
    default_carry: float = 6.5 / 100.0  # 6.5% annual carry
    brokerage_flat_inr: float = 20.0     # ₹20 per order
    statutory_bps: float = 1.9           # Taxes + fees in basis points
    bid_ask_bps: dict[str, float] = {    # Slippage per contract
        "GOLD": 0.1,
        "GOLDM": 0.15,
        # ...
    }
```

**What it does**: Stores all the configurable parameters. Like a recipe card with all your measurements.

**Why it matters**: These numbers directly affect whether an alert fires or not. Change the brokerage, and suddenly some opportunities become profitable (or unprofitable).

---

### 4. **engine/relative_value.py** - The Core Calculator

This is where the magic happens. Here's the step-by-step logic:

```python
def compute_spread(leg_a, leg_b, data):
    # Step 1: Normalize to ₹/g fine gold
    price_a = settle_a / quote_grams_a / fineness_a
    price_b = settle_b / quote_grams_b / fineness_b
    
    # Step 2: Calculate raw premium
    raw_premium = (price_a - price_b) / price_b * 10000  # in bps
    
    # Step 3: Remove purity difference
    purity_adjustment = -ln(fineness_a / fineness_b) * 10000
    
    # Step 4: Remove carry (time value)
    carry_adjustment = compute_carry(expiry_a, expiry_b)
    
    # Step 5: What's left is the residual
    residual = raw_premium - purity_adjustment - carry_adjustment
    
    # Step 6: Score it
    zscore = (residual - rolling_mean) / rolling_std
    
    # Step 7: Check if it beats costs
    expected_edge = 0.8 * abs(residual) - round_trip_cost
    
    return {
        "residual": residual,
        "zscore": zscore,
        "expected_edge": expected_edge
    }
```

**Why this matters**: This calculation separates "noise" (purity, carry) from "signal" (real mispricing).

---

### 5. **engine/alerts.py** - The Gatekeeper

Not every spread deserves an alert. This file enforces discipline:

```python
def should_alert(spread, config):
    # Gate 1: Is the z-score high enough?
    if abs(spread.zscore) < config.entry_z:
        return False, "z-score too low"
    
    # Gate 2: Does it survive costs?
    if spread.expected_edge_bps <= 0:
        return False, "costs too high"
    
    # Gate 3: Has it persisted?
    if not persisted(spread, days=2):
        return False, "not persistent"
    
    # Gate 4: Are we outside tender window?
    if min(days_to_expiry) < 6:
        return False, "too close to expiry"
    
    return True, "alert!"
```

**Why this matters**: This prevents "alert fatigue" - too many false alarms that make traders ignore real signals.

---

### 6. **engine/backtest.py** - Time Machine

This tests the strategy on historical data:

```python
def run_backtest(params, data):
    pnl_curve = []
    
    for fold in walk_forward_splits(data):
        # Train on historical window
        train_data = fold.train
        test_data = fold.test
        
        # Simulate trading on test window
        for day in test_data:
            # Use only data available up to yesterday
            signal = compute_signal(day, train_data)
            
            if signal:
                enter_trade(day)
            
            if exit_condition(day):
                exit_trade(day)
        
        pnl_curve.append(cumulative_pnl)
    
    return {
        "equity_curve": pnl_curve,
        "trades": trade_log,
        "sharpe": compute_sharpe(pnl_curve),
        "max_drawdown": compute_drawdown(pnl_curve)
    }
```

**Key principle**: Only use data that would have been available at that point in time. No "looking ahead."

---

### 7. **engine/ingest.py** - Data Import

Handles uploading CSV files:

```python
def parse_upload(file_data):
    df = pandas.read_csv(file_data)
    
    # Validate columns
    required = ["Symbol", "Trade Date", "Expiry", "Settle"]
    check_columns(df, required)
    
    # Parse dates
    df["tradeDate"] = parse_date(df["Trade Date"])
    df["expiry"] = parse_date(df["Expiry"])
    
    # Check for anomalies
    if (df["Settle"] <= 0).any():
        raise ValueError("Negative settlement prices")
    
    return df
```

**Why it matters**: Garbage in, garbage out. If the input data is bad, all calculations will be wrong.

---

### 8. **products.py** - Contract Specifications

Every gold contract has different specs:

```python
PRODUCT_SPECS = [
    {
        "id": "GOLD",
        "name": "Gold (1 kg)",
        "tradingUnit": "1 kg",
        "quoteUnit": "10 g",
        "fineness": 0.995,
        "expiryRule": "5th of month"
    },
    {
        "id": "GOLDM",
        "name": "Gold Mini (100 g)",
        "tradingUnit": "100 g",
        "quoteUnit": "10 g",
        "fineness": 0.995,
        "expiryRule": "5th of month"
    },
    {
        "id": "GOLDPETAL",
        "name": "Gold Petal (1 g)",
        "tradingUnit": "1 g",
        "quoteUnit": "1 g",
        "fineness": 0.999,
        "expiryRule": "Month end"
    },
    # ...
]
```

**Why this matters**: You can't compare contracts without knowing these specs. GOLD is quoted per 10g but contains 1kg, while GOLDPETAL is 1g per 1g.

---

## Data Flow Example

Let's trace a real request:

**1. User clicks "GOLDPETAL vs GOLDM spread" on the frontend**

```
Frontend → GET /api/analytics/relative-value?legA=GOLDM&legB=GOLDPETAL&range=6M
```

**2. Backend receives the request**

```python
# routes.py
@router.get("/api/analytics/relative-value")
def relative_value(legA: str, legB: str, range: str):
    series = _spread_series(legA, legB, range)
    return series
```

**3. Backend calculates the spread**

```python
# engine/relative_value.py
def get_spread_series(frame, leg_a, leg_b, window):
    # Get price history for both contracts
    prices_a = filter_by_product(frame, leg_a)
    prices_b = filter_by_product(frame, leg_b)
    
    # Match by expiry
    matched = match_expiries(prices_a, prices_b)
    
    # Normalize to ₹/g fine gold
    normalized_a = normalize(matched.a)
    normalized_b = normalize(matched.b)
    
    # Compute residual for each day
    for day in history:
        residual = compute_residual(day, normalized_a, normalized_b)
        zscore = compute_zscore(residual, history_up_to_yesterday)
    
    return {
        "points": [...],
        "summary": {
            "residualBps": current_residual,
            "zscore": current_z,
            "expectedEdgeBps": edge_after_costs
        }
    }
```

**4. Backend returns JSON to frontend**

```json
{
  "pairLabel": "GOLDPETAL vs GOLDM",
  "points": [
    {"date": "2026-04-19", "residualBps": 8.5, "zscore": 1.2},
    {"date": "2026-04-20", "residualBps": 11.2, "zscore": 1.8},
    ...
  ],
  "summary": {
    "residualBps": 12.5,
    "zscore": 2.4,
    "roundTripCostBps": 6.2,
    "expectedEdgeBps": 3.8
  }
}
```

**5. Frontend displays the chart**

The frontend receives the data and renders:
- A line chart showing residual over time
- A z-score gauge
- Key metrics in cards

---

## Key Concepts Explained

### Normalization

**Problem**: GOLD is quoted in ₹ per 10g for a 1kg contract. GOLDPETAL is quoted in ₹ per 1g for a 1g contract. How do you compare them?

**Solution**: Convert everything to "₹ per gram of pure gold":

```
GOLD: ₹75,000 per 10g, purity 995
→ ₹75,000 ÷ 10 ÷ 0.995 = ₹7,537.69 per gram fine gold

GOLDPETAL: ₹7,550 per 1g, purity 999
→ ₹7,550 ÷ 1 ÷ 0.999 = ₹7,557.56 per gram fine gold
```

Now we can compare: GOLDPETAL is trading ₹19.87/g rich to GOLD.

### Purity Adjustment

**Problem**: 999 gold should trade higher than 995 gold, because it's purer. But by how much?

**Solution**: Calculate the fixed difference:

```
Purity difference = -ln(0.999/0.995) × 10000 = 40.2 basis points
```

This is a permanent structural difference, not a trading opportunity.

### Carry Adjustment

**Problem**: A contract expiring in 3 months should trade higher than one expiring tomorrow, because you can earn interest on the money you don't spend yet.

**Solution**: Calculate the time value:

```
Carry = spot × interest_rate × days_to_expiry ÷ 365
```

If the front month expires in 5 days and the back month in 35 days:
```
Carry difference = spot × 6.5% × (35 - 5) ÷ 365
```

This removes the time value, leaving only the mispricing.

### Z-Score

**Problem**: Is 12.5 bps a big gap or a small gap?

**Solution**: Compare to history:

```
z = (current - historical_mean) / historical_std_dev
```

If z = 2.4, that means this gap is 2.4 standard deviations above average - it's in the top 1% of historical observations.

### Cost Gating

**Problem**: Even if there's a mispricing, can you actually profit from it?

**Solution**: Model the full round-trip cost:

```
Cost = Brokerage + CTT + Stamp Duty + Exchange Fee + SEBI Fee + GST + Slippage
     = ₹20 + 0.01% + 0.002% + ... + 18% GST + bid-ask spread
     ≈ 6.2 bps for GOLDM vs GOLDPETAL
```

Expected edge = 0.8 × residual - cost

If residual = 12.5 bps and cost = 6.2 bps:
```
Expected edge = 0.8 × 12.5 - 6.2 = 3.8 bps (profitable!)
```

---

## Why This Matters

### For Traders
- **Avoid false signals**: The gating logic prevents chasing noise
- **Understand the math**: Every step is transparent and auditable
- **Know your costs**: The cost model is realistic, not theoretical

### For Developers
- **Clean architecture**: Separation of concerns (routes, engine, data)
- **Type safety**: TypeScript frontend, Pydantic models in backend
- **Testable**: Each component can be unit tested independently

### For Researchers
- **No lookahead bias**: Backtest only uses data available at decision time
- **Walk-forward validation**: Out-of-sample testing prevents overfitting
- **Research integrity metrics**: DSR and PBO available for audit

---

## Running the Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python run.py

# Or with uvicorn directly
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API documentation (interactive): `http://localhost:8000/docs`

---

## Next Steps

1. **Explore the API**: Open `/docs` and try the endpoints
2. **Read the code**: Start with `routes.py`, then dive into `engine/`
3. **Modify parameters**: Change settings in `config.py` and see the impact
4. **Upload data**: Try uploading a bhavcopy CSV through the frontend
5. **Run a backtest**: Test different parameter combinations

---

## Common Questions

**Q: Why FastAPI instead of Flask?**
A: FastAPI provides automatic API documentation, type validation, and async support out of the box. It's faster and more maintainable for this use case.

**Q: Why store data in memory instead of a database?**
A: For a demo/prototype with ~10,000 rows, in-memory Pandas is faster and simpler. A production system would use DuckDB or PostgreSQL.

**Q: How accurate are the cost estimates?**
A: They're modeled based on typical MCX fee structures. Real costs depend on your broker, volume tier, and exact execution prices. The model is conservative (slightly overestimates costs).

**Q: Can this be used for actual trading?**
A: This is a research prototype. For live trading, you'd need:
- Real-time data feeds (not just end-of-day bhavcopy)
- Order management system integration
- Risk management layer
- Compliance and audit logging
- Much more rigorous testing

**Q: Why are there 5 different gold contracts?**
A: Different traders have different needs:
- **GOLD (1kg)**: Large institutional traders
- **GOLDM (100g)**: Smaller lots, more accessible
- **GOLDTEN (10g)**: Retail traders
- **GOLDGUINEA (8g)**: Cultural preference (8g = 1 guinea)
- **GOLDPETAL (1g)**: Micro-lots for small traders

Each has different liquidity, expiry rules, and purity standards.

---

## Contact

For questions or contributions:
- Team: TimelessXO
- Track: Commodity Derivatives Intelligence, Hack in Hills
- Members: Pari Singla (AI/ML), Himanshu Solanki (Backend), Prerak Jain (Frontend)
