"""Optional LLM narrative layer over the grounded assistant facts.

OpenRouter chat completions. The model never sees raw CSV rows — the caller
passes only engine-computed facts (data status, spread summaries, costs), so
it can annotate and narrate but never contradict the dashboard. Any failure
— missing key, rate limit, network — returns None and the caller falls back
to the deterministic templates. The assistant must never break.
"""

from __future__ import annotations

import json
import os
import urllib.request

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# OpenRouter deprecated the Qwen free tier in Oct 2026. Default to the
# cheapest Qwen instruct model (~$0.10/M tokens), and fall through to a live
# zero-cost model so a credits-free key still produces analysis. Both can be
# overridden with OPENROUTER_MODEL.
DEFAULT_MODELS: tuple[str, ...] = (
    "qwen/qwen3-30b-a3b-instruct-2507",
    "dots-studio/dots-3-note-preview:free",
)

SYSTEM_PROMPT = """\
You are the AURUM IQ research assistant for MCX gold futures. You receive a
compact JSON brief computed by the analytics engine and a user question.

Rules you must not break:
- Use ONLY numbers present in the brief. Never invent, round, or extrapolate.
- If the brief's source is the synthetic seed, say the dashboard is on demo
  data before anything else.
- Explain in plain trader language: residual basis, carry, purity, cost
  hurdle, z-score, trust checks.
- If asked for an overall analysis, structure it as: dataset, what the term
  structure says, the spread picture, cost verdict, data-quality warnings.
- Be concise: at most ~250 words. No investment advice; say what the data
  shows, not what to do.
- Markdown bold for key numbers is fine; do not use headings.
"""


def llm_enabled() -> bool:
    return bool(os.getenv("OPENROUTER_API_KEY"))


def narrate(user_brief: str) -> str | None:
    """Ask the LLM to narrate the grounded brief. None on any failure."""
    key = os.getenv("OPENROUTER_API_KEY", "")
    if not key:
        return None

    first = os.getenv("OPENROUTER_MODEL") or DEFAULT_MODELS[0]
    models = (first, *(m for m in DEFAULT_MODELS if m != first))

    for model in models:
        try:
            payload = json.dumps(
                {
                    "model": model,
                    "temperature": 0.2,
                    "max_tokens": 900,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_brief},
                    ],
                }
            ).encode("utf-8")
            request = urllib.request.Request(OPENROUTER_URL, data=payload, method="POST")
            request.add_header("Authorization", f"Bearer {key}")
            request.add_header("Content-Type", "application/json")
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
            text = str(data["choices"][0]["message"]["content"]).strip()
            if text:
                return text
        except Exception:
            continue  # try the next model in the chain
    return None
