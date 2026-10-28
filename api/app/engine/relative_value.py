"""Relative-value analytics — the Python mirror of the documented spread science.

Per pair A−B each session: pick the front contract per leg outside the tender
window (dte ≥ 6), estimate leg A's own net carry curve and read it at leg B's
tenor, then report the basis (level − carry), lagged rolling z-scores, and the
cost hurdle. The normalisation identity naive = −purity + carry + residual
closes to float precision by construction.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

from app.config import SETTINGS
from app.engine.stats import half_life, mad, mean, median, std
from app.products import PRODUCT_BY_ID

if TYPE_CHECKING:
    import pandas as pd

DEFAULT_WINDOW = 60

RANGE_DAYS: dict[str, int] = {
    "1M": 22,
    "3M": 64,
    "6M": 128,
    "1Y": 250,
    "ALL": 4000,
}

MONITORED_PAIRS: list[tuple[str, str]] = [
    ("GOLDM", "GOLDPETAL"),
    ("GOLDM", "GOLDGUINEA"),
    ("GOLDM", "GOLDTEN"),
    ("GOLD", "GOLDM"),
    ("GOLDTEN", "GOLDPETAL"),
]
_IDENTITY_PAIRS = MONITORED_PAIRS


def log_bps(ratio: float) -> float:
    return math.log(ratio) * 1e4


# --- dataset-level views (cached once per fingerprint) ------------------------

_GROUPS_CACHE: dict[tuple, dict[str, dict[str, "pd.DataFrame"]]] = {}
_SPREAD_CACHE: dict[tuple[str, str], tuple[tuple, list[dict]]] = {}


def _frame_fingerprint(frame: "pd.DataFrame") -> tuple:
    if frame.empty:
        return ("empty", 0)
    return (
        str(frame["tradeDate"].max()),
        str(frame["tradeDate"].min()),
        int(len(frame)),
        round(float(frame["settle"].sum()) / 1e6, 2),
    )


def day_groups(frame: "pd.DataFrame") -> dict[str, dict[str, "pd.DataFrame"]]:
    """tradeDate → symbol → rows. One pass over the frame, cached per version."""
    fingerprint = _frame_fingerprint(frame)
    cached = _GROUPS_CACHE.get(fingerprint)
    if cached is not None:
        return cached
    groups: dict[str, dict[str, "pd.DataFrame"]] = {}
    for (date, symbol), sub in frame.groupby(["tradeDate", "symbol"], sort=True):
        groups.setdefault(str(date), {})[str(symbol)] = sub
    _GROUPS_CACHE.clear()
    _GROUPS_CACHE[fingerprint] = groups
    return groups


def front_pick(frame: "pd.DataFrame", product_id: str, date: str) -> "pd.Series | None":
    """Nearest contract with dte ≥ tender guard (the spread-safe front)."""
    day = frame[(frame["symbol"] == product_id) & (frame["tradeDate"] == date)]
    day = day[day["daysToExpiry"] >= SETTINGS.tender_guard_days]
    if day.empty:
        return None
    return day.sort_values("daysToExpiry").iloc[0]


def _front_from_day(day: dict[str, "pd.DataFrame"], product_id: str) -> "pd.Series | None":
    product = day.get(product_id)
    if product is None:
        return None
    eligible = product[product["daysToExpiry"] >= SETTINGS.tender_guard_days]
    if eligible.empty:
        return None
    return eligible.sort_values("daysToExpiry").iloc[0]


def _carry_from_day(day_frame: "pd.DataFrame", tau_target: float) -> float:
    """Net carry read from one leg's own settlements on one date, log-graded.

    Uses only non-stale nodes; a single-node or odd curve falls back to the
    flat default so a broken leg never fabricates carry.
    """
    nodes = day_frame[
        (day_frame["stale"] == False)  # noqa: E712
        & (day_frame["daysToExpiry"] > 0)
    ].sort_values("daysToExpiry")
    if len(nodes) < 2:
        return SETTINGS.default_carry
    taus = [(int(row["daysToExpiry"]) / 365, float(row["finePerGram"])) for _, row in nodes.iterrows()]
    if tau_target <= taus[0][0]:
        lower, upper = taus[0], taus[1]
    elif tau_target >= taus[-1][0]:
        lower, upper = taus[-2], taus[-1]
    else:
        lower = upper = None
        for index in range(len(taus) - 1):
            if taus[index][0] <= tau_target <= taus[index + 1][0]:
                lower, upper = taus[index], taus[index + 1]
                break
        if lower is None or upper is None:
            return SETTINGS.default_carry
    d_tau = upper[0] - lower[0]
    if d_tau <= 1e-6 or lower[1] <= 0:
        return SETTINGS.default_carry
    carry = math.log(upper[1] / lower[1]) / d_tau
    if abs(carry) > 0.6:
        return SETTINGS.default_carry
    return carry


# --- costs ------------------------------------------------------------------

def leg_round_trip_cost_bps(product_id: str, fine_per_gram: float) -> float:
    """Statutory + capped brokerage + modelled bid-ask, for one leg round trip."""
    spec = PRODUCT_BY_ID[product_id]
    notional = max(1.0, fine_per_gram * spec["unitGrams"])
    brokerage_per_side = min(SETTINGS.brokerage_flat_inr, SETTINGS.brokerage_pct * notional)
    brokerage = (2 * brokerage_per_side / notional) * 1e4
    return SETTINGS.statutory_bps + brokerage + SETTINGS.costs_bps(product_id)


def pair_round_trip_bps(frame: "pd.DataFrame", leg_a: str, leg_b: str, as_of: str) -> float:
    pick_a = front_pick(frame, leg_a, as_of)
    pick_b = front_pick(frame, leg_b, as_of)
    if pick_a is None or pick_b is None:
        return 0.0
    return leg_round_trip_cost_bps(leg_a, float(pick_a["finePerGram"])) + leg_round_trip_cost_bps(
        leg_b, float(pick_b["finePerGram"])
    )


# --- the spread build ---------------------------------------------------------

def build_spread_points(frame: "pd.DataFrame", leg_a: str, leg_b: str) -> list[dict]:
    """Full-history SpreadPoint list, matching the frontend shape exactly."""
    fingerprint = _frame_fingerprint(frame)
    cached = _SPREAD_CACHE.get((leg_a, leg_b))
    if cached is not None and cached[0] == fingerprint:
        return cached[1]

    spec_a, spec_b = PRODUCT_BY_ID[leg_a], PRODUCT_BY_ID[leg_b]
    purity_bps = log_bps(spec_a["fineness"] / spec_b["fineness"])
    groups = day_groups(frame)

    raw: list[dict] = []
    for date in sorted(groups):
        day = groups[date]
        pick_a = _front_from_day(day, leg_a)
        pick_b = _front_from_day(day, leg_b)
        if pick_a is None or pick_b is None:
            continue
        tau_a = int(pick_a["daysToExpiry"]) / 365
        tau_b = int(pick_b["daysToExpiry"]) / 365
        carry = _carry_from_day(day[leg_a], tau_b) if leg_a in day else SETTINGS.default_carry
        carry_bps = carry * (tau_b - tau_a) * 1e4
        level_bps = log_bps(float(pick_b["finePerGram"]) / float(pick_a["finePerGram"]))
        basis_bps = level_bps - carry_bps
        naive_gap_bps = log_bps(float(pick_b["quotedPerGram"]) / float(pick_a["quotedPerGram"]))
        cost_bps = leg_round_trip_cost_bps(leg_a, float(pick_a["finePerGram"])) + leg_round_trip_cost_bps(
            leg_b, float(pick_b["finePerGram"])
        )
        raw.append(
            {
                "date": date,
                "basisBps": basis_bps,
                "naiveGapBps": naive_gap_bps,
                "purityBps": purity_bps,
                "carryBps": carry_bps,
                "costBps": cost_bps,
                "stale": bool(pick_a["stale"]) or bool(pick_b["stale"]),
            }
        )

    points: list[dict] = []
    for index, point in enumerate(raw):
        history = raw[max(0, index - DEFAULT_WINDOW) : index]
        values = [entry["basisBps"] for entry in history]
        window_mean = mean(values)
        window_std = std(values)
        window_med = median(values)
        scale = mad(values, window_med) * 1.4826
        above = sum(1 for value in values if value <= point["basisBps"])
        points.append(
            {
                "date": point["date"],
                "basisBps": point["basisBps"],
                "zscore": 0.0 if index == 0 or window_std == 0 else (point["basisBps"] - window_mean) / window_std,
                "madZ": 0.0 if index == 0 or scale == 0 else (point["basisBps"] - window_med) / scale,
                "percentile": 50.0 if not values else (above / len(values)) * 100,
                "refAvgBps": window_mean,
                "refUpperBps": window_mean + window_std,
                "refLowerBps": window_mean - window_std,
                "naiveGapBps": point["naiveGapBps"],
                "purityBps": point["purityBps"],
                "carryBps": point["carryBps"],
                "costBps": point["costBps"],
                "stale": point["stale"],
            }
        )
    _SPREAD_CACHE[(leg_a, leg_b)] = (fingerprint, points)
    return points


def identity_error_bps(points: list[dict]) -> float:
    """max |naiveGap − (−purity + carry + residual)| — should be ~0 (float slop)."""
    worst = 0.0
    for point in points:
        if point.get("stale"):
            continue
        error = abs(
            point["naiveGapBps"] - (-point["purityBps"] + point["carryBps"] + point["basisBps"])
        )
        worst = max(worst, error)
    return worst


def get_spread_series(frame: "pd.DataFrame", leg_a: str, leg_b: str, window: str) -> dict | None:
    """The SpreadSeries payload contract: summary + ranged points."""
    points = build_spread_points(frame, leg_a, leg_b)
    if not points:
        return None
    cut = RANGE_DAYS.get(window, 128)
    ranged = points[max(0, len(points) - cut) :]
    last = ranged[-1]

    summary = {
        "pairKey": f"{leg_a}-{leg_b}",
        "legA": leg_a,
        "legB": leg_b,
        "window": window,
        "observations": len(ranged),
        "currentBps": last["basisBps"],
        "refAvgBps": last["refAvgBps"],
        "zscore": last["zscore"],
        "madZ": last["madZ"],
        "percentile": last["percentile"],
        "naiveGapBps": last["naiveGapBps"],
        "purityBps": last["purityBps"],
        "carryBps": last["carryBps"],
        "residualBps": last["basisBps"],
        "carryAssumptionPct": 0.0,
        "roundTripCostBps": last["costBps"],
        "expectedEdgeBps": 0.8 * abs(last["basisBps"]) - last["costBps"],
        "halfLifeDays": round(half_life([point["basisBps"] for point in ranged]), 1),
        "staleDays": sum(1 for point in ranged if point["stale"]),
    }

    front_a = front_pick(frame, leg_a, last["date"])
    front_b = front_pick(frame, leg_b, last["date"])
    pct = SETTINGS.default_carry * 100
    if front_a is not None and front_b is not None and last["carryBps"] != 0:
        tau_b = int(front_b["daysToExpiry"]) / 365
        tau_a = int(front_a["daysToExpiry"]) / 365
        years_gap = max(1e-6, tau_b - tau_a)
        value = (last["carryBps"] / (years_gap * 1e4)) * 100
        if math.isfinite(value) and abs(value) <= 60:
            pct = value
    summary["carryAssumptionPct"] = pct

    spec_a, spec_b = PRODUCT_BY_ID[leg_a], PRODUCT_BY_ID[leg_b]
    return {
        "summary": summary,
        "points": ranged,
        "legAExpiry": str(front_a["expiry"]) if front_a is not None else last["date"],
        "legBExpiry": str(front_b["expiry"]) if front_b is not None else last["date"],
        "pairLabel": f"{spec_a['id']} vs {spec_b['id']}",
    }


def pair_explainer(frame: "pd.DataFrame", leg_a: str, leg_b: str, as_of: str) -> dict | None:
    """Facets the calculation explainer needs, at a chosen date."""
    pick_a = front_pick(frame, leg_a, as_of)
    pick_b = front_pick(frame, leg_b, as_of)
    if pick_a is None or pick_b is None:
        return None
    tau_a = int(pick_a["daysToExpiry"]) / 365
    tau_b = int(pick_b["daysToExpiry"]) / 365
    carry = _carry_from_day(
        frame[(frame["symbol"] == leg_a) & (frame["tradeDate"] == as_of)], tau_b
    )
    return {
        "legA": {
            "productId": leg_a,
            "contractCode": str(pick_a["contractCode"]),
            "expiry": str(pick_a["expiry"]),
            "daysToExpiry": int(pick_a["daysToExpiry"]),
            "settle": float(pick_a["settle"]),
            "finePerGram": float(pick_a["finePerGram"]),
            "stale": bool(pick_a["stale"]),
        },
        "legB": {
            "productId": leg_b,
            "contractCode": str(pick_b["contractCode"]),
            "expiry": str(pick_b["expiry"]),
            "daysToExpiry": int(pick_b["daysToExpiry"]),
            "settle": float(pick_b["settle"]),
            "finePerGram": float(pick_b["finePerGram"]),
            "stale": bool(pick_b["stale"]),
        },
        "carryRate": carry,
        "expiryGapDays": int(pick_b["daysToExpiry"]) - int(pick_a["daysToExpiry"]),
    }


__all__ = [
    "build_spread_points",
    "get_spread_series",
    "identity_error_bps",
    "front_pick",
    "day_groups",
    "leg_round_trip_cost_bps",
    "pair_round_trip_bps",
    "pair_explainer",
    "MONITORED_PAIRS",
    "RANGE_DAYS",
]
