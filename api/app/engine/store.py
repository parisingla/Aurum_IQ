"""Holds the working dataset: whatever the user uploaded, nothing else.

There is no bundled or synthetic fallback market — a fresh instance has no
dataset until a CSV is uploaded, and every engine route answers 503 until
then. `mode` is "empty" before the first upload and "api" once real MCX
settlements are loaded; the UI must tell the truth about which it serves.

Serverless note: Vercel Python functions keep no state between invocations
and mount a read-only filesystem. When Upstash Redis credentials are present
(the Vercel Storage → Upstash integration injects UPSTASH_REDIS_REST_URL and
UPSTASH_REDIS_REST_TOKEN), every state change — upload, reset — is mirrored
to Redis and a cold instance restores it before reporting "empty". Without
credentials the store is in-memory, for local dev.
"""

from __future__ import annotations

import json
import os
import threading
import urllib.request
from dataclasses import dataclass
from io import StringIO
from pathlib import Path

import pandas as pd

from app.config import SETTINGS

RAW_DIR = Path(SETTINGS.data_dir) / "raw"
REGISTRY_PATH = Path(SETTINGS.data_dir) / "datasets.json"


class EmptyDatasetError(RuntimeError):
    """Raised when the engine is asked for data before any CSV is uploaded."""

# The float columns lose their dtype in a JSON round-trip when a value is
# integral; re-assert them on restore.
_FLOAT_COLUMNS = (
    "open", "high", "low", "settle", "prevSettle",
    "volumeLots", "openInterestLots", "valueLakh",
    "finePerGram", "quotedPerGram", "daysToExpiry",
)


@dataclass
class UploadRecord:
    dataset_id: str
    filename: str
    sha256: str
    mode: str
    rows: int
    from_date: str
    to_date: str
    symbols: list[str]
    errors: int
    warnings: int

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.dataset_id,
            "filename": self.filename,
            "sha256": self.sha256[:12],
            "mode": self.mode,
            "rows": self.rows,
            "fromDate": self.from_date,
            "toDate": self.to_date,
            "symbols": self.symbols,
            "errors": self.errors,
            "warnings": self.warnings,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, object]) -> UploadRecord:
        return cls(
            dataset_id=str(payload.get("id") or payload.get("dataset_id") or ""),
            filename=str(payload.get("filename", "upload.csv")),
            sha256=str(payload.get("sha256", "")),
            mode=str(payload.get("mode", "api")),
            rows=int(payload.get("rows", 0) or 0),
            from_date=str(payload.get("fromDate", "")),
            to_date=str(payload.get("toDate", "")),
            symbols=list(payload.get("symbols") or []),  # type: ignore[arg-type]
            errors=int(payload.get("errors", 0) or 0),
            warnings=int(payload.get("warnings", 0) or 0),
        )


class UpstashMirror:
    """Talks to an Upstash Redis REST endpoint with the standard library.

    REST shape: `{url}/set/{key}` takes the value in the POST body (values
    here exceed URL limits), `{url}/get/{key}` returns `{"result": ...}`.
    All failures degrade to "mirror disabled" — the in-memory store keeps
    working; persistence is best-effort by design.
    """

    KEY = "aurum:dataset:v1"

    def __init__(self) -> None:
        self.url = (os.getenv("UPSTASH_REDIS_REST_URL") or "").rstrip("/")
        self.token = os.getenv("UPSTASH_REDIS_REST_TOKEN") or ""

    @property
    def enabled(self) -> bool:
        return bool(self.url and self.token)

    def _call(self, method: str, path: str, body: bytes | None = None) -> object:
        request = urllib.request.Request(f"{self.url}{path}", data=body, method=method)
        request.add_header("Authorization", f"Bearer {self.token}")
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))

    def save(self, payload: dict[str, object]) -> None:
        if not self.enabled:
            return
        try:
            self._call("POST", f"/set/{self.KEY}", body=json.dumps(payload).encode("utf-8"))
        except Exception:
            pass

    def load(self) -> dict[str, object] | None:
        if not self.enabled:
            return None
        try:
            result = self._call("GET", f"/get/{self.KEY}")
            raw = result.get("result") if isinstance(result, dict) else None  # type: ignore[union-attr]
            return json.loads(raw) if raw else None
        except Exception:
            return None

    def clear(self) -> None:
        if not self.enabled:
            return
        try:
            self._call("POST", f"/del/{self.KEY}")
        except Exception:
            pass


class DatasetStore:
    """Thread-safe holder of the active frame plus the upload registry."""

    def __init__(self, mirror: UpstashMirror | None = None) -> None:
        self._mirror = mirror or UpstashMirror()
        self._lock = threading.RLock()
        self._active: pd.DataFrame | None = None
        self._mode: str = "empty"
        self._source_label: str = ""
        self._records: list[UploadRecord] = []
        self._restored = False
        self._ensure_writable_dir()
        self._load_registry()

    def _ensure_writable_dir(self) -> None:
        try:
            RAW_DIR.mkdir(parents=True, exist_ok=True)
        except OSError:
            pass  # read-only filesystem (Vercel) — raw files are optional

    # --- persistence ----------------------------------------------------------

    def _snapshot(self) -> dict[str, object]:
        if self._active is None:
            # The empty state is a real state: mirror it so a reset propagates.
            return {
                "version": 1,
                "records": [record.to_dict() for record in self._records],
                "active": None,
            }
        return {
            "version": 1,
            "records": [record.to_dict() for record in self._records],
            "active": {
                "mode": self._mode,
                "sourceLabel": self._source_label,
                "frame": self._active.to_json(orient="split"),
            },
        }

    def _apply_snapshot(self, data: dict[str, object]) -> bool:
        try:
            records_raw = data.get("records")
            assert isinstance(records_raw, list)
            self._records = [UploadRecord.from_dict(record) for record in records_raw]
            active = data.get("active")
            if active is None:  # mirrored empty state — stay empty
                self._active = None
                self._mode = "empty"
                self._source_label = ""
                return True
            assert isinstance(active, dict)
            frame = pd.read_json(
                StringIO(str(active["frame"])),
                orient="split",
                dtype=True,
                convert_dates=False,
            )
            frame = frame.astype({column: "float64" for column in _FLOAT_COLUMNS if column in frame.columns})
            if "stale" in frame.columns:
                frame["stale"] = frame["stale"].astype(bool)
            self._active = frame
            self._mode = str(active.get("mode", "api"))
            self._source_label = str(active.get("sourceLabel", ""))
            return True
        except Exception:
            return False  # corrupt snapshot → stay empty, never invent data

    def _ensure_restored(self) -> None:
        """Restore the mirrored state once per process, before anything else."""
        if self._restored:
            return
        self._restored = True
        if not self._mirror.enabled or self._active is not None:
            return
        snapshot = self._mirror.load()
        if snapshot:
            self._apply_snapshot(snapshot)

    # --- registry -----------------------------------------------------------

    def _load_registry(self) -> None:
        if not REGISTRY_PATH.exists():
            return
        try:
            payload = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
            self._records = [UploadRecord.from_dict(record) for record in payload]
        except Exception:
            self._records = []

    def _save_registry(self) -> None:
        try:
            REGISTRY_PATH.write_text(
                json.dumps([record.to_dict() for record in self._records], indent=2),
                encoding="utf-8",
            )
        except OSError:
            pass  # read-only filesystem (Vercel) — the mirror is the registry

    # --- active dataset -----------------------------------------------------

    @property
    def frame(self) -> pd.DataFrame:
        with self._lock:
            self._ensure_restored()
            if self._active is None:
                raise EmptyDatasetError("No dataset loaded — upload a bhavcopy CSV first.")
            return self._active

    @property
    def mode(self) -> str:
        with self._lock:
            self._ensure_restored()
            return self._mode if self._active is not None else "empty"

    @property
    def source_label(self) -> str:
        with self._lock:
            self._ensure_restored()
            return self._source_label if self._active is not None else "No dataset loaded"

    @property
    def records(self) -> list[UploadRecord]:
        with self._lock:
            self._ensure_restored()
            return list(self._records)

    def set_active(self, frame: pd.DataFrame, mode: str, source_label: str) -> None:
        with self._lock:
            self._active = frame
            self._mode = mode
            self._source_label = source_label
            self._restored = True
        self._save_state()

    def add_record(self, record: UploadRecord) -> None:
        with self._lock:
            self._records.append(record)
        self._save_registry()
        self._save_state()

    def _save_state(self) -> None:
        with self._lock:
            snapshot = self._snapshot()
        self._mirror.save(snapshot)

    def has_digest(self, digest: str) -> bool:
        with self._lock:
            self._ensure_restored()
            return any(record.sha256 == digest for record in self._records)

    def clear(self) -> None:
        """Forget everything — dataset and upload history — until an upload.

        Records are forgotten too, so re-uploading the very same CSV after a
        reset is accepted instead of hitting the sha256 dedup guard.
        """
        with self._lock:
            self._active = None
            self._mode = "empty"
            self._source_label = ""
            self._records = []
        self._save_state()


STORE = DatasetStore()
