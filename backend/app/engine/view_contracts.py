"""Contract listings and per-contract series, built from the working frame."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.engine.simulate import add_days
from app.products import PRODUCT_BY_ID

if TYPE_CHECKING:
    import pandas as pd


def contract_rows(frame: "pd.DataFrame") -> list[dict[str, object]]:
    """One row per contract, at its latest observation (the Contract schema)."""
    contracts: list[dict[str, object]] = []
    for _, group in frame.groupby("contractId", sort=False):
        latest = group.sort_values("tradeDate").iloc[-1]
        product = PRODUCT_BY_ID[str(latest["symbol"])]
        contracts.append(
            {
                "id": str(latest["contractId"]),
                "symbol": str(latest["symbol"]),
                "contractCode": str(latest["contractCode"]),
                "productId": str(latest["symbol"]),
                "expiry": str(latest["expiry"]),
                "lastTradingDay": str(latest["expiry"]),
                "tenderStart": add_days(str(latest["expiry"]), -5),
                "tradeDate": str(latest["tradeDate"]),
                "settle": float(latest["settle"]),
                "open": float(latest["open"]),
                "high": float(latest["high"]),
                "low": float(latest["low"]),
                "prevSettle": float(latest["prevSettle"]),
                "volumeLots": int(latest["volumeLots"]),
                "openInterestLots": int(latest["openInterestLots"]),
                "valueLakh": float(latest["valueLakh"]),
                "stale": bool(latest["stale"]),
                "finePerGram": float(latest["finePerGram"]),
                "quotedPerGram": float(latest["quotedPerGram"]),
                "daysToExpiry": int(latest["daysToExpiry"]),
                "notionalPerLot": float(latest["settle"]) * product["unitGrams"] / product["quoteGrams"],
            }
        )
    contracts.sort(key=lambda row: (row["daysToExpiry"], row["symbol"]))  # type: ignore[arg-type]
    return contracts


def product_summary(frame: pd.DataFrame, symbol: str, as_of: str) -> dict[str, object] | None:
    day = frame[(frame["symbol"] == symbol) & (frame["tradeDate"] == as_of)]
    if day.empty:
        return None
    existing = day["volumeLots"] > 0
    return {
        "symbol": symbol,
        "asOf": as_of,
        "contracts": int(len(day)),
        "staleContracts": int((~existing).sum()),
        "volumeLots": int(day["volumeLots"].sum()),
        "openInterestLots": int(day["openInterestLots"].sum()),
        "valueLakh": float(day["valueLakh"].sum()),
    }


def price_series(frame: pd.DataFrame, product_id: str, contract_id: str | None, days: int) -> dict[str, object] | None:
    """The /api/prices payload: one contract's settlement + flow history."""
    subset = frame[frame["symbol"] == product_id]
    if subset.empty:
        return None
    if contract_id:
        chosen = subset[subset["contractId"] == contract_id]
        if chosen.empty:
            return None
    else:
        # No contract given: use the contract nearest its expiry (any phase).
        latest = subset.sort_values(["tradeDate", "daysToExpiry"]).iloc[-1]
        contract_id = str(latest["contractId"])
        chosen = subset[subset["contractId"] == contract_id]
    head = chosen.head(1).iloc[0]
    series = chosen.sort_values("tradeDate").tail(days)
    return {
        "productId": product_id,
        "contractId": str(head["contractId"]),
        "contractCode": str(head["contractCode"]),
        "expiry": str(head["expiry"]),
        "asOf": str(series["tradeDate"].max()),
        "points": [
            {
                "date": str(row["tradeDate"]),
                "settle": float(row["settle"]),
                "volumeLots": int(row["volumeLots"]),
                "openInterestLots": int(row["openInterestLots"]),
                "stale": bool(row["stale"]),
            }
            for _, row in series.iterrows()
        ],
    }
