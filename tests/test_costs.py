"""The cost model: every leg pays its share, and small lots pay the most."""

from __future__ import annotations

from app.engine.costs import brokerage_bps, leg_round_trip, pair_round_trip
from app.products import spec


def test_brokerage_is_capped_per_order() -> None:
    # Percentage cap (0.03% × 2 sides = 6 bps) binds below ₹66,667 notional.
    medium = brokerage_bps(50_000.0)
    assert abs(medium - 6.0) < 0.2
    # Large notional → flat ₹20 x 2 dominates and shrinks with size, in bps:
    # 40 / 1_480_000 × 10_000 ≈ 0.27 bps.
    large = brokerage_bps(1_480_000.0)
    assert abs(large - 40 / 1_480_000 * 10_000) < 0.05
    # Tiny notional → the percentage fee (₹4.44/order) is still below the flat
    # ₹20, so it keeps binding: 0.06% of notional = 6 bps, same as medium.
    small = brokerage_bps(14_800.0)
    assert abs(small - 6.0) < 0.2


def test_leg_costs_are_positive_and_ordered() -> None:
    legs = {}
    for product_id in ("GOLD", "GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"):
        front = spec(product_id)
        # A representative front-month level, ₹1,480 fine per gram.
        settle = 1480.0 * front["fineness"] * front["quoteGrams"]
        legs[product_id] = leg_round_trip(settle, front["quoteGrams"], front["unitGrams"], product_id)
    assert all(value > 0 for value in legs.values())
    # The 1 g and 8 g contracts are structurally more expensive to trade.
    assert legs["GOLDPETAL"] > legs["GOLDM"] * 2
    assert legs["GOLDGUINEA"] > legs["GOLDM"] * 2
    assert legs["GOLD"] < legs["GOLDM"] < legs["GOLDTEN"]


def test_pair_cost_is_the_sum_of_legs() -> None:
    goldm = spec("GOLDM")
    petal = spec("GOLDPETAL")
    settle_m = 1480.0 * goldm["fineness"] * goldm["quoteGrams"]
    settle_p = 1480.0 * petal["fineness"] * petal["quoteGrams"]
    pair = pair_round_trip("GOLDM", settle_m, goldm["quoteGrams"], goldm["unitGrams"],
                           "GOLDPETAL", settle_p, petal["quoteGrams"], petal["unitGrams"])
    leg_m = leg_round_trip(settle_m, goldm["quoteGrams"], goldm["unitGrams"], "GOLDM")
    leg_p = leg_round_trip(settle_p, petal["quoteGrams"], petal["unitGrams"], "GOLDPETAL")
    assert abs(pair - (leg_m + leg_p)) < 1e-9
    assert pair > 10.0  # the documented GOLDM-vs-GOLDPETAL hurdle order of magnitude
