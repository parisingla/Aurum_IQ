"""The normalisation identity and the unit conversions behind every spread."""

from __future__ import annotations

import math

import pytest

from app.engine.relative_value import build_spread_points, identity_error_bps
from app.engine.simulate import AS_OF, build_seed_frame
from app.products import PRODUCT_SPECS, normalise_fine_gold, normalise_per_10g_999, spec


@pytest.fixture(scope="module")
def frame():
    return build_seed_frame()


def test_purity_shift_is_log_999_over_995() -> None:
    assert abs(math.log(0.999 / 0.995) * 1e4 - 40.14) < 0.1


def test_fine_gold_conversion_matches_hand_math() -> None:
    # GOLD settles at ₹14,800 per 10 g of 995 → ₹1,487.44 per fine gram.
    fine = normalise_fine_gold(14800.0, 10.0, 0.995)
    assert abs(fine - 1480.0 / 0.995) < 1e-6
    # Retail-friendly conversion: fine gram → ₹ per 10 g of 999.
    assert abs(normalise_per_10g_999(fine) - fine * 9.99) < 1e-6


def test_identity_closes_for_every_monitored_pair(frame) -> None:
    pairs = [
        ("GOLDM", "GOLDPETAL"),
        ("GOLDM", "GOLDGUINEA"),
        ("GOLDM", "GOLDTEN"),
        ("GOLD", "GOLDM"),
        ("GOLDTEN", "GOLDPETAL"),
    ]
    for leg_a, leg_b in pairs:
        points = build_spread_points(frame, leg_a, leg_b)
        assert points, f"no points for {leg_a}/{leg_b}"
        assert identity_error_bps(points) < 0.01, f"identity broke for {leg_a}/{leg_b}"


def test_seed_market_shape(frame) -> None:
    assert not frame.empty
    assert frame["tradeDate"].min() == "2025-01-02"
    assert frame["tradeDate"].max() == AS_OF
    assert set(frame["symbol"].unique()) == {row["id"] for row in PRODUCT_SPECS}
    for row in PRODUCT_SPECS:
        day = frame[(frame["symbol"] == row["id"]) & (frame["tradeDate"] == AS_OF)]
        assert not day.empty, f"{row['id']} has no rows at AS_OF"


def test_spec_table_invariants() -> None:
    for row in PRODUCT_SPECS:
        found = spec(row["id"])
        assert found["fineness"] in (0.995, 0.999)
        assert found["purity"] in (995, 999)
        assert found["unitGrams"] > 0
