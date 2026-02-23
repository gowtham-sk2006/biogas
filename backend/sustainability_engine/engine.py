"""
Sustainability Engine
=======================
Pure-Python computation engine for 10 sustainability / ESG models.
All functions are stateless and return plain dicts.

Models
------
1.  Lifecycle Assessment comparison
2.  Carbon credit estimation
3.  Waste diversion impact calculator
4.  SDG 11, 12, 13 mapping score
5.  Tree equivalent estimation
6.  Fossil fuel replacement estimate
7.  Landfill methane comparison
8.  Incineration emission comparison
9.  Environmental risk index
10. ESG composite score
"""

from __future__ import annotations

import math
import time
from typing import Any, Optional

# ─── Reference constants ─────────────────────────────────────────────────────

# Calorific values MJ/kg (gas product)
CALORIFIC: dict[str, float] = {
    "PET": 23.5, "HDPE": 46.5, "LDPE": 46.0, "PP": 46.4,
}

# Density for volume estimation (kg/m³ bulk in landfill)
BULK_DENSITY: dict[str, float] = {
    "PET": 200, "HDPE": 150, "LDPE": 100, "PP": 130,
}

# Quick yield/emission estimators (read-only, no modification)
R_GAS = 8.314
KINETIC: dict[str, dict[str, float]] = {
    "PET":  {"A": 3.5e12, "Ea": 195_000, "char": 0.12, "tar": 0.25},
    "HDPE": {"A": 1.0e14, "Ea": 245_000, "char": 0.02, "tar": 0.15},
    "LDPE": {"A": 8.0e13, "Ea": 240_000, "char": 0.01, "tar": 0.14},
    "PP":   {"A": 6.0e13, "Ea": 230_000, "char": 0.02, "tar": 0.18},
}


def _est_yield(plastic: str, temp_c: float) -> float:
    kp = KINETIC[plastic]
    T_K = temp_c + 273.15
    rate = kp["A"] * math.exp(-kp["Ea"] / (R_GAS * T_K))
    conv = min(1.0, 1.0 - math.exp(-rate * 3600))
    return max(0.0, (conv - kp["char"] - kp["tar"]) * 100)


def _est_emission(plastic: str, temp_c: float, pressure: float) -> float:
    base = 120 + 0.25 * temp_c + 10 * pressure
    mult = {"PET": 1.3, "HDPE": 0.9, "LDPE": 0.85, "PP": 0.95}
    return round(base * mult.get(plastic, 1.0), 2)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Lifecycle Assessment Comparison
# ═══════════════════════════════════════════════════════════════════════════════

def lifecycle_assessment(
    plastic: str, weight_kg: float, co2_emission_g_per_kg: float,
) -> dict[str, Any]:
    co2_kg = co2_emission_g_per_kg * weight_kg / 1000

    phases = [
        {
            "phase": "Collection & Sorting",
            "co2_kg": round(0.05 * weight_kg, 3),
            "energy_mj": round(0.3 * weight_kg, 3),
            "water_liters": round(2.0 * weight_kg, 2),
        },
        {
            "phase": "Pre-treatment & Shredding",
            "co2_kg": round(0.08 * weight_kg, 3),
            "energy_mj": round(0.5 * weight_kg, 3),
            "water_liters": round(1.5 * weight_kg, 2),
        },
        {
            "phase": "Pyrolysis Reaction",
            "co2_kg": round(co2_kg, 3),
            "energy_mj": round(CALORIFIC.get(plastic, 40) * weight_kg * 0.3, 3),
            "water_liters": round(0.5 * weight_kg, 2),
        },
        {
            "phase": "Gas Conditioning & Storage",
            "co2_kg": round(0.03 * weight_kg, 3),
            "energy_mj": round(0.2 * weight_kg, 3),
            "water_liters": round(0.8 * weight_kg, 2),
        },
        {
            "phase": "Residue Management",
            "co2_kg": round(0.02 * weight_kg, 3),
            "energy_mj": round(0.1 * weight_kg, 3),
            "water_liters": round(0.3 * weight_kg, 2),
        },
    ]

    total_co2 = round(sum(p["co2_kg"] for p in phases), 3)
    total_energy = round(sum(p["energy_mj"] for p in phases), 3)
    total_water = round(sum(p["water_liters"] for p in phases), 2)

    # Landfill baseline: ~2.5 kg CO₂e per kg plastic (methane decomposition)
    landfill_co2 = 2.5 * weight_kg
    benefit = round((1 - total_co2 / landfill_co2) * 100, 1) if landfill_co2 > 0 else 0

    return {
        "phases": phases,
        "total_co2_kg": total_co2,
        "total_energy_mj": total_energy,
        "total_water_liters": total_water,
        "net_benefit_vs_landfill_pct": max(0, benefit),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Carbon Credit Estimation
# ═══════════════════════════════════════════════════════════════════════════════

def estimate_carbon_credits(
    weight_kg: float,
    co2_emission_g_per_kg: float,
    annual_batches: int,
    credit_price_usd: float = 25.0,
) -> dict[str, Any]:
    # Baseline: incineration ~2.9 kg CO₂ per kg plastic
    baseline_per_kg = 2.9
    pyrolysis_per_kg = co2_emission_g_per_kg / 1000

    baseline_total = round(baseline_per_kg * weight_kg * annual_batches, 2)
    pyrolysis_total = round(pyrolysis_per_kg * weight_kg * annual_batches, 2)
    reduction = round(baseline_total - pyrolysis_total, 2)
    credits = round(max(0, reduction / 1000), 4)  # 1 credit = 1 tonne CO₂
    value = round(credits * credit_price_usd, 2)

    return {
        "baseline_emission_kg": baseline_total,
        "pyrolysis_emission_kg": pyrolysis_total,
        "reduction_kg": max(0, reduction),
        "credits_earned": credits,
        "credit_value_usd": value,
        "methodology": "CDM AMS-III.BA — Recovery and recycling of materials from solid wastes",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Waste Diversion Impact Calculator
# ═══════════════════════════════════════════════════════════════════════════════

def waste_diversion_impact(
    plastic: str, weight_kg: float, annual_batches: int,
) -> dict[str, Any]:
    annual_kg = weight_kg * annual_batches
    annual_tonnes = round(annual_kg / 1000, 2)

    bulk = BULK_DENSITY.get(plastic, 150)
    volume_m3 = round(annual_kg / bulk, 2)

    diversion_rate = round(min(100, (annual_tonnes / 50) * 100), 1)

    return {
        "waste_diverted_kg": round(annual_kg, 2),
        "waste_diverted_annual_tonnes": annual_tonnes,
        "landfill_volume_saved_m3": volume_m3,
        "diversion_rate_pct": diversion_rate,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 4. SDG 11, 12, 13 Mapping Score
# ═══════════════════════════════════════════════════════════════════════════════

def sdg_mapping(
    co2_emission_g_per_kg: float,
    gas_yield_pct: float,
    waste_diverted_tonnes: float,
) -> dict[str, Any]:
    # SDG 11 — Sustainable Cities: waste management contribution
    sdg11 = round(min(100, 40 + waste_diverted_tonnes * 2), 1)

    # SDG 12 — Responsible Consumption: yield efficiency
    sdg12 = round(min(100, gas_yield_pct * 1.4), 1)

    # SDG 13 — Climate Action: emission reduction
    emission_norm = max(0, 1 - co2_emission_g_per_kg / 400)
    sdg13 = round(min(100, emission_norm * 100), 1)

    composite = round((sdg11 + sdg12 + sdg13) / 3, 1)

    narrative = (
        f"This operation contributes to SDG 11 (score {sdg11}) by diverting "
        f"{waste_diverted_tonnes:.1f} tonnes of plastic from urban landfills, "
        f"SDG 12 (score {sdg12}) through {gas_yield_pct:.1f}% material recovery "
        f"efficiency, and SDG 13 (score {sdg13}) via reduced greenhouse gas "
        f"emissions at {co2_emission_g_per_kg:.0f} g CO₂/kg."
    )

    return {
        "sdg_11_sustainable_cities": sdg11,
        "sdg_12_responsible_consumption": sdg12,
        "sdg_13_climate_action": sdg13,
        "composite_sdg_score": composite,
        "narrative": narrative,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Tree Equivalent Estimation
# ═══════════════════════════════════════════════════════════════════════════════

def tree_equivalent(
    co2_reduction_kg_annual: float,
) -> dict[str, Any]:
    # Average tree absorbs ~22 kg CO₂/year
    trees_annual = max(0, int(co2_reduction_kg_annual / 22))
    trees_lifetime = trees_annual * 20

    # Average hectare of forest has ~400 trees
    hectares = round(trees_annual / 400, 3)

    return {
        "co2_offset_kg_annual": round(co2_reduction_kg_annual, 2),
        "trees_equivalent_annual": trees_annual,
        "trees_equivalent_lifetime_20yr": trees_lifetime,
        "forest_area_hectares": hectares,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Fossil Fuel Replacement Estimate
# ═══════════════════════════════════════════════════════════════════════════════

def fossil_fuel_replacement(
    plastic: str,
    weight_kg: float,
    gas_yield_pct: float,
    annual_batches: int,
) -> dict[str, Any]:
    cal = CALORIFIC.get(plastic, 40)
    gas_mass = weight_kg * (gas_yield_pct / 100)
    energy_per_batch = gas_mass * cal  # MJ
    energy_annual = energy_per_batch * annual_batches

    # Diesel: 36 MJ/liter
    diesel_l = round(energy_annual / 36, 2)
    # Natural gas: 38.3 MJ/m³
    ng_m3 = round(energy_annual / 38.3, 2)
    # Crude oil: 42 MJ/kg
    crude_kg = round(energy_annual / 42, 2)

    # Cost saving: diesel ~$1.2/L equivalent
    saving = round(diesel_l * 1.2, 2)

    return {
        "gas_energy_mj": round(energy_annual, 2),
        "diesel_replaced_liters": diesel_l,
        "natural_gas_replaced_m3": ng_m3,
        "crude_oil_replaced_kg": crude_kg,
        "annual_fossil_saving_usd": saving,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Landfill Methane Comparison
# ═══════════════════════════════════════════════════════════════════════════════

def landfill_methane_comparison(
    weight_kg: float,
    co2_emission_g_per_kg: float,
    annual_batches: int,
) -> dict[str, Any]:
    annual_kg = weight_kg * annual_batches

    # Plastics in landfill: ~0.04 kg CH₄/kg over decomposition period
    # CH₄ GWP = 28 → 0.04 * 28 = 1.12 kg CO₂e/kg
    # Plus direct CO₂: ~1.4 kg/kg
    landfill_ch4_kg = round(0.04 * annual_kg, 2)
    landfill_co2e = round(2.52 * annual_kg, 2)  # total GHG from landfill

    pyrolysis_co2 = round(co2_emission_g_per_kg / 1000 * annual_kg, 2)

    avoided = round(landfill_co2e - pyrolysis_co2, 2)
    improvement = round((avoided / landfill_co2e) * 100, 1) if landfill_co2e > 0 else 0

    return {
        "landfill_methane_kg": landfill_ch4_kg,
        "landfill_co2e_kg": landfill_co2e,
        "pyrolysis_co2_kg": pyrolysis_co2,
        "avoided_ghg_kg_co2e": max(0, avoided),
        "improvement_pct": max(0, improvement),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 8. Incineration Emission Comparison
# ═══════════════════════════════════════════════════════════════════════════════

def incineration_comparison(
    plastic: str,
    weight_kg: float,
    co2_emission_g_per_kg: float,
    annual_batches: int,
) -> dict[str, Any]:
    annual_kg = weight_kg * annual_batches

    # Incineration CO₂: ~2.9 kg CO₂/kg plastic (stoichiometric combustion)
    incin_factor = {"PET": 2.3, "HDPE": 3.1, "LDPE": 3.1, "PP": 3.0}
    incin_co2 = round(incin_factor.get(plastic, 2.9) * annual_kg, 2)

    pyro_co2 = round(co2_emission_g_per_kg / 1000 * annual_kg, 2)
    saving = round(incin_co2 - pyro_co2, 2)

    # Pyrolysis recovers chemical energy; incineration only thermal
    energy_adv = round(15 + (CALORIFIC.get(plastic, 40) - 23) * 0.8, 1)

    return {
        "incineration_co2_kg": incin_co2,
        "pyrolysis_co2_kg": pyro_co2,
        "co2_saving_kg": max(0, saving),
        "energy_recovery_advantage_pct": energy_adv,
        "dioxin_risk_avoided": True,  # pyrolysis is oxygen-free → no dioxins
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 9. Environmental Risk Index
# ═══════════════════════════════════════════════════════════════════════════════

def environmental_risk_index(
    co2_emission_g_per_kg: float,
    gas_yield_pct: float,
    temperature_c: float,
    pressure_atm: float,
) -> dict[str, Any]:
    # Air quality risk: higher emissions & temperature → higher risk
    air = min(10, round(co2_emission_g_per_kg / 50 + temperature_c / 250, 1))

    # Water risk: minimal for pyrolysis but increases with pressure
    water = min(10, round(0.5 + pressure_atm * 0.3, 1))

    # Soil risk: residue contamination potential
    soil = min(10, round(1.0 + (100 - gas_yield_pct) * 0.05, 1))

    overall = round((air + water + soil) / 3, 1)

    if overall <= 3:
        grade = "Low Risk"
    elif overall <= 5:
        grade = "Moderate Risk"
    elif overall <= 7:
        grade = "Elevated Risk"
    else:
        grade = "High Risk"

    return {
        "air_quality_risk": air,
        "water_contamination_risk": water,
        "soil_risk": soil,
        "overall_risk_index": overall,
        "risk_grade": grade,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 10. ESG Composite Score
# ═══════════════════════════════════════════════════════════════════════════════

def esg_composite(
    co2_emission_g_per_kg: float,
    gas_yield_pct: float,
    waste_diverted_tonnes: float,
    risk_overall: float,
) -> dict[str, Any]:
    # Environmental (40% weight): yield + emission + risk
    env_yield = min(50, gas_yield_pct * 0.7)
    env_emission = max(0, 30 * (1 - co2_emission_g_per_kg / 400))
    env_risk = max(0, 20 * (1 - risk_overall / 10))
    env = round(env_yield + env_emission + env_risk, 1)

    # Social (30% weight): community benefit from waste management
    social = round(min(100, 50 + waste_diverted_tonnes * 3), 1)

    # Governance (30% weight): process standards compliance proxy
    # Higher yield + lower risk ≈ better operational governance
    gov = round(min(100, 40 + gas_yield_pct * 0.4 + (10 - risk_overall) * 3), 1)

    composite = round(env * 0.4 + social * 0.3 + gov * 0.3, 1)

    if composite >= 80:
        rating = "AAA"
    elif composite >= 70:
        rating = "AA"
    elif composite >= 60:
        rating = "A"
    elif composite >= 50:
        rating = "BBB"
    elif composite >= 40:
        rating = "BB"
    elif composite >= 30:
        rating = "B"
    else:
        rating = "CCC"

    return {
        "environmental_score": env,
        "social_score": social,
        "governance_score": gov,
        "composite_esg": composite,
        "rating": rating,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════

def run_sustainability_report(
    plastic_type: str = "HDPE",
    weight_kg: float = 5.0,
    temperature_c: float = 500,
    pressure_atm: float = 1.0,
    gas_yield_pct: Optional[float] = None,
    co2_emission_g_per_kg: Optional[float] = None,
    country_grid_factor: float = 0.82,
    annual_batches: int = 365,
) -> dict[str, Any]:
    t0 = time.perf_counter()

    key = plastic_type.strip().upper()
    valid = list(KINETIC.keys())
    if key not in valid:
        raise ValueError(f"Unknown plastic_type '{plastic_type}'. Supported: {valid}")

    # Auto-estimate if not provided
    if gas_yield_pct is None:
        gas_yield_pct = round(_est_yield(key, temperature_c), 2)
    if co2_emission_g_per_kg is None:
        co2_emission_g_per_kg = _est_emission(key, temperature_c, pressure_atm)

    # 1 — Lifecycle Assessment
    lca = lifecycle_assessment(key, weight_kg, co2_emission_g_per_kg)

    # 2 — Carbon Credits
    credits = estimate_carbon_credits(weight_kg, co2_emission_g_per_kg, annual_batches)

    # 3 — Waste Diversion
    diversion = waste_diversion_impact(key, weight_kg, annual_batches)

    # 4 — SDG Mapping
    sdg = sdg_mapping(co2_emission_g_per_kg, gas_yield_pct, diversion["waste_diverted_annual_tonnes"])

    # 5 — Tree Equivalent
    trees = tree_equivalent(credits["reduction_kg"])

    # 6 — Fossil Fuel Replacement
    fossil = fossil_fuel_replacement(key, weight_kg, gas_yield_pct, annual_batches)

    # 7 — Landfill Methane Comparison
    landfill = landfill_methane_comparison(weight_kg, co2_emission_g_per_kg, annual_batches)

    # 8 — Incineration Comparison
    incineration = incineration_comparison(key, weight_kg, co2_emission_g_per_kg, annual_batches)

    # 9 — Environmental Risk Index
    risk = environmental_risk_index(co2_emission_g_per_kg, gas_yield_pct, temperature_c, pressure_atm)

    # 10 — ESG Composite
    esg = esg_composite(
        co2_emission_g_per_kg, gas_yield_pct,
        diversion["waste_diverted_annual_tonnes"],
        risk["overall_risk_index"],
    )

    elapsed = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "success": True,
        "processing_time_ms": elapsed,
        "plastic_type": key,
        "weight_kg": weight_kg,
        "lifecycle_assessment": lca,
        "carbon_credits": credits,
        "waste_diversion": diversion,
        "sdg_mapping": sdg,
        "tree_equivalent": trees,
        "fossil_fuel_replacement": fossil,
        "landfill_comparison": landfill,
        "incineration_comparison": incineration,
        "environmental_risk_index": risk,
        "esg_composite": esg,
    }
