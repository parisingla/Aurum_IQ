"""Serverless persistence: state must survive a cold instance via the mirror.

Uses a fake mirror (same save/load/clear contract as UpstashMirror) so no
network is involved — the fake subclasses the real mirror to prove the
contract stays compatible.
"""

from __future__ import annotations

import json

import pandas as pd

from app.engine import store as store_module
from app.engine.ingest import parse_upload
from app.engine.store import RAW_DIR, DatasetStore, UploadRecord, UpstashMirror

MINI_UPLOAD = RAW_DIR.parent / "raw" / "3f9c19b1c7a89d9b-bhavcopy-mini.csv"


class FakeMirror(UpstashMirror):
    """In-memory blob store with the mirror's exact contract."""

    def __init__(self) -> None:
        super().__init__()
        self.blobs: dict[str, str] = {}
        self.saves = 0
        self.clears = 0

    @property
    def enabled(self) -> bool:
        return True

    def save(self, payload: dict[str, object]) -> None:
        self.saves += 1
        self.blobs[self.KEY] = json.dumps(payload)

    def load(self) -> dict[str, object] | None:
        raw = self.blobs.get(self.KEY)
        return json.loads(raw) if raw else None

    def clear(self) -> None:
        self.clears += 1
        self.blobs.pop(self.KEY, None)


def _mini_record() -> UploadRecord:
    data = MINI_UPLOAD.read_bytes()
    report = parse_upload(data)
    assert report.ok and report.frame is not None
    return UploadRecord(
        dataset_id="ds-test0001",
        filename="bhavcopy-mini.csv",
        sha256="a" * 64,
        mode="api",
        rows=int(len(report.frame)),
        from_date=str(report.frame["tradeDate"].min()),
        to_date=str(report.frame["tradeDate"].max()),
        symbols=sorted(report.symbols),
        errors=0,
        warnings=0,
    )


def _isolated_store(mirror: UpstashMirror, monkeypatch, tmp_path) -> DatasetStore:
    """Point the store at a temp dir so the tracked registry doesn't seed it."""
    monkeypatch.setattr(store_module, "RAW_DIR", tmp_path / "raw")
    monkeypatch.setattr(store_module, "REGISTRY_PATH", tmp_path / "datasets.json")
    return DatasetStore(mirror=mirror)


def test_upload_survives_a_cold_instance(monkeypatch, tmp_path) -> None:
    mirror = FakeMirror()
    warm = _isolated_store(mirror, monkeypatch, tmp_path)

    record = _mini_record()
    warm.add_record(record)
    warm.set_active(parse_upload(MINI_UPLOAD.read_bytes()).frame, "api", "Uploaded bhavcopy-mini.csv")

    cold = _isolated_store(mirror, monkeypatch, tmp_path)  # fresh process, same Redis
    restored = cold.frame
    assert cold.mode == "api"
    assert cold.source_label == "Uploaded bhavcopy-mini.csv"
    # The mirror-restored registry plus the bundled-seed record (a cold store
    # re-activates the bundled bhavcopy whenever no snapshot covers the frame).
    assert record.dataset_id in [r.dataset_id for r in cold.records]
    pd.testing.assert_frame_equal(restored, warm.frame)


def test_reset_clears_the_mirror(monkeypatch, tmp_path) -> None:
    mirror = FakeMirror()
    store = _isolated_store(mirror, monkeypatch, tmp_path)
    store.set_active(store.frame, "api", "Uploaded something.csv")
    assert mirror.blobs

    store.reset_to_seed()
    assert not mirror.blobs

    # Reset means "no active upload" — a cold store falls back to the bundled
    # real bhavcopy (mode api), never straight to the synthetic seed.
    cold = _isolated_store(mirror, monkeypatch, tmp_path)
    assert cold.mode == "api"
    assert "Bundled" in cold.source_label


def test_record_from_dict_accepts_registry_format() -> None:
    """datasets.json stores the to_dict() shape ('id') — loading must work."""
    record = UploadRecord.from_dict(
        {
            "id": "ds-3f9c19b1c7a8",
            "filename": "bhavcopy-mini.csv",
            "sha256": "3f9c19b1c7a89d9b",
            "mode": "api",
            "rows": 3,
            "fromDate": "2026-01-05",
            "toDate": "2026-01-07",
            "symbols": ["GOLDM"],
            "errors": 0,
            "warnings": 0,
        }
    )
    assert record.dataset_id == "ds-3f9c19b1c7a8"
    assert record.rows == 3


def test_disabled_mirror_degrades_to_memory() -> None:
    store = DatasetStore(mirror=UpstashMirror())  # no env vars → disabled
    store.set_active(store.frame, "api", "Uploaded something.csv")
    assert store.mode == "api"  # in-memory state still works
    assert store.source_label == "Uploaded something.csv"
