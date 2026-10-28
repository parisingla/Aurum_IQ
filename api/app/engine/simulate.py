"""Deterministic synthetic bhavcopy-like dataset.

The engine needs a working dataset before anyone uploads real MCX Bhavcopy
rows. This module generates one from fixed seeds and marks it unmistakably as
illustrative: it follows the documented BHAVCOPY schema and the demo-market
generator, but every row is synthetic.
"""

from __future__ import annotations

import datetime as dt
from calendar import monthrange
from collections import defaultdict
from dataclasses import dataclass
from typing import Iterator

import pandas as pd

from app.products import PRODUCT_IDS, spec, tick_round

AS_OF = "2026-10-19"
HISTORY_START = "2025-01-01"
DEFAULT_CARRY = 0.065

HOLIDAYS: frozenset[str] = frozenset(
    {
        "2025-01-01", "2025-01-14", "2025-02-26", "2025-03-14", "2025-04-10",
        "2025-04-14", "2025-05-01", "2025-06-27", "2025-08-15", "2025-10-02",
        "2025-10-21", "2025-11-05", "2025-12-25", "2026-01-01", "2026-01-26",
        "2026-03-04", "2026-04-03", "2026-04-14", "2026-05-01", "2026-08-15",
        "2026-10-02",
    }
)

MONTH_ABBR = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
]

COLUMNS = [
    "tradeDate", "symbol", "contractCode", "contractId", "expiry",
    "open", "high", "low", "settle", "prevSettle",
    "volumeLots", "openInterestLots", "valueLakh", "stale",
    "finePerGram", "quotedPerGram", "daysToExpiry",
]


# --- portable deterministic randomness (same algorithm as the frontend) ----

def _hash(key: str) -> int:
    value = 2166136261
    for ch in key:
        value ^= ord(ch)
        value = (value * 16777619) & 0xFFFFFFFF
    return value


def _mulberry32(seed: int) -> Iterator[float]:
    state = seed & 0xFFFFFFFF

    def rand() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61)))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rand


def _gaussian(rand: Iterator[float]) -> float:
    u = max(1e-9, rand())
    v = max(1e-9, rand())
    return (-2 * _safe_log(u)) ** 0.5 * _cos(2 * 3.141592653589793 * v)


def _safe_log(x: float) -> float:
    import math
    return math.log(max(x, 1e-9))


def _cos(x: float) -> float:
    import math
    return math.cos(x)


# --- calendar ---------------------------------------------------------------

def _date(iso: str) -> dt.date:
    year, month, day = iso.split("-")
    return dt.date(int(year), int(month), int(day))


def _iso(value: dt.date) -> str:
    return value.strftime("%Y-%m-%d")


def add_days(iso: str, days: int) -> str:
    return _iso(_date(iso) + dt.timedelta(days=days))


def diff_days(from_iso: str, to_iso: str) -> int:
    return (_date(to_iso) - _date(from_iso)).days


def is_trading_day(iso: str) -> bool:
    d = _date(iso)
    return d.weekday() < 5 and iso not in HOLIDAYS


def previous_trading_day(iso: str) -> str:
    cursor = iso
    for _ in range(10):
        if is_trading_day(cursor):
            return cursor
        cursor = add_days(cursor, -1)
    return iso


def each_trading_day(from_iso: str, to_iso: str) -> list[str]:
    days: list[str] = []
    cursor = from_iso
    while diff_days(cursor, to_iso) >= 0:
        if is_trading_day(cursor):
            days.append(cursor)
        cursor = add_days(cursor, 1)
    return days


def _in_month(year: int, month: int, base: str) -> str:
    return f"{year:04d}-{month:02d}-{base:02d}"


def resolve_expiry(year: int, month: int, band: str) -> str:
    """Expiry = 5th of month, or month end — moved back to a trading day."""
    if band == "fifth":
        return previous_trading_day(_in_month(year, month, 5))
    last = monthrange(year, month)[1]
    return previous_trading_day(_in_month(year, month, last))


def _contract_code(symbol: str, expiry: str) -> str:
    date = _date(expiry)
    month_abbr = MONTH_ABBR[date.month - 1]
    return f"{symbol}{date.day:02d}{month_abbr}{str(date.year)[2:]}"


# --- seeded price path ------------------------------------------------------

class _SpotPath:
    def __init__(self) -> None:
        self.values: dict[str, float] = {}
        trading = each_trading_day(HISTORY_START, AS_OF)
        rand = _mulberry32(_hash("aurum/spot-path/v1"))
        level = 7800.0
        path: list[tuple[str, float]] = []
        for index, day in enumerate(trading):
            if index > 0:
                daily = 0.00055 + _gaussian(rand) * 0.0082
                if day == "2026-01-30":
                    daily = -0.12783  # the Jan-2026 crash day
                if day == "2026-05-13":
                    daily = 0.06952  # duty reset to 15%
                level *= 1 + daily
            path.append((day, level))
        target = 14800.0
        factor = target / (path[-1][1] if path else target)
        for day, value in path:
            self.values[day] = value * factor

    def at(self, day: str) -> float | None:
        return self.values.get(day)


PRODUCT_CONFIG: dict[str, dict[str, float]] = {
    "GOLD": {"basis": 0.0000, "idioSigma": 0.0003, "volumeBase": 9000, "oiBase": 22000, "staleProbability": 0.001, "liveDays": 330},
    "GOLDM": {"basis": 0.0001, "idioSigma": 0.0004, "volumeBase": 14000, "oiBase": 51000, "staleProbability": 0.003, "liveDays": 180},
    "GOLDTEN": {"basis": 0.0002, "idioSigma": 0.0009, "volumeBase": 5200, "oiBase": 9000, "staleProbability": 0.03, "liveDays": 180},
    "GOLDGUINEA": {"basis": 0.0005, "idioSigma": 0.0012, "volumeBase": 1400, "oiBase": 11000, "staleProbability": 0.09, "liveDays": 180},
    "GOLDPETAL": {"basis": 0.0007, "idioSigma": 0.0007, "volumeBase": 46000, "oiBase": 58000, "staleProbability": 0.02, "liveDays": 180},
}

RANK_VOLUME_FACTOR = [1.0, 0.34, 0.14, 0.07, 0.04, 0.025]


@dataclass(frozen=True)
class ContractMeta:
    contract_id: str
    symbol: str
    contract_code: str
    expiry: str
    first_day: str


def _contract_metas() -> list[ContractMeta]:
    metas: list[ContractMeta] = []
    for symbol in PRODUCT_IDS:
        product = spec(symbol)
        config = PRODUCT_CONFIG[symbol]
        list_from = "2025-04-01" if symbol == "GOLDTEN" else HISTORY_START
        for year in range(2025, 2028):
            for month in range(1, 13):
                # GOLD lists bimonthly: Feb, Apr, Jun, Aug, Oct, Dec.
                if symbol == "GOLD" and month % 2 == 1:
                    continue
                if year == 2027 and month > 6:
                    continue
                expiry = resolve_expiry(year, month, product["expiryBand"])
                if diff_days(HISTORY_START, expiry) < 0:
                    continue
                tradeable_from = add_days(expiry, -int(config["liveDays"]))
                first_day = max(list_from, tradeable_from)
                if diff_days(first_day, expiry) < 0:
                    continue
                metas.append(
                    ContractMeta(
                        contract_id=f"{symbol}-{expiry}",
                        symbol=symbol,
                        contract_code=_contract_code(symbol, expiry),
                        expiry=expiry,
                        first_day=first_day,
                    )
                )
    return metas


def build_seed_frame() -> pd.DataFrame:
    """Build the entire illustrative market once; cached by callers."""
    rand = _mulberry32(_hash("aurum/contract-rows/v1"))
    spot = _SpotPath()
    trading_days = each_trading_day(HISTORY_START, AS_OF)

    shocks: dict[str, float] = {}
    last_settle: dict[str, float] = {}
    rows: list[dict[str, float | str | int | bool]] = []

    contracts_by_symbol: dict[str, list[ContractMeta]] = defaultdict(list)
    for meta in _contract_metas():
        contracts_by_symbol[meta.symbol].append(meta)

    recent_days = trading_days[-6:]

    for day in trading_days:
        for symbol in PRODUCT_IDS:
            config = PRODUCT_CONFIG[symbol]
            product = spec(symbol)
            live = [
                {"meta": meta, "dte": diff_days(day, meta.expiry)}
                for meta in sorted(contracts_by_symbol[symbol], key=lambda m: m.expiry)
                if diff_days(meta.first_day, day) >= 0 and diff_days(day, meta.expiry) >= 0
            ]
            if not live:
                continue
            live.sort(key=lambda e: e["dte"])
            level = spot.at(day)
            if level is None:
                continue

            for rank, entry in enumerate(live):
                meta, dte = entry["meta"], entry["dte"]
                phi = 0.88
                previous_shock = shocks.get(meta.contract_id, 0.0)
                shock = phi * previous_shock + (1 - phi) * _gaussian(rand) * config["idioSigma"] * 3.1
                shocks[meta.contract_id] = shock

                fine = level * (1 + DEFAULT_CARRY) ** (dte / 365) * (1 + config["basis"] + shock)
                if symbol == "GOLDPETAL" and day in recent_days:
                    index = recent_days.index(day)
                    fine *= (0.0018 + 0.00045 * (index + 1)) + 1

                stale = False
                volume = 0.0
                thin_boost = 1.7 if rank > 0 else 1.0
                if rand() < config["staleProbability"] * thin_boost:
                    stale = True
                else:
                    volume = round(
                        config["volumeBase"]
                        * (RANK_VOLUME_FACTOR[rank] if rank < len(RANK_VOLUME_FACTOR) else 0.02)
                        * (0.55 + 0.9 * rand())
                        * (0.55 if dte <= 5 else 1)
                    )

                settle = tick_round(fine * product["fineness"] * product["quoteGrams"], product["tickInr"])
                previous = last_settle.get(meta.contract_id)
                settle_priced = previous if stale and previous is not None else settle
                prev_settle = previous if previous is not None else tick_round(settle_priced * 0.998, product["tickInr"])
                opened = prev_settle
                spread = abs(settle_priced - opened) + product["tickInr"] * (1 + rand() * 4)
                high = max(opened, settle_priced) + spread * rand() * 0.6
                low = min(opened, settle_priced) - spread * rand() * 0.6

                oi = round(
                    config["oiBase"]
                    * (RANK_VOLUME_FACTOR[rank] if rank < len(RANK_VOLUME_FACTOR) else 0.02)
                    * (0.8 + 0.4 * rand())
                    * (0.45 if dte <= 8 else 1)
                    * (0.9 if stale else 1)
                )
                notional_per_lot = settle_priced * product["unitGrams"] / product["quoteGrams"]

                rows.append(
                    {
                        "tradeDate": day,
                        "symbol": symbol,
                        "contractCode": meta.contract_code,
                        "contractId": meta.contract_id,
                        "expiry": meta.expiry,
                        "open": opened,
                        "high": high,
                        "low": low,
                        "settle": settle_priced,
                        "prevSettle": prev_settle,
                        "volumeLots": 0 if stale else volume,
                        "openInterestLots": oi,
                        "valueLakh": volume * notional_per_lot / 1e5,
                        "stale": stale,
                        "finePerGram": settle_priced / product["quoteGrams"] / product["fineness"],
                        "quotedPerGram": settle_priced / product["quoteGrams"],
                        "daysToExpiry": dte,
                    }
                )
                last_settle[meta.contract_id] = settle_priced

    frame = pd.DataFrame(rows, columns=COLUMNS)
    return frame

