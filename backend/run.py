"""Entry point for the AURUM IQ backend.

    python run.py          # serves app.main:app on PORT (default 8000)

Env: HOST, PORT, CORS_ORIGINS (comma-separated), DEFAULT_CARRY_PCT,
BENCHMARK_RATE_PCT, BROKERAGE_FLAT_INR, BROKERAGE_PCT, STATUTORY_BPS.
"""

import os
import sys

if sys.platform == "win32":
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000") or "8000"),
        reload=False,
        log_level="info",
    )
