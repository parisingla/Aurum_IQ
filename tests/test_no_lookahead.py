"""No-look-ahead property: truncating history never changes past signals."""

from __future__ import annotations

import math

import pandas as pd
import pytest

from app.engine import backtest as bt
from app.engine.simulate import build_seed_frame


@pytest.fixture(scope="module")
def frame() -> pd.DataFrame:
    return build_seed_frame()


def _assert_close(a: float, b: float, tol: float = 1e-6) -> None:
    assert abs(a - b) <= tol


def test_truncation_invariance_on_spread_points(frame: pd.DataFrame) -> None:
    from app.engine.relative_value import build_spread_points

    full = build_spread_points(frame, "GOLDM", "GOLDPETAL")
    tail = 37
    truncated = build_spread_points(frame.iloc[:-tail], "GOLDM", "GOLDPETAL")
    assert len(truncated) < len(full)
    for index in range(len(truncated)):
        left, right = truncated[index], full[index]
        assert left["date"] == right["date"]
        _assert_close(left["basisBps"], right["basisBps"])
        _assert_close(left["zscore"], right["zscore"])
        _assert_close(left["madZ"], right["madZ"])


def test_flat_series_produces_zero_trades() -> None:
    def flat_points(leg_a: str, leg_b: str, window: str) -> list[dict]:
        return [
            {
                "date": f"2026-01-{day:02d}",
                "basisBps": 10.0,
                "zscore": 0.0,
                "madZ": 0.0,
                "percentile": 50.0,
                "refAvgBps": 10.0,
                "refUpperBps": 10.0,
                "refLowerBps": 10.0,
                "naiveGapBps": 0.0,
                "purityBps": 0.0,
                "carryBps": 0.0,
                "costBps": 14.0,
                "stale": False,
            }
            for day in range(1, 29)
        ]

    def segments(points: list[dict]) -> list[tuple[int, int]]:
        return [(8, 24)]

    params = {
        "legA": "GOLDM",
        "legB": "GOLDPETAL",
        "entryZ": 2.0,
        "exitZ": 0.5,
        "windowDays": 20,
        "costMultiplier": 1.0,
        "trainDays": 250,
        "testDays": 40,
    }
    sim = bt._simulate(flat_points("", "", ""), params, 14.0, segments(flat_points("", "", "")))
    assert sim["trades"] == []
    assert all(value == 0 for value in sim["daily"])


def test_rolling_z_uses_only_history_before_index() -> None:
    from app.engine.stats import lagged_z

    values = [0.0] * 30 + [50.0, 0.0]
    # The z at index 30 must not see the value that comes after it.
    assert lagged_z(values, 30, 20) == lagged_z(values[:31], 30, 20)
