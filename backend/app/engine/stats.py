"""Statistics used across the engine, including the multiple-testing controls.

The module deliberately avoids SciPy: Φ uses math.erf and Φ⁻¹ uses the
Acklam rational approximation. Work in log basis points throughout, so spreads
are additive and the gold level cancels.
"""

from __future__ import annotations

import math
from typing import Sequence

EULER_MASCHERONI = 0.5772156649015329


# --- primitives -----------------------------------------------------------

def mean(values: Sequence[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def std(values: Sequence[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = mean(values)
    variance = sum((v - m) ** 2 for v in values) / (len(values) - 1)
    return math.sqrt(variance)


def median(values: Sequence[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    mid = len(ordered) // 2
    if len(ordered) % 2 == 0:
        return (ordered[mid - 1] + ordered[mid]) / 2
    return ordered[mid]


def mad(values: Sequence[float], centre: float) -> float:
    if not values:
        return 0.0
    return median([abs(v - centre) for v in values])


def percentile_rank(values: Sequence[float], value: float) -> float:
    """Share of the window at or below `value`, 0–100 (matches the frontend)."""
    if not values:
        return 50.0
    at_or_below = sum(1 for v in values if v <= value)
    return (at_or_below / len(values)) * 100.0


def half_life(series: Sequence[float]) -> float:
    """OU half-life from an AR(1) fit: HL = −ln2 / ln(φ), φ = 1 + β of ΔX on X₋₁."""
    if len(series) < 30:
        return 0.0
    x = list(series[:-1])
    y = [series[i + 1] - series[i] for i in range(len(series) - 1)]
    m_x, m_y = mean(x), mean(y)
    num = sum((xi - m_x) * (yi - m_y) for xi, yi in zip(x, y))
    den = sum((xi - m_x) ** 2 for xi in x)
    if den == 0:
        return 0.0
    beta = num / den
    phi = 1.0 + beta
    if phi <= 1e-4 or phi >= 0.999999:
        return 0.0
    return max(0.0, -math.log(2) / math.log(phi))


def skewness(values: Sequence[float]) -> float:
    n = len(values)
    if n < 3:
        return 0.0
    m, s = mean(values), std(values)
    if s == 0:
        return 0.0
    return mean([((v - m) / s) ** 3 for v in values])


def kurtosis(values: Sequence[float]) -> float:
    n = len(values)
    if n < 4:
        return 3.0
    m, s = mean(values), std(values)
    if s == 0:
        return 3.0
    return mean([((v - m) / s) ** 4 for v in values])


def sharpe(daily: Sequence[float]) -> float:
    s = std(daily)
    if s == 0:
        return 0.0
    return (mean(daily) / s) * math.sqrt(250)


def max_drawdown(cumulative: Sequence[float]) -> float:
    """Return drawdown as a negative percentage of the running peak."""
    peak = 0.0
    worst = 0.0
    for level in cumulative:
        peak = max(peak, level)
        if peak > 0:
            worst = min(worst, (level - peak) / peak * 100)
        elif level < 0:
            worst = min(worst, 0.0)
    return worst


# --- normal quantiles (no SciPy) -------------------------------------------

def norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def norm_inv(p: float) -> float:
    """Inverse CDF, Acklam's rational approximation (riskless at 1e-9)."""
    if p <= 0.0:
        return -8.0
    if p >= 1.0:
        return 8.0
    a = [
        -3.969683028665376e01, 2.209460984245205e02, -2.759285104469687e02,
        1.383577518672690e02, -3.066479806614716e01, 2.506628277459239e00,
    ]
    b = [
        -5.447609879822406e01, 1.615858368580409e02, -1.556989798598866e02,
        6.680131188771972e01, -1.328068155288572e01,
    ]
    c = [
        -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e00,
        -2.549732539343734e00, 4.374664141464968e00, 2.938163982698783e00,
    ]
    d = [
        7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e00,
        3.754408661907416e00,
    ]
    p_low, p_high = 0.02425, 1 - 0.02425
    if p < p_low:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
        )
    if p > p_high:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
        )
    q = p - 0.5
    r = q * q
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    )


# --- rolling helpers -------------------------------------------------------

def rolling_window(values: Sequence[float], index: int, window: int) -> list[float]:
    """History strictly BEFORE `index` — the lag-by-one lookback for signals."""
    start = max(0, index - window)
    return list(values[start:index])


def lagged_z(values: Sequence[float], index: int, window: int) -> float:
    history = rolling_window(values, index, window)
    if len(history) < 20:
        return 0.0
    s = std(history)
    if s == 0:
        return 0.0
    return (values[index] - mean(history)) / s


def lagged_robust_z(values: Sequence[float], index: int, window: int) -> float:
    history = rolling_window(values, index, window)
    if len(history) < 20:
        return 0.0
    med = median(history)
    scaled = mad(history, med) * 1.4826
    if scaled == 0:
        return 0.0
    return (values[index] - med) / scaled


# --- multiple-testing controls --------------------------------------------

def deflated_sharpe(daily: Sequence[float], config_sharpes: Sequence[float]) -> float:
    """Bailey–López de Prado DSR across the `config_sharpes` that were tried."""
    t = len(daily)
    n = len(config_sharpes)
    if t < 30 or n < 2:
        return 0.0
    variance = sum((v - mean(config_sharpes)) ** 2 for v in config_sharpes) / (n - 1)
    if variance <= 0:
        return 0.0
    per_period = sharpe(daily) / math.sqrt(250)
    expected_max = math.sqrt(variance) * (
        (1 - EULER_MASCHERONI) * norm_inv(1 - 1 / n)
        + EULER_MASCHERONI * norm_inv(1 - 1 / (n * math.e))
    )
    g3 = skewness(daily)
    g4 = kurtosis(daily)
    denominator = math.sqrt(max(1e-9, 1 - g3 * per_period + ((g4 - 1) / 4) * per_period**2))
    z = ((per_period - expected_max) * math.sqrt(t - 1)) / denominator
    return norm_cdf(z)


def _combinations(n: int, k: int) -> list[int]:
    out: list[int] = []
    for mask in range(1 << n):
        if bin(mask).count("1") == k:
            out.append(mask)
    return out


def probability_of_overfitting(matrix: Sequence[Sequence[float]], blocks: int = 8) -> float:
    """PBO via CSCV: share of half-splits where the in-sample best is below median OOS."""
    t = len(matrix)
    if not matrix or t < blocks * 4:
        return 0.5
    n = len(matrix[0])
    if n < 2:
        return 0.5
    block_size = t // blocks
    splits = _combinations(blocks, blocks // 2)
    if not splits:
        return 0.5
    overfit = 0
    for mask in splits:
        in_sample: list[float] = []
        out_sample: list[float] = []
        for col in range(n):
            in_sum = 0.0
            in_len = 0
            out_sum = 0.0
            out_len = 0
            for block in range(blocks):
                start = block * block_size
                end = t if block == blocks - 1 else start + block_size
                member_sum = sum(matrix[row][col] for row in range(start, end))
                if mask & (1 << block):
                    in_sum += member_sum
                    in_len += end - start
                else:
                    out_sum += member_sum
                    out_len += end - start
            in_sample.append(in_sum / max(1, in_len))
            out_sample.append(out_sum / max(1, out_len))
        best = max(range(n), key=lambda i: in_sample[i])
        chosen = out_sample[best]
        better = sum(1 for v in out_sample if v > chosen)
        omega = (better + 1) / n
        logit = math.log(omega / (1 - omega)) if 0 < omega < 1 else (-6.0 if omega <= 0 else 6.0)
        if logit < 0:
            overfit += 1
    return overfit / len(splits)
