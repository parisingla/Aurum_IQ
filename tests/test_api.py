"""End-to-end API tests: every documented route answers with zod-shaped JSON.

The engine's default dataset is the bundled real MCX bhavcopy
(api/data/seed/BhavCopyDateWise_27102026.csv) — served as `api` mode from a
cold start, before any upload. Only when that file is missing does the
synthetic seed (mode "demo") take over.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.engine.store import STORE
from app.main import create_app


@pytest.fixture(scope="module")
def client() -> TestClient:
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
    STORE.reset_to_seed()


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["mode"] == "api"  # bundled real bhavcopy, not the synthetic seed


def test_data_status(client: TestClient) -> None:
    payload = client.get("/api/data/status").json()
    assert payload["source"] == "api"
    assert 0 <= payload["trustScore"] <= 100
    assert len(payload["checks"]) == 7
    # Checks are structural and honest, not required to all pass: the real 27
    # Oct 2026 bhavcopy carries cross-contract residuals, so the
    # ₹/g-agreement check is allowed to fail while the score reports it.
    for check in payload["checks"]:
        assert set(check) == {"label", "passed", "detail"}
        assert isinstance(check["passed"], bool)
        assert check["label"] and check["detail"]


def test_contracts_route(client: TestClient) -> None:
    payload = client.get("/api/contracts", params={"sort": "volume"}).json()
    assert payload
    first = payload[0]
    required = {
        "id", "symbol", "contractCode", "productId", "expiry", "lastTradingDay",
        "tenderStart", "tradeDate", "settle", "open", "high", "low", "prevSettle",
        "volumeLots", "openInterestLots", "valueLakh", "stale", "finePerGram",
        "quotedPerGram", "daysToExpiry",
    }
    assert required <= set(first)
    filtered = client.get("/api/contracts", params={"product": "GOLDM"}).json()
    assert {row["productId"] for row in filtered} == {"GOLDM"}
    stale_only = client.get("/api/contracts", params={"stale": "true"}).json()
    assert all(row["stale"] for row in stale_only)


def test_instruments(client: TestClient) -> None:
    payload = client.get("/api/instruments").json()
    assert len(payload) == 5


def test_relative_value_route(client: TestClient) -> None:
    payload = client.get(
        "/api/analytics/relative-value",
        params={"legA": "GOLDM", "legB": "GOLDPETAL", "range": "6M"},
    ).json()
    summary = payload["summary"]
    for field in (
        "pairKey", "legA", "legB", "window", "observations", "currentBps",
        "zscore", "madZ", "percentile", "purityBps", "carryBps", "residualBps",
        "roundTripCostBps", "expectedEdgeBps", "halfLifeDays", "staleDays",
    ):
        assert field in summary
    assert len(payload["points"]) == summary["observations"]
    point = payload["points"][-1]
    assert {"date", "basisBps", "zscore", "madZ", "percentile"} <= set(point)
    # GOLDM (995) vs GOLDPETAL (999): the purity term is −log(999/995)·10⁴.
    assert abs(payload["summary"]["purityBps"] - (-40.14)) < 1.0

    bad = client.get(
        "/api/analytics/relative-value",
        params={"legA": "GOLDM", "legB": "GOLDM", "range": "6M"},
    )
    assert bad.status_code == 422


def test_term_structure_route(client: TestClient) -> None:
    payload = client.get("/api/analytics/term-structure").json()
    assert payload["asOf"]
    assert payload["benchmarkRatePct"] == pytest.approx(6.6)
    assert len(payload["curves"]) == 5
    for curve in payload["curves"]:
        assert {"productId", "name", "points", "impliedCarryPct"} <= set(curve)
        assert curve["points"]


def test_alerts_route(client: TestClient) -> None:
    payload = client.get("/api/alerts").json()
    assert payload
    severities = {alert["severity"] for alert in payload}
    assert severities <= {"critical", "warning", "info"}
    for alert in payload:
        assert {"id", "severity", "productId", "pairLabel", "title", "summary", "evidence", "confidence",
                "timestamp", "zscore", "status"} <= set(alert)


def test_backtest_lifecycle(client: TestClient) -> None:
    params = {
        "legA": "GOLDM",
        "legB": "GOLDPETAL",
        "entryZ": 2,
        "exitZ": 0.5,
        "windowDays": 60,
        "costMultiplier": 1,
        "trainDays": 250,
        "testDays": 40,
    }
    result = client.post("/api/backtests", json=params)
    assert result.status_code == 200
    payload = result.json()
    assert payload["status"] == "complete"
    assert payload["metrics"]["verdict"] in {"no edge", "inconclusive", "robust"}
    assert "UPLOAD DATA" in " ".join(payload["limitations"])
    fetched = client.get(f"/api/backtests/{payload['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == payload["id"]

    invalid = client.post("/api/backtests", json={**params, "entryZ": 9})
    assert invalid.status_code == 422
    invalid = client.post("/api/backtests", json={**params, "exitZ": 3})
    assert invalid.status_code == 422


def test_prices_route(client: TestClient) -> None:
    payload = client.get("/api/prices", params={"product": "GOLDM", "days": 60}).json()
    assert payload["productId"] == "GOLDM"
    assert payload["points"]
    point = payload["points"][-1]
    assert {"date", "settle", "volumeLots", "openInterestLots", "stale"} <= set(point)
    missing = client.get("/api/prices", params={"product": "NOSUCH"})
    assert missing.status_code == 404


def test_watchlist_route(client: TestClient) -> None:
    payload = client.get("/api/watchlist").json()
    assert len(payload) == 5
    assert {row["productId"] for row in payload} == {
        "GOLD", "GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"
    }


def test_methodology_route(client: TestClient) -> None:
    payload = client.get("/api/methodology").json()
    docs = payload["docs"]
    ids = {doc["id"] for doc in docs}
    assert {"data-pipeline", "normalisation", "signal-math", "costs", "alerts", "validation", "limitations", "sources"} <= ids


def test_assistant_route(client: TestClient) -> None:
    payload = client.post("/api/assistant/query", json={"question": "what does the z-score mean?"}).json()
    assert payload["answer"]
    assert payload["citations"]
    assert payload["dataNotes"]
    empty = client.post("/api/assistant/query", json={})
    assert empty.status_code == 422


def test_upload_round_trip_flips_mode_to_api(client: TestClient) -> None:
    csv = (
        "TradeDate,Contract,Symbol,Expiry,Open,High,Low,Close,Volume,Open Interest,Value\n"
        "2026-01-05,GOLDM05FEB26FUT,GOLDM,2026-02-05,86400,86500,86300,86444,13200,51000,1139056.8\n"
        "2026-01-06,GOLDM05FEB26FUT,GOLDM,2026-02-05,86500,86600,86400,86512,14000,51500,1211188.8\n"
        "2026-01-07,GOLDM05FEB26FUT,GOLDM,2026-02-05,86600,86700,86500,86589,15100,52000,-1\n"
    ).replace(",-1", ",1")
    response = client.post(
        "/api/datasets/upload", files={"file": ("bhavcopy-mini.csv", csv.encode("utf-8"), "text/csv")}
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["status"] == "accepted"
    assert payload["dataset"]["mode"] == "api"
    assert payload["report"]["rowsAccepted"] == 3

    status = client.get("/api/data/status").json()
    assert status["source"] == "api"
    assert "bhavcopy-mini.csv" in status["ingestPath"]

    again = client.post(
        "/api/datasets/upload", files={"file": ("bhavcopy-mini.csv", csv.encode("utf-8"), "text/csv")}
    )
    assert again.status_code == 409

    listing = client.get("/api/datasets").json()
    assert any(entry["mode"] == "api" for entry in listing)

    broken = client.post(
        "/api/datasets/upload", files={"file": ("broken.csv", b"no,columns,here\n1,2,3\n", "text/csv")}
    )
    assert broken.status_code == 422

    reset = client.post("/api/datasets/reset")
    assert reset.status_code == 200
    # Reset re-activates the bundled real bhavcopy, not the synthetic seed.
    assert client.get("/api/data/status").json()["source"] == "api"
