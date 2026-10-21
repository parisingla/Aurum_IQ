"""Round-trip trading cost per leg, in basis points of notional.

Stack per the research report: statutory charges (CTT, stamp duty, MCX and
SEBI fees, GST) plus discount-brokerage capped per order, plus a modelled
bid-ask crossing. Fixed ₹-per-order brokerage dominates on 1 g and 8 g lots —
which is exactly why most small-contract signals die at the cost hurdle.
"""

from __future__ import annotations

from app.config import SETTINGS


def brokerage_bps(notional_inr: float) -> float:
    """₹20-or-0.03% per order, both sides, expressed in bps of notional."""
    notional = max(1.0, notional_inr)
    per_side = min(SETTINGS.brokerage_flat_inr, SETTINGS.brokerage_pct * notional)
    return ((2 * per_side) / notional) * 1e4


def leg_round_trip(settle: float, quote_grams: float, unit_grams: float, symbol: str) -> float:
    """One leg bought then sold: statutory + brokerage + modelled spread, bps."""
    notional = settle * unit_grams / quote_grams
    statutory = SETTINGS.statutory_bps
    brokerage = brokerage_bps(notional)
    bid_ask = SETTINGS.costs_bps(symbol)
    return statutory + brokerage + bid_ask


def pair_round_trip(
    leg_a: str, settle_a: float, quote_a: float, unit_a: float,
    leg_b: str, settle_b: float, quote_b: float, unit_b: float,
) -> float:
    """Round trip on both legs — a spread closes one position and opens the other."""
    leg_a_bps = leg_round_trip(settle_a, quote_a, unit_a, leg_a)
    leg_b_bps = leg_round_trip(settle_b, quote_b, unit_b, leg_b)
    return leg_a_bps + leg_b_bps
