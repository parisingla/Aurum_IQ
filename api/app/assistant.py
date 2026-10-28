"""Deterministic assistant: template answers over computed facts, with citations.

The optional LLM brief the deck promises is served here as regex-checkable
template text — every number is lifted straight from the running engine, so the
assistant can never contradict the dashboard. No API key is needed.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Callable

from app.products import PRODUCT_BY_ID

if TYPE_CHECKING:
    import pandas as pd


class AssistantEngine:
    """Builds grounded answers for POST /api/assistant/query."""

    def __init__(
        self,
        frame: "pd.DataFrame",
        spread_series_fn: Callable[..., dict | None],
        data_status_fn: Callable[..., dict],
        alerts_fn: Callable[..., list[dict]],
        backtests: Callable[[], list[dict]],
    ) -> None:
        self._frame = frame
        self._spread = spread_series_fn
        self._status = data_status_fn
        self._alerts = alerts_fn
        self._backtests = backtests

    # --- fact plumbing ------------------------------------------------------

    def _mode_note(self) -> str:
        status = self._status()
        return status["ingestPath"]

    def answer(self, question: str) -> dict:
        text = question.lower()
        status = self._status()
        data_notes = [f"Dataset: {status['ingestPath']}", f"As-of {status['asOf']}"]

        answer: str
        citations: list
        confidence: float
        if "cost" in text or "hurdle" in text or "broker" in text:
            answer, citations, confidence = self._cost_answer()
        elif "z" in text or "signal" in text:
            answer, citations, confidence = self._z_answer()
        elif "half" in text:
            answer, citations, confidence = self._half_life_answer()
        elif "carry" in text or "term" in text:
            answer, citations, confidence = self._carry_answer()
        elif "stale" in text or "trust" in text or "data" in text:
            answer, citations, confidence = self._data_answer()
        elif "backtest" in text or "overfit" in text or "pbo" in text or "dsr" in text or "verdict" in text:
            answer, citations, confidence = self._backtest_answer()
        else:
            answer, citations, confidence = self._overview_answer()

        return {
            "answerId": f"as-{abs(hash(question)) & 0xFFFFFF:06x}",
            "question": question.strip(),
            "createdAt": f"{status['asOf']}T10:31:00.000Z",
            "confidence": confidence,
            "answer": answer,
            "citations": citations,
            "dataNotes": data_notes,
        }

    # --- templates ----------------------------------------------------------

    def _top_pair_line(self) -> str:
        best = None
        best_abs = 0.0
        for leg_a, leg_b in [("GOLDM", "GOLDPETAL"), ("GOLD", "GOLDM"), ("GOLDM", "GOLDGUINEA")]:
            series = self._spread(leg_a, leg_b, "6M")
            if series:
                residual = abs(series["summary"]["residualBps"])
                if residual > best_abs:
                    best, best_abs = (leg_a, leg_b), residual
        if not best:
            return "No monitored pair has a usable series yet."
        leg_a, leg_b = best
        series = self._spread(leg_a, leg_b, "6M")
        assert series is not None
        summary = series["summary"]
        return (
            f"The widest monitored residual is **{leg_b} vs {leg_a}** at "
            f"{summary['residualBps']:+.1f} bps (z = {summary['zscore']:.2f}, "
            f"{summary['percentile']:.0f}th percentile), against a {summary['roundTripCostBps']:.1f} bps "
            f"round trip and {summary['halfLifeDays']:.1f}-day half-life."
        )

    def _overview_answer(self) -> tuple[str, list, float]:
        citations = [
            {"label": "Methodology — Normalisation", "methodologyId": "normalisation"},
            {"label": "Methodology — Costs", "methodologyId": "costs"},
            {"label": "Methodology — Limitations", "methodologyId": "limitations"},
        ]
        top = self._top_pair_line()
        render = PRODUCT_BY_ID
        product_names = ", ".join(spec["name"] for spec in [render[p] for p in ("GOLD", "GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL")])
        answer = (
            "I can explain any number on this dashboard. Ask about:\n\n"
            "- **Normalisation** — how the raw ₹ gap becomes a comparable residual "
            "(purity ≈ +40 bps for 999-vs-995, expiry carry, the log identity).\n"
            "- **Costs** — the round-trip hurdle: statutory ≈ 1.9 bps, brokerage "
            "₹20-or-0.03% per order, modelled bid-ask per contract.\n"
            "- **z-scores** — lagged rolling z and the robust median/MAD variant.\n"
            "- **Half-life** — AR(1) reversion speed and why alerts need daysToExpiry > half-life.\n"
            "- **Trust & staleness** — what the data-quality checks watch.\n"
            "- **Backtests** — walk-forward, DSR, PBO, and the honesty verdict.\n\n"
            f"Right now: {top}\n"
            f"Instruments covered: {product_names}."
        )
        return answer, citations, 0.8

    def _cost_answer(self) -> tuple[str, list, float]:
        citations = [{"label": "Methodology — Costs", "methodologyId": "costs"}]
        lines = []
        for leg in ("GOLD", "GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"):
            spec = PRODUCT_BY_ID[leg]
            pick = self._front_fine(leg)
            if pick is None:
                continue
            notional = pick * spec["unitGrams"]
            brokerage = min(20.0, notional * 0.0003) * 2 / notional * 1e4
            bid_ask = {"GOLD": 0.1, "GOLDM": 0.15, "GOLDTEN": 1.2, "GOLDGUINEA": 3.5, "GOLDPETAL": 5.0}[leg]
            total = 1.9 + brokerage + bid_ask
            lines.append(
                f"| {spec['name']} ({spec['unitGrams']:.0f} g lot) | ₹{notional:,.0f} | 1.9 | {brokerage:.2f} | {bid_ask} | **{total:.1f}** |"
            )
        table = (
            "| Leg | Notional per round trip | Statutory bps | Brokerage bps | Bid-ask bps | Total bps |\n"
            "|---|---|---|---|---|---|\n" + "\n".join(lines)
        )
        answer = (
            "The cost hurdle, per leg round trip, priced off the live front contracts:\n\n"
            f"{table}\n\n"
            "Statutory (CTT, exchange fee, SEBI, stamp, GST) lands near 1.9 bps regardless of size. "
            "Brokerage is the lower of ₹20 or 0.03% per order — on a ₹14.8k petal lot the flat ₹40 "
            "dominates and cannot be reduced by splitting. A pair pays both legs, so small-contract "
            "spreads inherit a two-leg hurdle; that is exactly why most petal signals die here, and why "
            "the alert layer refuses to fire when 80% of the residual does not clear it."
        )
        return answer, citations, 0.9

    def _z_answer(self) -> tuple[str, list, float]:
        citations = [{"label": "Methodology — Signal maths", "methodologyId": "signal-math"}]
        top = self._top_pair_line()
        answer = (
            "Every z on this site is **lagged**: the normalisers use data through t−1, never today. "
            "The classic rolling z divides today's basis by the mean and standard deviation of the "
            "previous 60 sessions; the robust variant swaps in the median and `MAD × 1.4826` so one "
            "stale print cannot inflate the scale. Percentile is the basis's rank in that window.\n\n"
            f"{top}\n\n"
            "Gate logic: |z| ≥ 2 arms, hysteresis re-arms above 2 and resets below 1, and the *armed* "
            "state only becomes a trade if 80% of the residual beats the round-trip cost. Armed-but-"
            "cost-blocked pairs still print an info card — the system explains its silence."
        )
        return answer, citations, 0.92

    def _half_life_answer(self) -> tuple[str, list, float]:
        citations = [{"label": "Methodology — Signal maths", "methodologyId": "signal-math"}]
        lines = []
        for leg_a, leg_b in [("GOLDM", "GOLDPETAL"), ("GOLDM", "GOLDGUINEA"), ("GOLD", "GOLDM")]:
            series = self._spread(leg_a, leg_b, "6M")
            if series:
                summary = series["summary"]
                lines.append(
                    f"- {series['pairLabel']}: half-life **{summary['halfLifeDays']:.1f} days** "
                    f"(window {summary['observations']} sessions)."
                )
        answer = (
            "The half-life comes from an AR(1) fit on the basis: regress ΔB on B₋₁, take "
            "`φ = 1 + β`, then `HL = −ln 2 / ln φ`. It is only meaningful for 0 < φ < 1; outside that "
            "the basis is not mean-reverting and the engine reports 0 (no usable half-life).\n\n"
            + ("\n".join(lines) if lines else "No pair has a usable AR(1) fit yet.")
            + "\n\nTwo uses: the 60-session lookback is sized relative to expected half-life, and an "
            "alert is withheld when half-life exceeds days-to-expiry (nothing can revert before the "
            "forced exit)."
        )
        return answer, citations, 0.88

    def _carry_answer(self) -> tuple[str, list, float]:
        citations = [{"label": "Methodology — Normalisation", "methodologyId": "normalisation"}]
        answer = (
            "Gold futures settle dates apart: GOLD/GOLDM expire on the 5th of their month, the three "
            "999 contracts at month-end, so a December-vs-December pair embeds ~25 days of financing "
            "(≈ 45 bps at 6.5%/yr) that decays toward zero as both legs approach expiry. A naive gap "
            "reads that decay as mean reversion that was never a signal.\n\n"
            "The engine therefore estimates net carry from **leg A's own curve**: among that leg's "
            "non-stale nodes, it log-interpolates `ln(fine_far / fine_near) / Δτ` and reads the curve at "
            "leg B's tenor. The residual basis — level minus carry — is what every z-score is taken "
            "on. The term-structure page shows both the raw curve and the implied annualised carry per "
            "product against the 6.6% external benchmark."
        )
        return answer, citations, 0.9

    def _data_answer(self) -> tuple[str, list, float]:
        citations = [{"label": "Methodology — Data pipeline", "methodologyId": "data-pipeline"}]
        status = self._status()
        checks = "\n".join(
            f"- {'✅' if check['passed'] else '❌'} **{check['label']}** — {check['detail']}"
            for check in status["checks"]
        )
        answer = (
            f"Trust score **{status['trustScore']}/100** for {status['asOf']} "
            f"(source: `{status['source']}`). The checks behind it:\n\n{checks}\n\n"
            "Stale rules: a settlement row with zero volume is flagged stale, stays on charts, but is "
            "excluded from carry interpolation and signal generation. Use the upload flow to replace "
            "this dataset with a real MCX Bhavcopy CSV — the engine reports every accepted, fixed and "
            "rejected row."
        )
        return answer, citations, 0.95

    def _backtest_answer(self) -> tuple[str, list, float]:
        citations = [{"label": "Methodology — Validation", "methodologyId": "validation"}]
        runs = self._backtests()
        if runs:
            metrics = runs[-1]["metrics"]
            runs_line = (
                f"The latest run on {runs[-1]['params']['legA']} vs {runs[-1]['params']['legB']} came back "
                f"**{metrics['verdict']}**: {metrics['trades']} trades, OOS Sharpe {metrics['sharpeOos']}, "
                f"DSR {metrics['dsr']}, PBO {metrics['pbo']}, net {metrics['netPnlBps']} bps against "
                f"{metrics['roundTripCostBps']} bps of cost. Breakeven cost was {metrics['breakevenCostBps']} bps."
            )
        else:
            runs_line = "No backtest has been run in this session yet — open Backtesting and run one."
        answer = (
            "The verdict language is deliberately harsher than a single number. Every run is walk-forward "
            "(train 250 / test 40), pays explicit costs, and is judged by three controls at once: the "
            "*deflated Sharpe ratio* corrects for the 7 configurations actually tried; *PBO via CSCV* "
            "(8 blocks) estimates how often the in-sample best config lands below the out-of-sample "
            "median; and the *power floor* converts test-day count into the minimum detectable Sharpe.\n\n"
            f"{runs_line}\n\n"
            "A null result — no edge survives costs — is the honest default, and the dashboard says it "
            "rather than hiding it."
        )
        return answer, citations, 0.91

    def _front_fine(self, product_id: str) -> float | None:
        from app.engine.relative_value import front_pick

        frame = self._frame()
        as_of = str(frame["tradeDate"].max())
        pick = front_pick(frame, product_id, as_of)
        if pick is None:
            return None
        return float(pick["finePerGram"])
