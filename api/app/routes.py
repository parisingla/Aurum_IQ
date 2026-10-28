"""FastAPI surface for AURUM IQ.

Every response matches the zod schemas in the frontend's src/lib/validation.ts,
so the demo fixtures and this API are drop-in interchangeable. Errors are
HTTPException(422/404/409) with plain-English detail messages.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import RedirectResponse

from app.assistant import AssistantEngine
from app.engine import alerts as alerts_engine
from app.engine import term as term_engine
from app.engine.backtest import run_backtest
from app.engine.ingest import date_bounds, file_digest, parse_upload
from app.engine.relative_value import build_spread_points, get_spread_series
from app.llm import llm_enabled, narrate
from app.engine.simulate import AS_OF
from app.engine.store import RAW_DIR, STORE, UploadRecord
from app.engine.status import build_data_status, build_watchlist
from app.engine.term import contract_history, front_series, term_structure
from app.engine.view_contracts import contract_rows, price_series
from app.methodology import methodology_docs
from app.products import PRODUCT_IDS, PRODUCT_SPECS

router = APIRouter()

_BACKTESTS: dict[str, dict] = {}


def _frame():
    return STORE.frame


def _spread_series(leg_a: str, leg_b: str, window: str):
    return get_spread_series(_frame(), leg_a, leg_b, window)


def _data_status():
    return build_data_status(_frame(), STORE.mode, STORE.source_label)


def _alerts():
    frame = _frame()
    return alerts_engine.get_alerts(
        frame,
        lambda fr, leg_a, leg_b, window: get_spread_series(fr, leg_a, leg_b, window),
    )


assistant = AssistantEngine(
    frame=_frame,
    spread_series_fn=_spread_series,
    data_status_fn=_data_status,
    alerts_fn=_alerts,
    backtests=lambda: list(_BACKTESTS.values()),
)


# --- health & meta -----------------------------------------------------------

@router.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    """Human-friendly entry point — the API itself lives under /api."""
    return RedirectResponse(url="/docs")


@router.get("/health")
def health() -> dict[str, Any]:
    frame = STORE.frame
    return {
        "ok": True,
        "mode": STORE.mode,
        "asOf": str(frame["tradeDate"].max()) if not frame.empty else AS_OF,
        "rows": int(len(frame)),
    }


@router.get("/api/instruments")
def instruments() -> list[dict[str, Any]]:
    return [dict(item) for item in PRODUCT_SPECS]


@router.get("/api/spot")
def spot_anchor(days: int = 60) -> dict[str, Any]:
    """Exposure of the synthetic spot path — dashboard hero chart."""
    from app.engine.simulate import _SpotPath

    path = _SpotPath()
    frame = STORE.frame
    dates = sorted(frame["tradeDate"].unique()) if not frame.empty else []
    series = []
    for date in dates[-days:]:
        value = path.at(str(date))
        if value is None:
            continue
        series.append({"date": str(date), "price": round(value, 2)})
    if not series:
        return {"date": AS_OF, "pricePerGram": 0.0, "pricePer10g": 0.0, "changePct": 0.0, "series": []}
    last, prev = series[-1]["price"], series[-2]["price"] if len(series) > 1 else series[-1]["price"]
    return {
        "date": series[-1]["date"],
        "pricePerGram": last,
        "pricePer10g": round(last * 10, 2),
        "changePct": 0.0 if prev == 0 else (last - prev) / prev * 100,
        "series": series,
    }


# --- data status & watchlist ---------------------------------------------------

@router.get("/api/data/status")
def data_status() -> dict[str, Any]:
    return _data_status()


@router.get("/api/watchlist")
def watchlist() -> list[dict[str, Any]]:
    return build_watchlist(_frame())


# --- contracts ---------------------------------------------------------------

@router.get("/api/contracts")
def contracts(
    product: str | None = None,
    q: str | None = None,
    stale: bool = False,
    sort: str = "expiry",
) -> list[dict[str, Any]]:
    rows = contract_rows(_frame())
    if product:
        rows = [row for row in rows if row["productId"] == product]
    if q:
        needle = q.lower()
        rows = [
            row
            for row in rows
            if needle in str(row["contractCode"]).lower() or needle in str(row["productId"]).lower()
        ]
    if stale:
        rows = [row for row in rows if row["stale"]]
    keys = {
        "expiry": lambda row: (str(row["expiry"]), int(row["daysToExpiry"])),
        "volume": lambda row: -int(row["volumeLots"]),
        "oi": lambda row: -int(row["openInterestLots"]),
        "settle": lambda row: -float(row["settle"]),
    }
    if sort not in keys:
        raise HTTPException(status_code=422, detail=f"sort must be one of {sorted(keys)}")
    return sorted(rows, key=keys[sort])


@router.get("/api/prices")
def prices(product: str, contract: str | None = None, days: int = 120) -> dict[str, Any]:
    if product not in PRODUCT_IDS:
        raise HTTPException(status_code=404, detail=f"Unknown product {product}.")
    series = price_series(_frame(), product, contract, days)
    if series is None:
        raise HTTPException(status_code=404, detail="No rows for that contract in the current dataset.")
    return series


@router.get("/api/contracts/{contract_id}/history")
def contract_history_route(contract_id: str, days: int = 250) -> list[dict[str, Any]]:
    return contract_history(_frame(), contract_id, days)


# --- analytics ---------------------------------------------------------------

@router.get("/api/analytics/relative-value")
def relative_value(legA: str, legB: str, range: str = "6M") -> dict[str, Any]:
    if legA not in PRODUCT_IDS or legB not in PRODUCT_IDS:
        raise HTTPException(status_code=404, detail="Unknown product id.")
    if legA == legB:
        raise HTTPException(status_code=422, detail="legA and legB must be different.")
    if range not in {"1M", "3M", "6M", "1Y", "ALL"}:
        raise HTTPException(status_code=422, detail=f"range must be one of 1M, 3M, 6M, 1Y, ALL (got {range}).")
    series = _spread_series(legA, legB, range)
    if series is None:
        raise HTTPException(status_code=404, detail="No common sessions for this pair in the current dataset.")
    return series


@router.get("/api/analytics/term-structure")
def term_structure_route() -> dict[str, Any]:
    return term_structure(_frame())


@router.get("/api/analytics/front-series")
def front_series_route(product: str, days: int = 120) -> list[dict[str, Any]]:
    if product not in PRODUCT_IDS:
        raise HTTPException(status_code=404, detail=f"Unknown product {product}.")
    return front_series(_frame(), product, days)


# --- alerts -------------------------------------------------------------------

@router.get("/api/alerts")
def alerts() -> list[dict[str, Any]]:
    return _alerts()


# --- backtests ----------------------------------------------------------------

def _validate_backtest_params(params: dict[str, Any]) -> dict[str, Any]:
    if params.get("legA") not in PRODUCT_IDS or params.get("legB") not in PRODUCT_IDS:
        raise HTTPException(status_code=422, detail="legA/legB must be known product ids.")
    if params["legA"] == params["legB"]:
        raise HTTPException(status_code=422, detail="legA and legB must be different.")
    bounds = {
        "entryZ": (1, 4), "exitZ": (-1, 2), "windowDays": (20, 250),
        "costMultiplier": (0.5, 3), "trainDays": (120, 400), "testDays": (20, 120),
    }
    for key, (low, high) in bounds.items():
        value = params.get(key)
        if not isinstance(value, (int, float)):
            raise HTTPException(status_code=422, detail=f"{key} must be a number.")
        if not low <= value <= high:
            raise HTTPException(status_code=422, detail=f"{key}={value} outside {low}..{high}.")
    if params["exitZ"] >= params["entryZ"]:
        raise HTTPException(status_code=422, detail="exitZ must sit below entryZ.")
    return params


@router.post("/api/backtests")
def create_backtest(params: dict[str, Any]) -> dict[str, Any]:
    params = _validate_backtest_params(params)
    frame = _frame()
    series = _spread_series(str(params["legA"]), str(params["legB"]), "ALL")
    if series is None:
        raise HTTPException(status_code=404, detail="No spread series for this pair.")
    round_trip = float(series["summary"]["roundTripCostBps"])
    half_life_days = float(series["summary"]["halfLifeDays"])
    as_of = str(frame["tradeDate"].max()) if not frame.empty else AS_OF

    def spread_points(leg_a: str, leg_b: str, window: str) -> list[dict[str, Any]]:
        return build_spread_points(_frame(), leg_a, leg_b)

    result = run_backtest(dict(params), spread_points, round_trip, half_life_days, as_of, STORE.mode == "demo")
    _BACKTESTS[result["id"]] = result
    return result


@router.get("/api/backtests/{backtest_id}")
def get_backtest(backtest_id: str) -> dict[str, Any]:
    found = _BACKTESTS.get(backtest_id)
    if found is None:
        raise HTTPException(status_code=404, detail=f"No backtest with id {backtest_id} in this session.")
    return found


# --- datasets -------------------------------------------------------------------

@router.post("/api/datasets/upload")
async def upload_dataset(file: UploadFile) -> dict[str, Any]:
    data = await file.read()
    digest = file_digest(data)

    if STORE.has_digest(digest):
        raise HTTPException(status_code=409, detail="This exact file was already uploaded (sha256 match).")

    report = await run_in_threadpool(parse_upload, data)
    if not report.ok:
        errors = [f"row {issue.row}: {issue.message}" for issue in report.errors[:20]]
        raise HTTPException(status_code=422, detail={"message": "Upload rejected", "errors": errors})

    frame = report.frame
    assert frame is not None
    digest12 = digest[:12]
    dataset_id = f"ds-{digest12}"
    from_date, to_date = date_bounds(frame)

    # Keep the raw file for the preview endpoint when the filesystem is
    # writable (local dev). On Vercel it is read-only — the parsed rows live
    # in the store's mirror instead, and preview 404s gracefully.
    safe_name = (file.filename or "upload.csv").replace("\\", "_").replace("/", "_").replace(" ", "_")
    raw_path = RAW_DIR / f"{digest[:16]}-{safe_name}"
    try:
        raw_path.write_bytes(data)
    except OSError:
        pass

    record = UploadRecord(
        dataset_id=dataset_id,
        filename=file.filename or "upload.csv",
        sha256=digest,
        mode="api",
        rows=int(len(frame)),
        from_date=from_date,
        to_date=to_date,
        symbols=sorted(report.symbols),
        errors=len(report.errors),
        warnings=len(report.warnings),
    )
    STORE.add_record(record)
    STORE.set_active(
        frame,
        "api",
        f"Uploaded {record.filename} ({record.rows:,} rows, {from_date}→{to_date})",
    )

    return {
        "status": "accepted",
        "report": {
            "rowsTotal": report.rows_total,
            "rowsAccepted": report.rows_accepted,
            "duplicateRows": report.duplicate_rows,
            "errors": [issue.__dict__ for issue in report.errors[:50]],
            "warnings": [issue.__dict__ for issue in report.warnings[:50]],
            "columns": report.columns,
            "preview": report.preview,
            "symbols": sorted(report.symbols),
        },
        "dataset": record.to_dict(),
        "dataStatusId": dataset_id,
    }


@router.get("/api/datasets")
def datasets() -> list[dict[str, Any]]:
    return [record.to_dict() for record in STORE.records]


@router.post("/api/datasets/reset")
def reset_dataset() -> dict[str, Any]:
    STORE.reset_to_seed()
    return {"status": "reset", "mode": STORE.mode}


@router.get("/api/datasets/{dataset_id}/preview")
def dataset_preview(dataset_id: str, rows: int = 20) -> dict[str, Any]:
    found = next((record for record in STORE.records if record.dataset_id == dataset_id), None)
    if found is None:
        raise HTTPException(status_code=404, detail=f"Unknown dataset {dataset_id}.")
    safe_name = found.filename.replace("\\", "_").replace("/", "_").replace(" ", "_")
    path = RAW_DIR / f"{found.sha256[:16]}-{safe_name}"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Raw rows not kept for this dataset.")
    return {
        "dataset": found.to_dict(),
        "path": str(path),
        "sha256": found.sha256,
        "note": "Preview streams from backend/data/raw on demand.",
    }


# --- methodology & assistant -----------------------------------------------------

@router.get("/api/methodology")
def methodology() -> dict[str, Any]:
    return {"docs": methodology_docs()}


@router.post("/api/assistant/query")
def assistant_query(payload: dict[str, Any]) -> dict[str, Any]:
    question = str(payload.get("question", "")).strip()
    if not question:
        raise HTTPException(status_code=422, detail="question is required.")

    use_llm = bool(payload.get("useLlm"))
    if use_llm and llm_enabled():
        brief = assistant.grounded_brief()
        user_brief = f"{json.dumps(brief, indent=1, default=str)}\n\nQuestion: {question}"
        narrative = narrate(user_brief)
        if narrative:
            base = assistant.answer(question)  # citations + dataNotes stay engine-owned
            return {**base, "answer": narrative, "confidence": 0.75, "mode": "llm"}
        # LLM unreachable / out of credits → deterministic template below

    return {**assistant.answer(question), "mode": "template"}
