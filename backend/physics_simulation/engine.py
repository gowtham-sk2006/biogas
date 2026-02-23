"""
Physics Simulation Engine
==========================
Pure-Python + NumPy computation engine implementing 10 first-principles /
semi-empirical pyrolysis physics models.  Every function is stateless and
returns plain dicts of Python lists (JSON-serialisable).

Models
------
1.  Temperature ramp (linear + hold)
2.  Arrhenius-based thermal degradation
3.  Gas evolution curve
4.  Residence time optimisation sweep
5.  Heat transfer approximation
6.  Reactor type simulation
7.  Char prediction
8.  Tar formation estimation
9.  Oxygen leakage simulation
10. Pressure fluctuation stability
"""

from __future__ import annotations

import math
import time
from typing import Any

import numpy as np

# ─── Physical Constants ──────────────────────────────────────────────────────

R_GAS = 8.314          # J/(mol·K)
STEFAN_BOLTZMANN = 5.67e-8  # W/(m²·K⁴)

# ─── Per-plastic kinetic parameters ──────────────────────────────────────────
# A  = pre-exponential factor  (1/s)
# Ea = activation energy        (J/mol)
# char_yield_base = base char fraction at full conversion
# tar_yield_base  = peak tar fraction

KINETIC_PARAMS: dict[str, dict[str, float]] = {
    "PET": {
        "A": 3.5e12, "Ea": 195_000,
        "char_yield_base": 0.12, "tar_yield_base": 0.25,
        "emissivity": 0.85, "particle_diam_m": 0.005,
        "density_kg_m3": 1380, "cp_j_kgK": 1200,
    },
    "HDPE": {
        "A": 1.0e14, "Ea": 245_000,
        "char_yield_base": 0.02, "tar_yield_base": 0.15,
        "emissivity": 0.90, "particle_diam_m": 0.004,
        "density_kg_m3": 950, "cp_j_kgK": 1900,
    },
    "LDPE": {
        "A": 8.0e13, "Ea": 240_000,
        "char_yield_base": 0.01, "tar_yield_base": 0.14,
        "emissivity": 0.90, "particle_diam_m": 0.003,
        "density_kg_m3": 920, "cp_j_kgK": 2300,
    },
    "PP": {
        "A": 6.0e13, "Ea": 230_000,
        "char_yield_base": 0.02, "tar_yield_base": 0.18,
        "emissivity": 0.88, "particle_diam_m": 0.004,
        "density_kg_m3": 910, "cp_j_kgK": 1920,
    },
}

# ─── Reactor-type multipliers ────────────────────────────────────────────────

REACTOR_PROFILES: dict[str, dict[str, float]] = {
    "batch": {
        "mixing_efficiency": 0.60,
        "heat_transfer_coeff": 50.0,    # W/(m²·K)
        "conversion_boost": 1.0,
        "rtd_spread": 0.0,              # perfect plug-flow in batch
    },
    "fluidized_bed": {
        "mixing_efficiency": 0.92,
        "heat_transfer_coeff": 300.0,
        "conversion_boost": 1.15,
        "rtd_spread": 0.25,
    },
    "rotary_kiln": {
        "mixing_efficiency": 0.78,
        "heat_transfer_coeff": 120.0,
        "conversion_boost": 1.08,
        "rtd_spread": 0.15,
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Temperature Ramp Model
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_temperature_ramp(
    target_temp_c: float,
    heating_rate_c_min: float,
    total_time_min: float,
    ambient_temp_c: float = 25.0,
    n_points: int = 200,
) -> dict[str, Any]:
    """
    Generate T(t) curve: linear ramp from ambient to target, then hold.
    """
    ramp_time = (target_temp_c - ambient_temp_c) / heating_rate_c_min
    ramp_time = max(0, min(ramp_time, total_time_min))

    t = np.linspace(0, total_time_min, n_points)
    T = np.where(
        t <= ramp_time,
        ambient_temp_c + heating_rate_c_min * t,
        target_temp_c,
    )
    labels = np.where(t <= ramp_time, "ramp", "hold")

    return {
        "time_min": np.round(t, 3).tolist(),
        "temperature_c": np.round(T, 2).tolist(),
        "stage_labels": labels.tolist(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Arrhenius-based Thermal Degradation
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_arrhenius_degradation(
    time_min: list[float],
    temperature_c: list[float],
    plastic_type: str,
) -> dict[str, Any]:
    """
    rate(t) = A * exp(-Ea / (R * T(t)))
    Integrate mass loss via simple Euler: dm/dt = -rate * m
    """
    kp = KINETIC_PARAMS[plastic_type]
    A, Ea = kp["A"], kp["Ea"]

    t = np.array(time_min) * 60.0  # → seconds
    T_K = np.array(temperature_c) + 273.15

    rate = A * np.exp(-Ea / (R_GAS * T_K))

    # Euler integration of mass fraction
    m = np.ones_like(t)
    for i in range(1, len(t)):
        dt = t[i] - t[i - 1]
        m[i] = m[i - 1] - rate[i - 1] * m[i - 1] * dt
        m[i] = max(m[i], 0.0)

    return {
        "time_min": time_min,
        "reaction_rate": np.round(rate, 8).tolist(),
        "mass_remaining_frac": np.round(m, 6).tolist(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Gas Evolution Curve
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_gas_evolution(
    time_min: list[float],
    mass_remaining_frac: list[float],
    char_yield_base: float,
    tar_yield_base: float,
) -> dict[str, Any]:
    """
    Gas yield = 1 - mass_remaining - char - tar  (simplified).
    Instantaneous rate = d(cumulative)/dt.
    """
    m = np.array(mass_remaining_frac)
    gas_frac = np.clip(1.0 - m - char_yield_base - tar_yield_base, 0.0, 1.0)
    cumulative_yield_pct = (gas_frac * 100).tolist()

    t = np.array(time_min)
    inst_rate = np.gradient(gas_frac, t, edge_order=1)
    inst_rate = np.clip(inst_rate, 0.0, None)

    return {
        "time_min": time_min,
        "cumulative_yield_pct": [round(v, 3) for v in cumulative_yield_pct],
        "instantaneous_rate": np.round(inst_rate, 6).tolist(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Residence Time Optimisation
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_residence_time_optimization(
    plastic_type: str,
    target_temp_c: float,
    heating_rate_c_min: float,
    n_sweep: int = 30,
    rt_min: float = 5.0,
    rt_max: float = 180.0,
) -> dict[str, Any]:
    """
    Sweep residence time and report resulting gas yield for each value.
    """
    kp = KINETIC_PARAMS[plastic_type]
    A, Ea = kp["A"], kp["Ea"]
    char_base = kp["char_yield_base"]
    tar_base = kp["tar_yield_base"]

    sweep_rt = np.linspace(rt_min, rt_max, n_sweep)
    yields: list[float] = []

    for rt in sweep_rt:
        ramp = simulate_temperature_ramp(target_temp_c, heating_rate_c_min, rt, n_points=80)
        deg = simulate_arrhenius_degradation(ramp["time_min"], ramp["temperature_c"], plastic_type)
        final_m = deg["mass_remaining_frac"][-1]
        gas_yield = max(0.0, (1.0 - final_m - char_base - tar_base) * 100)
        yields.append(round(gas_yield, 3))

    best_idx = int(np.argmax(yields))

    return {
        "residence_times_min": np.round(sweep_rt, 2).tolist(),
        "yield_pct": yields,
        "optimal_residence_time_min": round(float(sweep_rt[best_idx]), 2),
        "optimal_yield_pct": yields[best_idx],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Heat Transfer Approximation
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_heat_transfer(
    time_min: list[float],
    reactor_temp_c: list[float],
    plastic_type: str,
    h_conv: float = 50.0,
) -> dict[str, Any]:
    """
    Lump-capacitance model for a spherical particle:
      m·cp·dTp/dt = h·A_s·(T_reactor - Tp) + ε·σ·A_s·(T_reactor⁴ - Tp⁴)
    """
    kp = KINETIC_PARAMS[plastic_type]
    d = kp["particle_diam_m"]
    rho = kp["density_kg_m3"]
    cp = kp["cp_j_kgK"]
    eps = kp["emissivity"]

    A_s = math.pi * d ** 2
    V = (math.pi / 6) * d ** 3
    mass = rho * V

    t_s = (np.array(time_min) * 60.0)
    T_r = np.array(reactor_temp_c) + 273.15

    Tp = np.empty_like(t_s)
    Tp[0] = 298.15  # start at ~25 °C

    heat_flux: list[float] = []

    for i in range(len(t_s)):
        q_conv = h_conv * A_s * (T_r[i] - Tp[max(0, i - 1)])
        q_rad = eps * STEFAN_BOLTZMANN * A_s * (T_r[i] ** 4 - Tp[max(0, i - 1)] ** 4)
        q_total = q_conv + q_rad
        heat_flux.append(round(float(q_total / A_s), 2))

        if i > 0:
            dt = t_s[i] - t_s[i - 1]
            dT = (q_conv + q_rad) / (mass * cp) * dt
            Tp[i] = Tp[i - 1] + dT
            Tp[i] = min(Tp[i], T_r[i])  # can't exceed reactor T
        # Tp[0] already set

    particle_temp_c = (Tp - 273.15).tolist()

    return {
        "time_min": time_min,
        "particle_temp_c": [round(v, 2) for v in particle_temp_c],
        "heat_flux_w_m2": heat_flux,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Reactor Type Simulation
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_reactor(
    reactor_type: str,
    time_min: list[float],
    mass_remaining_frac: list[float],
) -> dict[str, Any]:
    """
    Apply reactor-specific mixing / heat-transfer multipliers to the
    base conversion curve.
    """
    profile = REACTOR_PROFILES[reactor_type]
    conversion_base = 1.0 - np.array(mass_remaining_frac)
    conversion_boosted = np.clip(conversion_base * profile["conversion_boost"], 0, 1) * 100

    # Simple RTD as Gaussian spread around each point
    rtd_spread = profile["rtd_spread"]
    n = len(time_min)
    if rtd_spread > 0 and n > 1:
        kernel_size = max(3, int(n * rtd_spread * 0.1))
        kernel = np.exp(-0.5 * np.linspace(-2, 2, kernel_size) ** 2)
        kernel /= kernel.sum()
        rtd = np.convolve(np.ones(n) / n, kernel, mode="same")
    else:
        rtd = (np.ones(n) / n).tolist()

    return {
        "reactor_type": reactor_type,
        "mixing_efficiency": profile["mixing_efficiency"],
        "heat_transfer_coeff": profile["heat_transfer_coeff"],
        "residence_time_distribution": [round(float(v), 6) for v in rtd],
        "time_min": time_min,
        "conversion_pct": np.round(conversion_boosted, 3).tolist(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Char Prediction
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_char_prediction(
    time_min: list[float],
    mass_remaining_frac: list[float],
    char_yield_base: float,
) -> dict[str, Any]:
    """
    Char fraction increases as volatile matter is released.
    char(t) = char_yield_base * (1 - mass_remaining)
    """
    m = np.array(mass_remaining_frac)
    char_frac = char_yield_base * (1.0 - m)

    return {
        "time_min": time_min,
        "char_fraction": np.round(char_frac, 6).tolist(),
        "final_char_pct": round(float(char_frac[-1] * 100), 2),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 8. Tar Formation Estimation
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_tar_formation(
    time_min: list[float],
    temperature_c: list[float],
    mass_remaining_frac: list[float],
    tar_yield_base: float,
    cracking_onset_c: float = 450.0,
) -> dict[str, Any]:
    """
    Tar forms from primary decomposition then cracks at high temperatures.
    tar(t) = tar_base * (1-m) * cracking_factor(T)
    cracking_factor = exp(-k * max(0, T - cracking_onset))
    """
    m = np.array(mass_remaining_frac)
    T = np.array(temperature_c)

    k_crack = 0.008  # cracking rate constant per °C above onset
    cracking = np.exp(-k_crack * np.clip(T - cracking_onset_c, 0, None))
    tar_frac = tar_yield_base * (1.0 - m) * cracking

    peak_idx = int(np.argmax(tar_frac))

    return {
        "time_min": time_min,
        "tar_fraction": np.round(tar_frac, 6).tolist(),
        "peak_tar_pct": round(float(tar_frac[peak_idx] * 100), 2),
        "peak_tar_time_min": time_min[peak_idx],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 9. Oxygen Leakage Simulation
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_oxygen_leakage(
    time_min: list[float],
    temperature_c: list[float],
    oxygen_ingress_pct: float,
) -> dict[str, Any]:
    """
    Model O₂ concentration inside reactor and resulting oxidation mass loss.
    Higher temperature → faster O₂ consumption → lower steady state.
    """
    t = np.array(time_min)
    T = np.array(temperature_c) + 273.15

    # O₂ consumption rate proportional to temperature
    k_consumption = 0.002  # base rate constant
    o2 = np.empty_like(t)
    o2[0] = oxygen_ingress_pct

    oxidation_loss = np.zeros_like(t)

    for i in range(1, len(t)):
        dt = (t[i] - t[i - 1]) * 60  # seconds
        consumption = k_consumption * (T[i] / 773.0) * o2[i - 1] * dt
        inflow = oxygen_ingress_pct * 0.01 * dt  # slow ingress
        o2[i] = max(0.0, o2[i - 1] - consumption + inflow)
        oxidation_loss[i] = oxidation_loss[i - 1] + consumption * 0.5  # 50% of consumed O₂ causes mass loss

    return {
        "time_min": time_min,
        "o2_concentration_pct": np.round(o2, 4).tolist(),
        "oxidation_loss_pct": np.round(oxidation_loss, 4).tolist(),
        "total_mass_loss_pct": round(float(oxidation_loss[-1]), 3),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 10. Pressure Fluctuation Stability
# ═══════════════════════════════════════════════════════════════════════════════

def simulate_pressure_fluctuation(
    time_min: list[float],
    base_pressure_atm: float,
    temperature_c: list[float],
    mass_remaining_frac: list[float],
) -> dict[str, Any]:
    """
    Pressure fluctuates due to gas generation rate and temperature changes.
    P(t) = P_base + dP_gas(t) + noise
    """
    rng = np.random.default_rng(seed=42)

    t = np.array(time_min)
    T = np.array(temperature_c)
    m = np.array(mass_remaining_frac)

    # Gas generation rate → pressure contribution
    gas_gen_rate = -np.gradient(m, t, edge_order=1)
    gas_gen_rate = np.clip(gas_gen_rate, 0, None)

    # Pressure bump proportional to gas generation and temperature
    dP_gas = gas_gen_rate * (T / 500.0) * 0.5

    # Random noise (thermal fluctuation)
    noise = rng.normal(0, 0.01 * base_pressure_atm, size=len(t))

    P = base_pressure_atm + dP_gas + noise
    P = np.clip(P, 0.1, None)  # can't go below 0.1 atm

    max_dev = float(np.max(np.abs(P - base_pressure_atm)))
    # Stability index: 1 if no deviation, 0 if deviation ≥ 20% of base
    stability = max(0.0, min(1.0, 1.0 - max_dev / (0.2 * base_pressure_atm)))

    return {
        "time_min": time_min,
        "pressure_atm": np.round(P, 4).tolist(),
        "stability_index": round(stability, 4),
        "max_deviation_atm": round(max_dev, 4),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════

def run_simulation(
    plastic_type: str,
    weight_kg: float,
    temperature_c: float,
    pressure_atm: float,
    residence_time_min: float = 60.0,
    heating_rate_c_min: float = 20.0,
    reactor_type: str = "batch",
    oxygen_ingress_pct: float = 0.5,
) -> dict[str, Any]:
    """
    Run all 10 physics models and return a consolidated result dict.
    """
    t0 = time.perf_counter()

    key = plastic_type.strip().upper()
    if key not in KINETIC_PARAMS:
        raise ValueError(f"Unknown plastic_type '{plastic_type}'. Supported: {list(KINETIC_PARAMS.keys())}")

    kp = KINETIC_PARAMS[key]
    rtype = reactor_type if reactor_type in REACTOR_PROFILES else "batch"
    rp = REACTOR_PROFILES[rtype]

    # 1. Temperature ramp
    temp_ramp = simulate_temperature_ramp(
        target_temp_c=temperature_c,
        heating_rate_c_min=heating_rate_c_min,
        total_time_min=residence_time_min,
    )

    # 2. Arrhenius degradation
    arrhenius = simulate_arrhenius_degradation(
        time_min=temp_ramp["time_min"],
        temperature_c=temp_ramp["temperature_c"],
        plastic_type=key,
    )

    # 3. Gas evolution
    gas_evo = simulate_gas_evolution(
        time_min=temp_ramp["time_min"],
        mass_remaining_frac=arrhenius["mass_remaining_frac"],
        char_yield_base=kp["char_yield_base"],
        tar_yield_base=kp["tar_yield_base"],
    )

    # 4. Residence time optimisation
    rt_opt = simulate_residence_time_optimization(
        plastic_type=key,
        target_temp_c=temperature_c,
        heating_rate_c_min=heating_rate_c_min,
    )

    # 5. Heat transfer
    heat_xfer = simulate_heat_transfer(
        time_min=temp_ramp["time_min"],
        reactor_temp_c=temp_ramp["temperature_c"],
        plastic_type=key,
        h_conv=rp["heat_transfer_coeff"],
    )

    # 6. Reactor simulation
    reactor_sim = simulate_reactor(
        reactor_type=rtype,
        time_min=temp_ramp["time_min"],
        mass_remaining_frac=arrhenius["mass_remaining_frac"],
    )

    # 7. Char prediction
    char_pred = simulate_char_prediction(
        time_min=temp_ramp["time_min"],
        mass_remaining_frac=arrhenius["mass_remaining_frac"],
        char_yield_base=kp["char_yield_base"],
    )

    # 8. Tar formation
    tar_form = simulate_tar_formation(
        time_min=temp_ramp["time_min"],
        temperature_c=temp_ramp["temperature_c"],
        mass_remaining_frac=arrhenius["mass_remaining_frac"],
        tar_yield_base=kp["tar_yield_base"],
    )

    # 9. O₂ leakage
    o2_leak = simulate_oxygen_leakage(
        time_min=temp_ramp["time_min"],
        temperature_c=temp_ramp["temperature_c"],
        oxygen_ingress_pct=oxygen_ingress_pct,
    )

    # 10. Pressure fluctuation
    press_fluct = simulate_pressure_fluctuation(
        time_min=temp_ramp["time_min"],
        base_pressure_atm=pressure_atm,
        temperature_c=temp_ramp["temperature_c"],
        mass_remaining_frac=arrhenius["mass_remaining_frac"],
    )

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "success": True,
        "processing_time_ms": elapsed_ms,
        "plastic_type": key,
        "weight_kg": weight_kg,
        "reactor_type": rtype,
        "temperature_ramp": temp_ramp,
        "arrhenius_degradation": arrhenius,
        "gas_evolution": gas_evo,
        "residence_time_optimization": rt_opt,
        "heat_transfer": heat_xfer,
        "reactor_simulation": reactor_sim,
        "char_prediction": char_pred,
        "tar_formation": tar_form,
        "oxygen_leakage": o2_leak,
        "pressure_fluctuation": press_fluct,
    }
