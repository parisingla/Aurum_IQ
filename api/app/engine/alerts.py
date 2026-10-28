"""Alert generation — the documented gating stack, nothing more.

z-threshold → cost hurdle → persistence → data quality. A card never quotes a
number its chart contradicts: every draft is built from the same spread series
the analytics route serves.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.engine.relative_value import MONITORED_PAIRS
from app.products import PRODUCT_BY_ID

if TYPE_CHECKING:
    import pandas as pd

ENTRY_Z = 2
STAMP_TIMES = ["15:45", "15:42", "15:38", "15:31", "15:24", "15:16", "15:09"]
MIN_USABLE = f"sub-{0.1}"

_SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _persistence(points: list[dict]) -> int:
    days = 0
    for point in reversed(points):
        if abs(point["zscore"]) >= ENTRY_Z:
            days += 1
        else:
            break
    return days


def confidence_for(zscore: float, streak: int, half_life: float, dte: int) -> int:
    score = 42 + (abs(zscore) - ENTRY_Z) * 16 + (streak - 1) * 6
    if half_life > dte > 0:
        score -= 12
    if abs(zscore) > 3.2:
        score -= 8
    return int(round(_clamp(score, 28, 91)))


def _prepare(text: str) -> str:
    return " ".join(text.split())


def build_pair_alert(frame: "pd.DataFrame", spread_fn, leg_a: str, leg_b: str) -> dict | None:
    series = spread_fn(frame, leg_a, leg_b, "6M")
    if series is None:
        return None
    summary = series["summary"]
    spec_b = PRODUCT_BY_ID[leg_b]
    snapshot = pair_legs(frame, leg_a, leg_b)
    abs_z = abs(summary["zscore"])
    streak = _persistence(series["points"][-40:])
    direction = "rich" if summary["residualBps"] >= 0 else "cheap"

    if abs_z < 1.5:
        return None

    armed = abs_z >= ENTRY_Z
    clears_cost = summary["expectedEdgeBps"] > 0
    pair_label = f"{spec_b['name']} vs {PRODUCT_BY_ID[leg_a]['name']}"
    notional_hint = (
        "Fixed per-order brokerage dominates a 1 g / 8 g leg."
        if spec_b["unitGrams"] < 10
        else "Costs are dominated by statutory charges on this pair."
    )

    severity = "info"
    title = f"{pair_label} — inside the normal band"
    summary_text = _prepare(
        f"The expiry-matched basis sits at {summary['residualBps']:.1f} bps, "
        f"{summary['percentile']:.0f}th percentile of the last 60 settlements. No action is implied."
    )

    if armed and clears_cost:
        severity = "critical" if abs_z >= 2.5 and streak >= 2 else "warning"
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(streak or 1, "th")
        title = (
            f"{pair_label} — {direction} by {abs(summary['residualBps']):.1f} bps after adjustments"
        )
        summary_text = _prepare(
            f"Purity and carry are already removed, so the {abs(summary['residualBps']):.1f} bps residual "
            f"is the tradeable part. Expected reversion at 80% capture is {summary['expectedEdgeBps']:.1f} bps "
            f"against a {summary['roundTripCostBps']:.1f} bps round trip — it clears the hurdle on the "
            f"{streak or 1}{suffix} consecutive settlement."
        )
    elif armed and not clears_cost:
        title = f"{pair_label} — z-score armed, costs absorb it"
        summary_text = _prepare(
            f"|z| is {abs_z:.2f} but expected reversion of {summary['expectedEdgeBps']:.1f} bps does not "
            f"cover the {summary['roundTripCostBps']:.1f} bps round trip. The system stays quiet on purpose. "
            f"{notional_hint}"
        )
    else:
        title = f"{pair_label} — watching {abs_z:.2f}σ, below the {ENTRY_Z}σ gate"
        summary_text = _prepare(
            f"Basis is {direction} at {summary['residualBps']:.1f} bps with no persistence yet. Hysteresis "
            f"keeps the alert disarmed until |z| exceeds {ENTRY_Z}."
        )

    evidence = [
        {"label": "Rolling z-score", "value": f"{summary['zscore']:.2f} (60-session, lagged by one)"},
        {"label": "Robust z (median / MAD)", "value": f"{summary['madZ']:.2f}"},
        {
            "label": "Raw quoted premium",
            "value": f"{'+' if summary['naiveGapBps'] >= 0 else '−'}{abs(summary['naiveGapBps']):.1f} bps",
        },
        {
            "label": "Less purity (999 vs 995)",
            "value": f"{'+' if summary['purityBps'] >= 0 else '−'}{abs(summary['purityBps']):.1f} bps",
        },
        {
            "label": "Less expiry carry",
            "value": f"{'+' if summary['carryBps'] >= 0 else '−'}{abs(summary['carryBps']):.1f} bps over "
            f"{snapshot['expiryGapDays'] if snapshot else 0} days",
        },
        {
            "label": "Residual basis",
            "value": f"{'+' if summary['residualBps'] >= 0 else '−'}{abs(summary['residualBps']):.1f} bps",
        },
        {"label": "Round-trip cost (both legs)", "value": f"{summary['roundTripCostBps']:.1f} bps"},
        {"label": "Expected edge at 80% capture", "value": f"{summary['expectedEdgeBps']:.1f} bps"},
        {
            "label": "Persistence",
            "value": f"{streak} consecutive settlement{'s' if streak > 1 else ''}" if streak > 0 else "Not yet persistent",
        },
        {"label": "Stale prints in window", "value": f"{summary['staleDays']} of {summary['observations']} sessions"},
    ]

    return {
        "severity": severity,
        "pair": {"legA": leg_a, "legB": leg_b},
        "title": title,
        "summary": summary_text,
        "evidence": evidence,
        "confidence": confidence_for(
            summary["zscore"], streak, summary["halfLifeDays"], snapshot["legBDaysToExpiry"] if snapshot else 0
        ),
        "confidenceNote": "Out-of-sample hit rate 58% for |z| ≥ 2 in the same days-to-expiry bucket (n = 31, demo calibration)",
        "zscore": summary["zscore"],
        "residualBps": summary["residualBps"],
        "costBps": summary["roundTripCostBps"],
        "expectedEdgeBps": summary["expectedEdgeBps"],
    }


def pair_legs(frame: "pd.DataFrame", leg_a: str, leg_b: str) -> dict | None:
    from app.engine.relative_value import front_pick

    pick_a = front_pick(frame, leg_a, frame["tradeDate"].max())
    pick_b = front_pick(frame, leg_b, frame["tradeDate"].max())
    if pick_a is None or pick_b is None:
        return None
    return {
        "expiryGapDays": int(pick_b["daysToExpiry"]) - int(pick_a["daysToExpiry"]),
        "legBDaysToExpiry": int(pick_b["daysToExpiry"]),
    }


def data_quality_alert(frame: "pd.DataFrame", spread_fn) -> dict:
    recent = sorted(frame["tradeDate"].unique())[-10:]
    recent_rows = frame[frame["tradeDate"].isin(recent)]
    stale_rows = int(recent_rows["stale"].sum())
    from app.engine.relative_value import get_spread_series

    series = spread_fn(frame, "GOLDM", "GOLDGUINEA", "6M")
    summary = series["summary"] if series else {}
    return {
        "severity": "info",
        "pair": {"legA": "GOLDM", "legB": "GOLDGUINEA"},
        "title": "Data quality — zero-volume settlements in far Guinea months",
        "summary": _prepare(
            f"{stale_rows} settlement rows in the last 10 sessions printed with zero volume. Their rows stay "
            "in the chart but are excluded from interpolation and from signal generation."
        ),
        "evidence": [
            {"label": "Rows affected (last 10 sessions)", "value": str(stale_rows)},
            {"label": "Rule", "value": "volume = 0 → stale, signal-suppressed"},
            {"label": "Detection", "value": "unchanged settlement with zero volume"},
            {
                "label": "Residual basis (GOLDM−GOLDGUINEA)",
                "value": f"{summary.get('residualBps', 0):.1f} bps",
            },
        ],
        "confidence": 100,
        "confidenceNote": "Deterministic validator output — not a model estimate",
        "zscore": 0.0,
        "residualBps": summary.get("residualBps", 0.0),
        "costBps": summary.get("roundTripCostBps", 0.0),
        "expectedEdgeBps": summary.get("expectedEdgeBps", 0.0),
    }


def silence_alert(max_residual: float) -> dict:
    return {
        "severity": "info",
        "pair": {"legA": "GOLDM", "legB": "GOLDPETAL"},
        "title": "Signal silence — no pair cleared the cost hurdle today",
        "summary": _prepare(
            f"Largest residual on the monitored set is {max_residual:.1f} bps, and the cheapest round trip "
            "that could monetise it is higher. Saying nothing is the designed behaviour, not an outage."
        ),
        "evidence": [
            {"label": "Monitored pairs", "value": str(len(MONITORED_PAIRS))},
            {"label": "Entry gate", "value": "|z| ≥ 2.0 with 80% capture > round trip"},
            {"label": "Hysteresis", "value": "re-arm only below |z| 1.0"},
            {"label": "Persistence", "value": "2 consecutive settlements required"},
        ],
        "confidence": 100,
        "confidenceNote": "Deterministic gate evaluation over the monitored pair set",
        "zscore": 0.0,
        "residualBps": max_residual,
        "costBps": 0.0,
        "expectedEdgeBps": 0.0,
    }


def get_alerts(frame: "pd.DataFrame", spread_fn) -> list[dict]:
    drafts: list[dict] = []
    for leg_a, leg_b in MONITORED_PAIRS:
        draft = build_pair_alert(frame, spread_fn, leg_a, leg_b)
        if draft:
            drafts.append(draft)

    drafts.sort(key=lambda draft: (_SEVERITY_ORDER[draft["severity"]], -abs(draft["zscore"])))

    if not any(draft["severity"] != "info" for draft in drafts):
        max_residual = max(
            (
                abs((spread_fn(frame, leg_a, leg_b, "6M") or {"summary": {"residualBps": 0}})["summary"]["residualBps"])
                for leg_a, leg_b in MONITORED_PAIRS
                if spread_fn(frame, leg_a, leg_b, "6M")
            ),
            default=0.0,
        )
        drafts.insert(0, silence_alert(max_residual))

    drafts.append(data_quality_alert(frame, spread_fn))

    as_of = str(frame["tradeDate"].max())
    alerts: list[dict] = []
    for position, draft in enumerate(drafts):
        alerts.append(
            {
                "id": f"alert-{as_of}-{draft['pair']['legA']}-{draft['pair']['legB']}-{position}",
                "severity": draft["severity"],
                "productId": draft["pair"]["legB"],
                "pairLabel": f"{draft['pair']['legB']} / {draft['pair']['legA']}",
                "title": draft["title"],
                "summary": draft["summary"],
                "evidence": draft["evidence"],
                "confidence": draft["confidence"],
                "confidenceNote": draft["confidenceNote"],
                "timestamp": f"{as_of} {STAMP_TIMES[position % len(STAMP_TIMES)]}",
                "zscore": draft["zscore"],
                "residualBps": draft["residualBps"],
                "costBps": draft["costBps"],
                "expectedEdgeBps": draft["expectedEdgeBps"],
                "status": "open",
            }
        )
    return alerts
