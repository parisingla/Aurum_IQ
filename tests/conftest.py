"""Put the engine package (api/app) on sys.path for the whole test suite."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))
