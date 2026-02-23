"""
Advanced Engineering Layer Engine
===================================
Pure-Python + NumPy computation engine for 10 engineering-level
optimisation and analysis models.  All functions are stateless.

Models
------
1.  Multi-objective Pareto optimisation
2.  Weighted economic + environmental scoring
3.  Stability zone detection
4.  Sensitivity heatmap computation
5.  Safety boundary indicator
6.  Efficiency degradation over cycles
7.  Reactor aging model
8.  Automated parameter tuning advisor
9.  Cost vs emission tradeoff
10. Mixed plastic batch optimizer
"""

from __future__ import annotations

import math
import time
from typing import Any, Optional

import numpy as np

# ─── Simplified kinetic/yield model (mirrors physics_simulation constants) ───

KINETIC_DB: dict[str, dict[str, float]] = {
    "PET":  {"A": 3.5e12, "Ea": 195_000, "char": 0.12, "tar": 0.25, "cost_per_kg": 0.35},
    "HDPE": {"A": 1.0e14, "Ea": 245_000, "char": 0.02, "tar": 0.15, "cost_per_kg": 0.28},
    "LDPE": {"A": 8.0e13, "Ea": 240_000, "char": 0.01, "tar": 0.14, "cost_per_kg": 0.25},
    "PP":   {"A": 6.0e13, "Ea": 230_000, "char": 0.02, "tar": 0.18, "cost_per_kg": 0.30},
}

R_GAS = 8.314  # J/(mol·K)


def _quick_yield(plastic: str, temp_c: float, pressure: float, rt_min: float = 60) -> float:
    """Fast approximate gas yield (%) for a single operating point."""
    kp = KINETIC_DB[plastic]
    T_K = temp_c + 273.15
    rate = kp["A"] * math.exp(-kp["Ea"] / (R_GAS * T_K))
    conversion = 1.0 - math.exp(-rate * rt_min * 60)
    conversion = min(conversion, 1.0)
    gas = max(0.0, (conversion - kp["char"] - kp["tar"]) * 100)
    # Pressure modifier: slight benefit near 1 atm, penalty at extremes
    p_mod = 1.0 - 0.02 * abs(pressure - 1.0)
    return round(gas * p_mod, 3)


def _quick_emission(plastic: str, temp_c: float, pressure: float) -> float:
    """Approximate CO₂ emission score (g/kg), lower is better."""
    base = 120 + 0.25 * temp_c + 10 * pressure
    # PET has highest emission
    mult = {"PET": 1.3, "HDPE": 0.9, "LDPE": 0.85, "PP": 0.95}
    return round(base * mult.get(plastic, 1.0), 2)


def _energy_cost(temp_c: float, pressure: float, weight_kg: float) -> float:
    """Approximate energy cost in USD."""
    return round(0.002 * temp_c * weight_kg + 0.5 * pressure * weight_kg, 2)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Multi-objective Pareto Optimisation
# ═══════════════════════════════════════════════════════════════════════════════

def compute_pareto(
    plastic: str,
    weight_kg: float,
    temp_range: tuple[float, float] = (300, 700),
    press_range: tuple[float, float] = (0.5, 5.0),
    n_temp: int = 15,
    n_press: int = 10,
    economic_weight: float = 0.5,
) -> dict[str, Any]:
    temps = np.linspace(*temp_range, n_temp)
    pressures = np.linspace(*press_range, n_press)

    points: list[dict] = []
    for t in temps:
        for p in pressures:
            y = _quick_yield(plastic, t, p)
            e = _quick_emission(plastic, t, p)
            cost = _energy_cost(t, p, weight_kg)
            econ = round(max(0, 100 - cost), 2)
            env = round(max(0, 100 - e / 3), 2)
            combined = round(economic_weight * econ + (1 - economic_weight) * env, 2)
            points.append({
                "temperature_c": round(float(t), 1),
                "pressure_atm": round(float(p), 2),
                "yield_pct": y,
                "emission_score": e,
                "economic_score": econ,
                "combined_score": combined,
            })

    # Non-dominated sorting (maximize yield, minimize emission)
    pareto_front: list[dict] = []
    dominated: list[dict] = []

    for pt in points:
        is_dominated = False
        for other in points:
            if (other["yield_pct"] >= pt["yield_pct"] and
                other["emission_score"] <= pt["emission_score"] and
                (other["yield_pct"] > pt["yield_pct"] or
                 other["emission_score"] < pt["emission_score"])):
                is_dominated = True
                break
        if is_dominated:
            dominated.append(pt)
        else:
            pareto_front.append(pt)

    # Utopia: best combined score on the Pareto front
    utopia = max(pareto_front, key=lambda x: x["combined_score"]) if pareto_front else points[0]

    return {
        "pareto_front": pareto_front,
        "dominated_points": dominated,
        "utopia_point": utopia,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Weighted Economic + Environmental Scoring
# ═══════════════════════════════════════════════════════════════════════════════

def compute_econ_env_score(
    plastic: str,
    temp_c: float,
    pressure: float,
    weight_kg: float,
    economic_weight: float = 0.5,
) -> dict[str, Any]:
    cost = _energy_cost(temp_c, pressure, weight_kg)
    emission = _quick_emission(plastic, temp_c, pressure)
    econ = round(max(0, 100 - cost), 2)
    env = round(max(0, 100 - emission / 3), 2)
    combined = round(economic_weight * econ + (1 - economic_weight) * env, 2)
    if combined >= 75:
        grade = "A"
    elif combined >= 60:
        grade = "B"
    elif combined >= 45:
        grade = "C"
    elif combined >= 30:
        grade = "D"
    else:
        grade = "F"
    return {
        "economic_score": econ,
        "environmental_score": env,
        "combined_score": combined,
        "grade": grade,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Stability Zone Detection
# ═══════════════════════════════════════════════════════════════════════════════

def detect_stability_zones(
    plastic: str,
    temp_c: float,
    pressure: float,
) -> dict[str, Any]:
    """Map safe / marginal / unsafe regions based on material limits."""
    limits = {
        "PET":  {"safe_max_t": 550, "marginal_max_t": 650, "safe_max_p": 5, "marginal_max_p": 10},
        "HDPE": {"safe_max_t": 520, "marginal_max_t": 620, "safe_max_p": 5, "marginal_max_p": 8},
        "LDPE": {"safe_max_t": 500, "marginal_max_t": 600, "safe_max_p": 5, "marginal_max_p": 8},
        "PP":   {"safe_max_t": 530, "marginal_max_t": 630, "safe_max_p": 5, "marginal_max_p": 9},
    }
    lim = limits.get(plastic, limits["HDPE"])

    zones = [
        {
            "temp_min_c": 200, "temp_max_c": lim["safe_max_t"],
            "pressure_min_atm": 0.5, "pressure_max_atm": lim["safe_max_p"],
            "label": "safe",
        },
        {
            "temp_min_c": lim["safe_max_t"], "temp_max_c": lim["marginal_max_t"],
            "pressure_min_atm": 0.5, "pressure_max_atm": lim["marginal_max_p"],
            "label": "marginal",
        },
        {
            "temp_min_c": lim["marginal_max_t"], "temp_max_c": 800,
            "pressure_min_atm": 0.5, "pressure_max_atm": 20,
            "label": "unsafe",
        },
    ]

    if temp_c <= lim["safe_max_t"] and pressure <= lim["safe_max_p"]:
        current = "safe"
    elif temp_c <= lim["marginal_max_t"] and pressure <= lim["marginal_max_p"]:
        current = "marginal"
    else:
        current = "unsafe"

    return {"zones": zones, "current_zone": current}


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Sensitivity Heatmap Computation
# ═══════════════════════════════════════════════════════════════════════════════

def compute_sensitivity_heatmap(
    plastic: str,
    temp_range: tuple[float, float] = (300, 700),
    press_range: tuple[float, float] = (0.5, 5.0),
    n_temp: int = 20,
    n_press: int = 15,
) -> dict[str, Any]:
    temps = np.linspace(*temp_range, n_temp)
    pressures = np.linspace(*press_range, n_press)

    yield_mat: list[list[float]] = []
    emission_mat: list[list[float]] = []

    for t in temps:
        y_row, e_row = [], []
        for p in pressures:
            y_row.append(_quick_yield(plastic, float(t), float(p)))
            e_row.append(_quick_emission(plastic, float(t), float(p)))
        yield_mat.append(y_row)
        emission_mat.append(e_row)

    return {
        "temperature_range": np.round(temps, 1).tolist(),
        "pressure_range": np.round(pressures, 2).tolist(),
        "yield_matrix": yield_mat,
        "emission_matrix": emission_mat,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Safety Boundary Indicator
# ═══════════════════════════════════════════════════════════════════════════════

def compute_safety_boundary(
    plastic: str,
    temp_c: float,
    pressure: float,
    residence_time_min: float,
) -> dict[str, Any]:
    max_temps = {"PET": 650, "HDPE": 620, "LDPE": 600, "PP": 630}
    max_press = {"PET": 10, "HDPE": 8, "LDPE": 8, "PP": 9}
    min_rt = 10.0  # universal minimum

    max_t = max_temps.get(plastic, 620)
    max_p = max_press.get(plastic, 8)

    t_margin = round((1 - temp_c / max_t) * 100, 1)
    p_margin = round((1 - pressure / max_p) * 100, 1)
    rt_margin = round((residence_time_min / min_rt - 1) * 100, 1)
    safety_margin = round(min(t_margin, p_margin, rt_margin), 1)

    return {
        "max_safe_temperature_c": float(max_t),
        "max_safe_pressure_atm": float(max_p),
        "min_safe_residence_min": min_rt,
        "safety_margin_pct": max(0, safety_margin),
        "is_within_bounds": temp_c <= max_t and pressure <= max_p and residence_time_min >= min_rt,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Efficiency Degradation Modelling
# ═══════════════════════════════════════════════════════════════════════════════

def model_efficiency_degradation(
    max_cycles: int = 500,
    step: int = 10,
    degradation_rate: float = 0.0003,
    failure_threshold: float = 70.0,
) -> dict[str, Any]:
    cycles = list(range(0, max_cycles + 1, step))
    efficiency = [round(100 * math.exp(-degradation_rate * c), 2) for c in cycles]

    # Find predicted failure cycle
    failure_cycle = int(math.log(failure_threshold / 100) / (-degradation_rate))

    return {
        "cycle_numbers": cycles,
        "efficiency_pct": efficiency,
        "predicted_failure_cycle": failure_cycle,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Reactor Aging Model
# ═══════════════════════════════════════════════════════════════════════════════

def model_reactor_aging(
    age_cycles: int,
    maintenance_interval: int = 200,
    degradation_rate: float = 0.0003,
) -> dict[str, Any]:
    eff_factor = round(math.exp(-degradation_rate * age_cycles), 4)
    rul = round(eff_factor * 100, 1)

    if eff_factor >= 0.90:
        urgency = "low"
    elif eff_factor >= 0.75:
        urgency = "moderate"
    elif eff_factor >= 0.60:
        urgency = "high"
    else:
        urgency = "critical"

    cycles_since = age_cycles % maintenance_interval
    next_maint = age_cycles + (maintenance_interval - cycles_since)

    return {
        "age_cycles": age_cycles,
        "efficiency_factor": eff_factor,
        "maintenance_urgency": urgency,
        "next_maintenance_cycle": next_maint,
        "remaining_useful_life_pct": rul,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 8. Automated Parameter Tuning Advisor
# ═══════════════════════════════════════════════════════════════════════════════

def advise_tuning(
    plastic: str,
    temp_c: float,
    pressure: float,
    residence_time_min: float,
    heating_rate: float,
    weight_kg: float,
) -> dict[str, Any]:
    recommendations: list[dict] = []

    # Temperature advice
    optimal_temps = {"PET": 480, "HDPE": 500, "LDPE": 490, "PP": 495}
    opt_t = optimal_temps.get(plastic, 500)
    if abs(temp_c - opt_t) > 20:
        improvement = round(abs(temp_c - opt_t) * 0.08, 1)
        recommendations.append({
            "parameter": "temperature_c",
            "current_value": temp_c,
            "suggested_value": float(opt_t),
            "expected_improvement_pct": improvement,
            "reasoning": f"Optimal temperature for {plastic} is ~{opt_t}°C based on Arrhenius kinetics.",
        })

    # Pressure advice
    if pressure > 3.0:
        recommendations.append({
            "parameter": "pressure_atm",
            "current_value": pressure,
            "suggested_value": 1.5,
            "expected_improvement_pct": round((pressure - 1.5) * 2.0, 1),
            "reasoning": "Lower pressure reduces energy cost with marginal yield impact.",
        })

    # Residence time
    if residence_time_min < 30:
        recommendations.append({
            "parameter": "residence_time_min",
            "current_value": residence_time_min,
            "suggested_value": 60.0,
            "expected_improvement_pct": round((60 - residence_time_min) * 0.3, 1),
            "reasoning": "Increasing residence time allows more complete conversion.",
        })
    elif residence_time_min > 120:
        recommendations.append({
            "parameter": "residence_time_min",
            "current_value": residence_time_min,
            "suggested_value": 90.0,
            "expected_improvement_pct": round((residence_time_min - 90) * 0.1, 1),
            "reasoning": "Diminishing returns beyond 90 min; excess time increases energy cost.",
        })

    # Heating rate
    if heating_rate < 10:
        recommendations.append({
            "parameter": "heating_rate_c_min",
            "current_value": heating_rate,
            "suggested_value": 20.0,
            "expected_improvement_pct": round((20 - heating_rate) * 0.5, 1),
            "reasoning": "Higher heating rate reaches target temperature faster, improving throughput.",
        })

    if not recommendations:
        recommendations.append({
            "parameter": "none",
            "current_value": 0,
            "suggested_value": 0,
            "expected_improvement_pct": 0,
            "reasoning": "Parameters are already near optimal.",
        })

    total_improvement = round(sum(r["expected_improvement_pct"] for r in recommendations), 1)

    return {
        "recommendations": recommendations,
        "overall_improvement_pct": total_improvement,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 9. Cost vs Emission Tradeoff
# ═══════════════════════════════════════════════════════════════════════════════

def compute_cost_emission_tradeoff(
    plastic: str,
    weight_kg: float,
    temp_range: tuple[float, float] = (300, 700),
    press_range: tuple[float, float] = (0.5, 5.0),
    n_points: int = 25,
) -> dict[str, Any]:
    temps = np.linspace(*temp_range, n_points)
    pressures = np.linspace(*press_range, max(5, n_points // 5))

    curve: list[dict] = []
    for t in temps:
        for p in pressures:
            cost = _energy_cost(float(t), float(p), weight_kg)
            em = _quick_emission(plastic, float(t), float(p))
            curve.append({
                "cost_usd": cost,
                "emission_kg_co2": round(em / 1000, 4),
                "temperature_c": round(float(t), 1),
                "pressure_atm": round(float(p), 2),
            })

    # Pareto-optimal on (min cost, min emission)
    non_dominated: list[dict] = []
    for pt in curve:
        dominated = False
        for other in curve:
            if (other["cost_usd"] <= pt["cost_usd"] and
                other["emission_kg_co2"] <= pt["emission_kg_co2"] and
                (other["cost_usd"] < pt["cost_usd"] or
                 other["emission_kg_co2"] < pt["emission_kg_co2"])):
                dominated = True
                break
        if not dominated:
            non_dominated.append(pt)

    non_dominated.sort(key=lambda x: x["cost_usd"])

    # Optimal = closest to utopia (min cost, min emission both normalized)
    if non_dominated:
        costs = [p["cost_usd"] for p in non_dominated]
        ems = [p["emission_kg_co2"] for p in non_dominated]
        c_range = max(costs) - min(costs) or 1
        e_range = max(ems) - min(ems) or 1
        optimal = min(
            non_dominated,
            key=lambda p: ((p["cost_usd"] - min(costs)) / c_range) ** 2 +
                          ((p["emission_kg_co2"] - min(ems)) / e_range) ** 2,
        )
    else:
        optimal = curve[0]

    return {
        "tradeoff_curve": non_dominated,
        "optimal_point": optimal,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 10. Mixed Plastic Batch Optimizer
# ═══════════════════════════════════════════════════════════════════════════════

def optimize_mixed_batch(
    mix: list[dict],          # [{"plastic_type": "HDPE", "fraction": 0.6}, ...]
    weight_kg: float,
    temp_range: tuple[float, float] = (350, 650),
    press_range: tuple[float, float] = (0.5, 4.0),
    n_grid: int = 12,
) -> dict[str, Any]:
    temps = np.linspace(*temp_range, n_grid)
    pressures = np.linspace(*press_range, max(4, n_grid // 3))

    best_score = -1
    best_t, best_p = float(temps[0]), float(pressures[0])
    best_yield, best_em = 0.0, 0.0

    for t in temps:
        for p in pressures:
            blend_y = 0.0
            blend_e = 0.0
            for item in mix:
                ptype = item["plastic_type"].strip().upper()
                frac = item["fraction"]
                blend_y += _quick_yield(ptype, float(t), float(p)) * frac
                blend_e += _quick_emission(ptype, float(t), float(p)) * frac
            score = blend_y - blend_e * 0.1
            if score > best_score:
                best_score = score
                best_t, best_p = float(t), float(p)
                best_yield, best_em = round(blend_y, 2), round(blend_e, 2)

    # Per-plastic breakdown at optimal point
    per_plastic: list[dict] = []
    for item in mix:
        ptype = item["plastic_type"].strip().upper()
        per_plastic.append({
            "plastic_type": ptype,
            "fraction": item["fraction"],
            "yield_pct": _quick_yield(ptype, best_t, best_p),
            "emission": _quick_emission(ptype, best_t, best_p),
        })

    risk = "Low" if best_em < 150 else "Medium" if best_em < 250 else "High"

    return {
        "blend_yield_pct": best_yield,
        "blend_emission": best_em,
        "blend_risk": risk,
        "per_plastic": per_plastic,
        "optimal_temperature_c": round(best_t, 1),
        "optimal_pressure_atm": round(best_p, 2),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════

def run_engineering_analysis(
    plastic_type: str = "HDPE",
    weight_kg: float = 5.0,
    temperature_c: float = 500,
    pressure_atm: float = 1.0,
    residence_time_min: float = 60,
    heating_rate_c_min: float = 20,
    reactor_type: str = "batch",
    reactor_age_cycles: int = 0,
    economic_weight: float = 0.5,
    plastic_mix: Optional[list[dict]] = None,
) -> dict[str, Any]:
    t0 = time.perf_counter()

    key = plastic_type.strip().upper()
    if key not in KINETIC_DB:
        raise ValueError(f"Unknown plastic_type '{plastic_type}'. Supported: {list(KINETIC_DB.keys())}")

    # 1 — Pareto
    pareto = compute_pareto(key, weight_kg, economic_weight=economic_weight)

    # 2 — Econ/Env score
    econ_env = compute_econ_env_score(key, temperature_c, pressure_atm, weight_kg, economic_weight)

    # 3 — Stability zones
    stability = detect_stability_zones(key, temperature_c, pressure_atm)

    # 4 — Sensitivity heatmap
    heatmap = compute_sensitivity_heatmap(key)

    # 5 — Safety boundary
    safety = compute_safety_boundary(key, temperature_c, pressure_atm, residence_time_min)

    # 6 — Efficiency degradation
    degradation = model_efficiency_degradation()

    # 7 — Reactor aging
    aging = model_reactor_aging(reactor_age_cycles)

    # 8 — Tuning advisor
    tuning = advise_tuning(key, temperature_c, pressure_atm, residence_time_min, heating_rate_c_min, weight_kg)

    # 9 — Cost vs emission tradeoff
    tradeoff = compute_cost_emission_tradeoff(key, weight_kg)

    # 10 — Mixed batch (optional)
    mixed = None
    if plastic_mix and len(plastic_mix) > 0:
        # Validate all plastic types
        for item in plastic_mix:
            pt = item.get("plastic_type", "").strip().upper()
            if pt not in KINETIC_DB:
                raise ValueError(f"Unknown plastic in mix: '{item.get('plastic_type')}'")
            item["plastic_type"] = pt
        mixed = optimize_mixed_batch(plastic_mix, weight_kg)

    elapsed = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "success": True,
        "processing_time_ms": elapsed,
        "pareto_optimization": pareto,
        "economic_environmental_score": econ_env,
        "stability_zones": stability,
        "sensitivity_heatmap": heatmap,
        "safety_boundary": safety,
        "efficiency_degradation": degradation,
        "reactor_aging": aging,
        "tuning_advisor": tuning,
        "cost_emission_tradeoff": tradeoff,
        "mixed_batch_optimization": mixed,
    }
