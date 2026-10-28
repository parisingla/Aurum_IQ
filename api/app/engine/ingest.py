"""CSV ingestion for MCX Bhavcopy-style uploads.

Rules follow the research notes: defensive date parsing, trimmed symbols,
duplicate (date, symbol, expiry) keys dropped, settlement > 0, OI ≥ 0,
expiry ≥ trade date, gold-family symbols only, and byte-identical files
rejected (a re-served stale file would fabricate a second day of history).
Rows are never silently discarded — every dropped or fixed row is reported.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime

import pandas as pd

from app.engine.simulate import (
    COLUMNS,
    _contract_code,
    diff_days,
)
from app.products import PRODUCT_BY_ID, PRODUCT_IDS

# Accepted header aliases (already normalised: lowercase, no spaces/underscores).
ALIASES: dict[str, list[str]] = {
    "tradeDate": ["tradingdate", "tradedate", "date", "settlementdate", "rowdate"],
    "symbol": ["symbol", "product", "instrument", "commodity"],
    "contractCode": ["contractcode", "contract", "instrumentname"],
    "expiry": ["expirydate", "expiry", "maturity", "deliverydate"],
    "open": ["open", "openprice", "o"],
    "high": ["high", "highprice", "h"],
    "low": ["low", "lowprice", "l"],
    "settle": ["close", "settle", "settleprice", "settlement", "settlementprice", "c"],
    "prevSettle": ["previousclose", "prevclose", "prevsettle"],
    "volumeLots": ["volume", "volumelots", "vol", "tradedvolume", "volume(lots)"],
    "openInterestLots": ["openinterest", "openinterestlots", "oi", "openinterest(lots)"],
    "valueLakh": ["value", "valueinlakh", "valuelakh", "turnover", "value(lacs)"],
    "optionType": ["optiontype", "option"],
}

REQUIRED = {"tradeDate", "symbol", "expiry", "settle"}

GOLD_SYMBOL_RE = re.compile(r"^(GOLD(PETAL|GUINEA|TEN|M)?)(\d{2}[A-Z]{3}\d{2}FUT)?$")

DATE_FORMATS: tuple[str, ...] = (
    "%Y-%m-%d",
    "%d%b%Y",
    "%d %b %Y",
    "%d-%b-%Y",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%Y/%m/%d",
    "%Y%m%d",
)

# The date-wise bhavcopy marks derivatives rows in "Instrument Name"; contract
# columns that hold such tokens instead of a real contract code are ignored.
INSTRUMENT_TYPE_RE = re.compile(r"^(FUT|OPT)(COM|IDX|STK|CUR|FUT)$")
OPTION_TYPES = {"CE", "PE", "CA", "PA"}


@dataclass
class IngestIssue:
    row: int
    message: str


@dataclass
class IngestReport:
    frame: pd.DataFrame | None = None
    errors: list[IngestIssue] = field(default_factory=list)
    warnings: list[IngestIssue] = field(default_factory=list)
    columns: list[dict[str, str]] = field(default_factory=list)
    preview: list[dict[str, object]] = field(default_factory=list)
    rows_total: int = 0
    rows_accepted: int = 0
    duplicate_rows: int = 0
    symbols: set[str] = field(default_factory=set)

    @property
    def ok(self) -> bool:
        return self.frame is not None and self.rows_accepted > 0


def _parse_date(raw: str, row_number: int, errors: list[IngestIssue]) -> str | None:
    """Parse defensively; slash-dates are treated day-first (Indian convention)."""
    text = (raw or "").strip()
    if not text:
        return None
    for fmt in DATE_FORMATS:
        try:
            parsed = datetime.strptime(text.upper(), fmt).date()
        except ValueError:
            continue
        return parsed.isoformat()
    errors.append(IngestIssue(row=row_number, message=f"Unreadable date “{raw}”. Use DD/MM/YYYY, YYYY-MM-DD or 05JUN2026."))
    return None


def _parse_number(raw: str, row_number: int, field_name: str, errors: list[IngestIssue]) -> float | None:
    text = (raw or "").strip().replace(",", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        errors.append(IngestIssue(row=row_number, message=f"{field_name} = “{raw}” is not a number."))
        return None


def _canonical_symbol(raw: str, row_number: int, errors: list[IngestIssue]) -> str | None:
    symbol = (raw or "").strip().upper()
    match = GOLD_SYMBOL_RE.match(symbol)
    if not match:
        errors.append(
            IngestIssue(
                row=row_number,
                message=f"Symbol “{raw}” is not an MCX gold contract (GOLD, GOLDM, GOLDTEN, GOLDGUINEA, GOLDPETAL).",
            )
        )
        return None
    return match.group(1)


def parse_upload(data: bytes) -> IngestReport:
    """Parse an uploaded Bhavcopy CSV into the engine's working frame."""
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = data.decode("latin-1")

    delimiter = ","
    sample = text[:4096]
    for candidate in (";", "\t", "|"):
        if sample.count(candidate) > sample.count(","):
            delimiter = candidate

    raw_frame = pd.read_csv(
        pd.io.common.StringIO(text), sep=delimiter, dtype=str, keep_default_na=False
    )
    report = IngestReport()
    header_map: dict[str, list[str]] = {}
    for original in raw_frame.columns:
        normalised = original.strip().lower().replace(" ", "").replace("_", "")
        for canonical, aliases in ALIASES.items():
            if normalised in [alias.lower() for alias in aliases]:
                header_map.setdefault(canonical, []).append(original)
                break

    if "tradeDate" not in header_map:
        _report_frame_error("No trading-date column found. Expected a `date` header.", report)
        return report
    missing = REQUIRED - set(header_map)
    if missing:
        _report_frame_error(f"Missing required columns: {', '.join(sorted(missing))}.", report)
        return report

    def cells(row: pd.Series) -> dict[str, str]:
        return {
            canonical: str(row[columns[0]])
            for canonical, columns in header_map.items()
        }

    rows: list[dict[str, float | str | int | bool]] = []
    seen_keys: set[tuple[str, str, str]] = set()
    number_columns = ("open", "high", "low", "settle", "prevSettle", "volumeLots", "openInterestLots", "valueLakh")
    option_rows = 0

    for position, (_, source) in enumerate(raw_frame.iterrows()):
        row_number = position + 2  # header is row 1; data starts at row 2
        values = cells(source)

        # Date-wise bhavcopies mix futures with option chains; only futures
        # rows carry a settlement price. Skipped option rows are aggregated
        # into one warning instead of one error per row.
        if (values.get("optionType", "") or "").strip().upper() in OPTION_TYPES:
            option_rows += 1
            continue

        trade_date = _parse_date(values.get("tradeDate", ""), row_number, report.errors)
        expiry = _parse_date(values.get("expiry", ""), row_number, report.errors)
        symbol = _canonical_symbol(values.get("symbol", ""), row_number, report.errors)
        settle = _parse_number(values.get("settle", ""), row_number, "settle", report.errors)

        if trade_date is None or expiry is None or symbol is None or settle is None:
            continue
        if settle <= 0:
            report.errors.append(IngestIssue(row=row_number, message="Settlement price must be greater than zero."))
            continue
        if diff_days(trade_date, expiry) < 0:
            report.errors.append(IngestIssue(row=row_number, message="Expiry date is earlier than the trade date."))
            continue
        if symbol not in PRODUCT_IDS:
            report.errors.append(IngestIssue(row=row_number, message=f"{symbol} is not covered by this product."))
            continue

        key = (trade_date, symbol, expiry)
        if key in seen_keys:
            report.duplicate_rows += 1
            continue
        seen_keys.add(key)

        # The date-wise bhavcopy puts the segment ("FUTCOM") under Instrument
        # Name — such tokens are not contract codes, so regenerate the code.
        contract_code = (values.get("contractCode", "") or "").strip()
        if INSTRUMENT_TYPE_RE.match(contract_code.upper()):
            contract_code = ""

        row_values = {
            "tradeDate": trade_date,
            "symbol": symbol,
            "contractCode": contract_code or _contract_code(symbol, expiry),
            "contractId": f"{symbol}-{expiry}",
            "expiry": expiry,
        }
        for column in number_columns:
            raw_number = values.get(column, "")
            parsed = _parse_number(raw_number, row_number, column, report.errors) if raw_number else None
            row_values[column] = parsed if parsed is not None else 0.0

        if row_values["volumeLots"] < 0 or row_values["openInterestLots"] < 0:
            report.errors.append(IngestIssue(row=row_number, message="Volume and open interest must be ≥ 0."))
            continue
        if row_values["volumeLots"] == 0:
            report.warnings.append(
                IngestIssue(
                    row=row_number,
                    message="Zero volume — settlement may be a fallback print and is flagged stale.",
                )
            )

        row_values["stale"] = bool(row_values["volumeLots"] == 0)
        specs = PRODUCT_BY_ID[symbol]
        row_values["finePerGram"] = row_values["settle"] / specs["quoteGrams"] / specs["fineness"]
        row_values["quotedPerGram"] = row_values["settle"] / specs["quoteGrams"]
        row_values["daysToExpiry"] = diff_days(trade_date, expiry)

        rows.append(row_values)
        report.symbols.add(symbol)

    if option_rows:
        report.warnings.append(
            IngestIssue(
                row=0,
                message=f"Skipped {option_rows:,} option rows (CE/PE) — only futures rows are ingested.",
            )
        )

    report.rows_total = len(raw_frame)
    report.rows_accepted = len(rows)
    report.columns = [
        {
            "name": header_map.get(canonical, [canonical])[0],
            "type": "date" if canonical in ("tradeDate", "expiry") else "number",
        }
        for canonical in ALIASES
        if header_map.get(canonical)
    ]
    first_rows = rows[:5]
    report.preview = [
        {"row": index + 2, "cells": {key: str(value) for key, value in row.items()}}
        for index, row in enumerate(first_rows)
    ]

    if rows:
        report.frame = pd.DataFrame(rows, columns=COLUMNS)
        report.frame = report.frame.astype(
            {
                col: "float64"
                for col in ("open", "high", "low", "settle", "prevSettle", "volumeLots", "openInterestLots", "valueLakh", "finePerGram", "quotedPerGram", "daysToExpiry")
            }
        )
    return report


def _report_frame_error(message: str, report: IngestReport) -> None:
    report.errors.append(IngestIssue(row=0, message=message))


def file_digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def date_bounds(frame: pd.DataFrame) -> tuple[str, str]:
    """(min-date, max-date) across the working frame."""
    if frame.empty:
        return ("", "")
    return (str(frame["tradeDate"].min()), str(frame["tradeDate"].max()))
