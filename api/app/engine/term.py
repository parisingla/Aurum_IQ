"""Term structure per product, plus the front-contract settlement series."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from app.config import SETTINGS
from app.products import PRODUCT_IDS, product_name

if TYPE_CHECKING:
    import pandas as pd


def term_curves(frame: "pd.DataFrame", as_of: str) -> list[dict]:
    """One curve per product: every live node (dte > 0), nearest expiry first."""
    curves: list[dict] = []
    for product_id in PRODUCT_IDS:
        day = frame[(frame["symbol"] == product_id) & (frame["tradeDate"] == as_of)]
        day = day[day["daysToExpiry"] > 0].sort_values("daysToExpiry")
        points: list[dict] = []
        for _, row in day.iterrows():
            fine = float(row["finePerGram"])
            points.append(
                {
                    "daysToExpiry": int(row["daysToExpiry"]),
                    "expiry": str(row["expiry"]),
                    "contractCode": str(row["contractCode"]),
                    "per10g999": fine * 9.99,
                    "finePerGram": fine,
                    "volumeLots": int(row["volumeLots"]),
                    "stale": bool(row["stale"]),
                }
            )

        implied_carry_pct = 0.0
        if len(points) >= 2:
            first, second = points[0], points[1]
            d_tau = (second["daysToExpiry"] - first["daysToExpiry"]) / 365
            if d_tau > 0 and first["finePerGram"] > 0:
                implied_carry_pct = (math.log(second["finePerGram"] / first["finePerGram"]) / d_tau) * 100

        curves.append(
            {
                "productId": product_id,
                "name": product_name(product_id),
                "points": points,
                "impliedCarryPct": implied_carry_pct,
            }
        )
    return curves


def term_structure(frame: "pd.DataFrame") -> dict:
    """The /api/analytics/term-structure envelope."""
    as_of = str(frame["tradeDate"].max())
    return {
        "asOf": as_of,
        "curves": term_curves(frame, as_of),
        "benchmarkRatePct": SETTINGS.carry_benchmark_pct,
        "note": (
            "Nodes are live settlements read point-in-time on the as-of date; zero-volume "
            "nodes are marked and should not be used to interpolate."
        ),
    }


def front_series(frame: "pd.DataFrame", symbol: str, days: int) -> list[dict]:
    """Nearest-contract settlement per session (no tender guard) for price charts."""
    subset = frame[frame["symbol"] == symbol].sort_values(["tradeDate", "daysToExpiry"])
    picked: dict[str, dict] = {}
    for _, row in subset.iterrows():
        date = str(row["tradeDate"])
        if date not in picked:
            picked[date] = {
                "date": date,
                "settle": float(row["settle"]),
                "impliedSpot": float(row["settle"]) / math.exp(SETTINGS.default_carry * int(row["daysToExpiry"]) / 365),
                "daysToExpiry": int(row["daysToExpiry"]),
                "stale": bool(row["stale"]),
            }
    series = sorted(picked.values(), key=lambda item: item["date"])
    return series[-days:] if days > 0 else series


def contract_history(frame: "pd.DataFrame", contract_id: str, days: int) -> list[dict]:
    """One contract's settlement series for the explorer drawer."""
    subset = frame[frame["contractId"] == contract_id].sort_values("tradeDate")
    series = subset[-days:] if days > 0 else subset
    return [
        {
            "date": str(row["tradeDate"]),
            "settle": float(row["settle"]),
            "volumeLots": int(row["volumeLots"]),
            "stale": bool(row["stale"]),
        }
        for _, row in series.iterrows()
    ]
