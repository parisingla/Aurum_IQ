from __future__ import annotations

import os
from dataclasses import dataclass, field


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, "") or default)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    """Runtime configuration; every tunable the methodology calls "config"."""

    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000") or "8000")
    cors_origins: list[str] = field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
            if origin.strip()
        ]
    )
    # Carry rate used where the curve itself cannot supply a leg; the reference
    # rate is reported alongside the term-structure curves.
    default_carry: float = _float("DEFAULT_CARRY_PCT", 6.5) / 100.0
    # External benchmark quoted against implied carry (MIBOR/T-bill proxy).
    benchmark_rate: float = _float("BENCHMARK_RATE_PCT", 6.6) / 100.0

    @property
    def carry_benchmark_pct(self) -> float:
        return self.benchmark_rate * 100

    # Feed beyond this many days to expiry a contract is treated as trading.
    tender_guard_days: int = 6
    # Brokerage is the lower of a flat per-order fee and a percentage cap.
    brokerage_flat_inr: float = _float("BROKERAGE_FLAT_INR", 20.0)
    brokerage_pct: float = _float("BROKERAGE_PCT", 0.03) / 100.0
    # Statutory + exchange round trip per leg in bps (CTT, stamp, MCX, SEBI + GST).
    statutory_bps: float = _float("STATUTORY_BPS", 1.9)
    # Modelled bid-ask crossing per round trip, per product, in bps.
    bid_ask_bps: dict[str, float] = field(
        default_factory=lambda: {
            "GOLD": 0.1,
            "GOLDM": 0.15,
            "GOLDTEN": 1.2,
            "GOLDGUINEA": 3.5,
            "GOLDPETAL": 5.0,
        }
    )
    data_dir: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

    def costs_bps(self, symbol: str) -> float:
        return self.bid_ask_bps.get(symbol, 1.5)


SETTINGS = Settings()
