"""Vercel entrypoint for the AURUM IQ engine.

Each request under /api/* reaches this ASGI app; the FastAPI router matches
the full original path (api/index.py is bundled with the whole api/ package).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import create_app  # noqa: E402

app = create_app()
