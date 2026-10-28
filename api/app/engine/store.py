"""Holds the working dataset: the seed market, or the latest valid upload.

`mode` flips demo → api only after a successful upload — the data-quality
badge in the UI must tell the truth about which market the engine serves.
"""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from app.config import SETTINGS
from app.engine.simulate import build_seed_frame

RAW_DIR = Path(SETTINGS.data_dir) / "raw"
REGISTRY_PATH = Path(SETTINGS.data_dir) / "datasets.json"


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


class DatasetStore:
    """Thread-safe holder of the active frame plus the upload registry."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._active: pd.DataFrame | None = None
        self._mode: str = "demo"
        self._source_label: str = "Synthetic market, seeded to mirror demo parameters"
        self._records: list[UploadRecord] = []
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        self._load_registry()

    # --- registry -----------------------------------------------------------

    def _load_registry(self) -> None:
        if REGISTRY_PATH.exists():
            try:
                payload = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
                self._records = [UploadRecord(**record) for record in payload]
            except Exception:
                self._records = []

    def _save_registry(self) -> None:
        try:
            REGISTRY_PATH.write_text(
                json.dumps([record.to_dict() for record in self._records], indent=2),
                encoding="utf-8",
            )
        except OSError:
            pass

    # --- active dataset -----------------------------------------------------

    @property
    def frame(self) -> pd.DataFrame:
        with self._lock:
            if self._active is None:
                self._active = build_seed_frame()
            return self._active

    @property
    def mode(self) -> str:
        _ = self.frame  # ensure seed is present before reporting mode
        with self._lock:
            return self._mode

    @property
    def source_label(self) -> str:
        _ = self.frame
        with self._lock:
            return self._source_label

    @property
    def records(self) -> list[UploadRecord]:
        with self._lock:
            return list(self._records)

    def set_active(self, frame: pd.DataFrame, mode: str, source_label: str) -> None:
        with self._lock:
            self._active = frame
            self._mode = mode
            self._source_label = source_label

    def add_record(self, record: UploadRecord) -> None:
        with self._lock:
            self._records.append(record)
        self._save_registry()

    def has_digest(self, digest: str) -> bool:
        with self._lock:
            return any(record.sha256 == digest for record in self._records)

    def reset_to_seed(self) -> None:
        with self._lock:
            self._active = None
            self._mode = "demo"
            self._source_label = "Synthetic market, seeded to mirror demo parameters"


STORE = DatasetStore()
