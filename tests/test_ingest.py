"""Upload parsing: every dropped row is reported, nothing is silently fixed."""

from __future__ import annotations

import io

from app.engine.ingest import file_digest, parse_upload

CSV_OK = """TradeDate,Contract,Symbol,Expiry,Open,High,Low,Close,Volume,Open Interest,Value
2026-01-05,GOLDM05JAN26FUT,GOLDM,2026-01-05,86210,86300,86150,86277,16240,58840,1400988.16
2026-01-05,GOLDPETAL30JAN26FUT,GOLDPETAL,2026-01-30,14780,14790,14770,14783,46060,58690,683.36
2026-01-05,SILVER05MAR26FUT,SILVER,2026-03-05,92800,93000,92700,92912,1200,4000,1114944.00
2026-01-05,GOLDM05FEB26FUT,GOLDM,2026-02-05,86400,86500,86300,86444,13200,51000,1139056.80
"""
# Row 3 (silver) is rejected; the others are accepted.
CSV_MUTED = CSV_OK.replace("16240", "0").replace("13200", "0")
CSV_BAD_DATE = CSV_OK.replace("2026-01-05,GOLDM05JAN26FUT", "05/01/2026 ,GOLDM05JAN26FUT")
CSV_EXPIRY_EARLY = CSV_OK.replace("2026-02-05", "2025-02-01")
CSV_NEGATIVE_OI = CSV_OK.replace("58840", "-5")
CSV_INDIAN_DATE = CSV_OK.replace("2026-01-05,GOLDM05JAN26FUT", "05-01-2026,GOLDM05JAN26FUT")


def test_mixed_quality_upload_reports_everything() -> None:
    report = parse_upload(CSV_OK.encode("utf-8"))
    assert report.ok
    assert report.rows_total == 4
    assert report.rows_accepted == 3
    assert report.symbols == {"GOLDM", "GOLDPETAL"}
    messages = " | ".join(issue.message for issue in report.errors)
    assert "SILVER" in messages
    frame = report.frame
    assert frame is not None
    assert set(frame.columns) >= {"tradeDate", "symbol", "expiry", "settle", "volumeLots", "stale", "finePerGram"}
    assert 0.0 < float(frame["finePerGram"].iloc[0]) < 50000.0


def test_stale_rows_are_flagged_with_warning() -> None:
    report = parse_upload(CSV_MUTED.encode("utf-8"))
    assert report.ok
    assert len(report.warnings) >= 2
    frame = report.frame
    flag = frame.loc[(frame["tradeDate"] == "2026-01-05") & (frame["contractCode"] == "GOLDM05FEB26FUT"), "stale"].item()
    assert bool(flag)


def test_indian_slash_dates_parse() -> None:
    report = parse_upload(CSV_BAD_DATE.encode("utf-8"))
    assert report.ok
    frame = report.frame
    first = frame.iloc[0]
    assert str(first["tradeDate"]) == "2026-01-05"
    assert str(first["expiry"]) == "2026-01-05"


def test_dashed_indian_dates_parse() -> None:
    report = parse_upload(CSV_INDIAN_DATE.encode("utf-8"))
    assert report.ok
    frame = report.frame
    assert str(frame.iloc[0]["tradeDate"]) == "2026-01-05"


def test_expiry_before_trade_date_rejected() -> None:
    report = parse_upload(CSV_EXPIRY_EARLY.encode("utf-8"))
    messages = " | ".join(issue.message for issue in report.errors)
    assert "Expiry date is earlier than the trade date" in messages
    # SILVER and the early-expiry GOLDM row are both rejected.
    assert report.rows_accepted == 2


def test_negative_oi_rejected() -> None:
    report = parse_upload(CSV_NEGATIVE_OI.encode("utf-8"))
    messages = " | ".join(issue.message for issue in report.errors)
    assert "≥ 0" in messages
    # SILVER is not a gold contract and the negative-OI GOLDM row is rejected.
    assert report.rows_accepted == 2


def test_duplicate_keys_dropped() -> None:
    doubled = CSV_OK + CSV_OK.splitlines()[1] + "\n"
    report = parse_upload(doubled.encode("utf-8"))
    assert report.duplicate_rows == 1
    assert report.rows_accepted == 3


def test_missing_required_columns_clear_error() -> None:
    report = parse_upload(b"TradeDate,Close\n2026-01-05,86277\n")
    assert not report.ok
    messages = " | ".join(issue.message for issue in report.errors)
    assert "Missing required columns" in messages


CSV_OFFICIAL = (
    "Date,Instrument Name,Symbol,Expiry Date,Option Type,Strike Price,Open,High,Low,Close,"
    "Previous Close,Volume(Lots),Volume(In 000's),Value(Lacs),Open Interest(Lots)\n"
    '"27 Oct 2026","FUTCOM","GOLD         ","04DEC2026","-","0",'
    '"142581.00","144265.00","142100.00","144138.00","143073.00","5932","5932.000 GRMS  ","848538.42","15622"\n'
    '"27 Oct 2026","OPTFUT","GOLD         ","30OCT2026","CE","196500","","","","0.50","0.50","0","0.000 GRMS  ","0.00","0"\n'
    '"27 Oct 2026","FUTCOM","ALUMINI      ","30OCT2026","-","0",'
    '"329.45","335.85","328.90","334.10","330.70","2097","2097.000 KGS  ","6970.11","297"\n'
)


def test_official_datewise_bhavcopy_format() -> None:
    """The mcxindia date-wise download: spaced dates, FUTCOM rows, option chains."""
    report = parse_upload(CSV_OFFICIAL.encode("utf-8"))
    assert report.ok
    assert report.rows_total == 3
    assert report.rows_accepted == 1  # option row and non-gold futures dropped
    assert any("option rows" in warning.message for warning in report.warnings)
    frame = report.frame
    row = frame.iloc[0]
    assert str(row["tradeDate"]) == "2026-10-27"
    assert str(row["expiry"]) == "2026-12-04"
    assert float(row["settle"]) == 144138.0
    assert float(row["volumeLots"]) == 5932.0  # Volume(Lots), not the gram-weighted column
    assert float(row["openInterestLots"]) == 15622.0
    assert not bool(row["stale"])
    assert str(row["contractCode"]) == "GOLD04DEC26"  # regenerated, not the segment token
    assert float(row["finePerGram"]) == 144138.0 / 10 / 0.995


def test_file_digest_is_stable() -> None:
    data = b"identical"
    assert file_digest(data) == file_digest(data)
