"""Point-in-time contract specifications for the five MCX gold futures.

Mirrors the frontend table in `src/lib/products.ts`. Entries marked with a
caveat are contested in public sources (see reports/MCX gold cross contract
intelligence.md) and are surfaced to the user rather than quietly resolved.
"""

from __future__ import annotations

from typing import Any

PRODUCT_SPECS: list[dict[str, Any]] = [
    {
        "id": "GOLD",
        "name": "Gold",
        "unitGrams": 1000.0,
        "quoteGrams": 10.0,
        "fineness": 0.995,
        "purity": 995,
        "tickInr": 1.0,
        "tickValueInr": 100.0,
        "expiryBand": "fifth",
        "expiryRule": "5th of the contract month (preceding working day if a holiday)",
        "listing": "Bimonthly — Feb / Apr / Jun / Aug / Oct / Dec",
        "liquidity": "high",
        "delivery": "Ahmedabad (base), Mumbai and New Delhi as additional centres",
        "listedSince": "Long-standing",
        "blurb": (
            "The 1 kg reference contract. Bullion desks, importers and hedgers trade "
            "here; it is the natural curve anchor."
        ),
    },
    {
        "id": "GOLDM",
        "name": "Gold Mini",
        "unitGrams": 100.0,
        "quoteGrams": 10.0,
        "fineness": 0.995,
        "purity": 995,
        "tickInr": 1.0,
        "tickValueInr": 10.0,
        "expiryBand": "fifth",
        "expiryRule": "5th of the contract month (preceding working day if a holiday)",
        "listing": "Monthly",
        "liquidity": "high",
        "delivery": "Ahmedabad (base), Mumbai and New Delhi as additional centres",
        "listedSince": "Long-standing",
        "blurb": (
            "100 g, quoted per 10 g at 995 purity. The most liquid gold contract and "
            "the reference leg for most pairs here."
        ),
    },
    {
        "id": "GOLDTEN",
        "name": "Gold Ten",
        "unitGrams": 10.0,
        "quoteGrams": 10.0,
        "fineness": 0.999,
        "purity": 999,
        "tickInr": 1.0,
        "tickValueInr": 1.0,
        "expiryBand": "monthEnd",
        "expiryRule": "Last calendar day (preceding working day if a holiday)",
        "listing": "Monthly — 6 listed since 22 Sep 2025",
        "liquidity": "medium",
        "delivery": "Ahmedabad (base), New Delhi and Mumbai",
        "listedSince": "1 Apr 2025",
        "caveat": (
            "History starts 1 Apr 2025, so any pair involving GOLDTEN has a hard "
            "ceiling on observations. One 2025 expiry landed on a business day, not "
            "the calendar month end."
        ),
        "blurb": (
            "10 g, 999 purity, quoted per 10 g. Newest of the five — shared history "
            "with older contracts is limited."
        ),
    },
    {
        "id": "GOLDGUINEA",
        "name": "Gold Guinea",
        "unitGrams": 8.0,
        "quoteGrams": 8.0,
        "fineness": 0.999,
        "purity": 999,
        "tickInr": 1.0,
        "tickValueInr": 0.8,
        "expiryBand": "monthEnd",
        "expiryRule": "Last calendar day (preceding working day if a holiday)",
        "listing": "Monthly — 6 listed since 22 Sep 2025",
        "liquidity": "low",
        "delivery": "Ahmedabad",
        "listedSince": "Long-standing",
        "caveat": (
            "Contested in the sources: ICICI quotes it per 1 g, older MCX delivery "
            "records describe 995 coins, and the 999 DDR text may belong to NSE's "
            "mirror contract. This build uses ₹/8 g and 999 as a config value."
        ),
        "blurb": (
            "8 g, quoted per 8 g. Thinnest book of the five — its settlements go "
            "stale often, which is exactly what the trust score watches."
        ),
    },
    {
        "id": "GOLDPETAL",
        "name": "Gold Petal",
        "unitGrams": 1.0,
        "quoteGrams": 1.0,
        "fineness": 0.999,
        "purity": 999,
        "tickInr": 1.0,
        "tickValueInr": 0.1,
        "expiryBand": "monthEnd",
        "expiryRule": "Last calendar day (preceding working day if a holiday)",
        "listing": "Monthly — 6 listed since 22 Sep 2025",
        "liquidity": "medium",
        "delivery": "Mumbai, with Ahmedabad and New Delhi as additional centres",
        "listedSince": "Long-standing",
        "caveat": (
            "High lot counts disguise tiny notional: one lot is 1 g. Fixed per-order "
            "costs dominate, which is why most petal signals die at the cost hurdle."
        ),
        "blurb": (
            "1 g retail contract. Lots pile up in the volume tables while the "
            "notional stays small — a classic trap for raw price-gap screens."
        ),
    },
]

PRODUCT_IDS: list[str] = [spec["id"] for spec in PRODUCT_SPECS]
PRODUCT_BY_ID: dict[str, dict[str, Any]] = {spec["id"]: spec for spec in PRODUCT_SPECS}


def spec(product_id: str) -> dict[str, Any]:
    """Look up a verified spec table row; raises for unknown symbols."""
    found = PRODUCT_BY_ID.get(product_id)
    if found is None:
        raise KeyError(f"Unknown product: {product_id}")
    return found


def product_name(product_id: str) -> str:
    return str(PRODUCT_BY_ID.get(product_id, {}).get("name", product_id))


def tick_round(value: float, tick: float) -> float:
    """Round a computed price to the contract's own tick."""
    return round(value / tick) * tick


def normalise_fine_gold(settle: float, quote_grams: float, fineness: float) -> float:
    """Settlement price -> ₹ per gram of fine gold (purity AND unit removed)."""
    return settle / quote_grams / fineness


def normalise_per_10g_999(fine_per_gram: float) -> float:
    """Fine gold per gram -> the retail-friendly ₹ per 10 g of 999."""
    return fine_per_gram * 9.99
