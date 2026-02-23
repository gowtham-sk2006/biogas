"""
Financial Engine
==================
Pure-Python computation engine for 10 financial / economic models.
All functions are stateless and return plain dicts.

Models
------
1.  Profit margin calculator
2.  Break-even analysis
3.  5-year ROI projection
4.  Operating cost breakdown
5.  Market energy pricing integration (mock data)
6.  Scenario-based pricing simulation
7.  Carbon credit revenue modeling
8.  Small plant feasibility calculator
9.  Government subsidy estimator
10. Community-scale viability score
"""

from __future__ import annotations

import math
import time
from typing import Any, Optional

# ─── Reference constants ─────────────────────────────────────────────────────

CALORIFIC: dict[str, float] = {
    "PET": 23.5, "HDPE": 46.5, "LDPE": 46.0, "PP": 46.4,
}

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


def _energy_per_batch_kwh(temp_c: float, weight_kg: float) -> float:
    """Approximate electricity for one batch."""
    return round(0.05 * temp_c * weight_kg / 100, 2)


def _gas_energy_mj(plastic: str, weight_kg: float, yield_pct: float) -> float:
    gas_mass = weight_kg * yield_pct / 100
    return round(gas_mass * CALORIFIC.get(plastic, 40), 2)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Profit Margin Calculator
# ═══════════════════════════════════════════════════════════════════════════════

def profit_margin(
    plastic: str, weight_kg: float, temp_c: float, pressure: float,
    annual_batches: int, elec_cost: float, feedstock_cost: float,
    labor_monthly: float, gas_price_mj: float, carbon_price: float,
) -> dict[str, Any]:
    yld = _est_yield(plastic, temp_c)
    em = _est_emission(plastic, temp_c, pressure)

    gas_mj = _gas_energy_mj(plastic, weight_kg, yld)
    gas_rev = gas_mj * gas_price_mj

    carbon_rev = max(0, (2.9 - em / 1000)) * weight_kg * carbon_price / 1000  # per batch
    revenue = round(gas_rev + carbon_rev, 2)

    energy_cost = _energy_per_batch_kwh(temp_c, weight_kg) * elec_cost
    feed_cost = weight_kg * feedstock_cost
    labor_per_batch = labor_monthly * 12 / annual_batches
    maint = energy_cost * 0.15
    cost = round(energy_cost + feed_cost + labor_per_batch + maint, 2)

    profit = round(revenue - cost, 2)
    margin = round((profit / revenue) * 100, 1) if revenue > 0 else 0

    return {
        "revenue_per_batch_usd": revenue,
        "cost_per_batch_usd": cost,
        "profit_per_batch_usd": profit,
        "margin_pct": margin,
        "annual_revenue_usd": round(revenue * annual_batches, 2),
        "annual_cost_usd": round(cost * annual_batches, 2),
        "annual_profit_usd": round(profit * annual_batches, 2),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Break-even Analysis
# ═══════════════════════════════════════════════════════════════════════════════

def break_even(
    capex: float, annual_batches: int,
    revenue_per_batch: float, cost_per_batch: float,
    labor_monthly: float,
) -> dict[str, Any]:
    fixed = capex + labor_monthly * 12
    variable = cost_per_batch - labor_monthly * 12 / annual_batches  # remove labor (already in fixed)
    variable = max(0.01, variable)

    contribution = revenue_per_batch - variable
    if contribution <= 0:
        be_batches = 999_999
    else:
        be_batches = int(math.ceil(fixed / contribution))

    be_days = int(math.ceil(be_batches / max(1, annual_batches / 365)))
    be_months = round(be_days / 30.44, 1)

    return {
        "fixed_costs_usd": round(fixed, 2),
        "variable_cost_per_batch_usd": round(variable, 2),
        "revenue_per_batch_usd": round(revenue_per_batch, 2),
        "break_even_batches": be_batches,
        "break_even_days": be_days,
        "break_even_months": be_months,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 3. 5-Year ROI Projection
# ═══════════════════════════════════════════════════════════════════════════════

def roi_projection(
    capex: float, annual_profit: float,
) -> dict[str, Any]:
    years = list(range(1, 6))
    cum_profit = [round(annual_profit * y, 2) for y in years]
    cum_roi = [round(((annual_profit * y - capex) / capex) * 100, 1) if capex > 0 else 0 for y in years]

    payback = 0
    for y in years:
        if annual_profit * y >= capex:
            payback = y
            break
    if payback == 0:
        payback = 99  # not achieved in 5 years

    return {
        "years": years,
        "cumulative_profit_usd": cum_profit,
        "cumulative_roi_pct": cum_roi,
        "payback_year": payback,
        "year_5_roi_pct": cum_roi[-1],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Operating Cost Breakdown
# ═══════════════════════════════════════════════════════════════════════════════

def cost_breakdown(
    temp_c: float, weight_kg: float, annual_batches: int,
    elec_cost: float, feedstock_cost: float, labor_monthly: float,
) -> dict[str, Any]:
    energy = round(_energy_per_batch_kwh(temp_c, weight_kg) * elec_cost * annual_batches, 2)
    feedstock = round(weight_kg * feedstock_cost * annual_batches, 2)
    labor = round(labor_monthly * 12, 2)
    maintenance = round(energy * 0.15, 2)
    other = round((energy + feedstock) * 0.05, 2)
    total = round(energy + feedstock + labor + maintenance + other, 2)

    pcts = {
        "energy_pct": round(energy / total * 100, 1) if total > 0 else 0,
        "feedstock_pct": round(feedstock / total * 100, 1) if total > 0 else 0,
        "labor_pct": round(labor / total * 100, 1) if total > 0 else 0,
        "maintenance_pct": round(maintenance / total * 100, 1) if total > 0 else 0,
        "other_pct": round(other / total * 100, 1) if total > 0 else 0,
    }

    return {
        "energy_usd": energy,
        "feedstock_usd": feedstock,
        "labor_usd": labor,
        "maintenance_usd": maintenance,
        "other_usd": other,
        "total_usd": total,
        "percentages": pcts,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Market Energy Pricing (Mock Data)
# ═══════════════════════════════════════════════════════════════════════════════

def market_pricing(gas_selling_price: float) -> dict[str, Any]:
    return {
        "current_gas_price_usd_per_mj": gas_selling_price,
        "current_oil_price_usd_per_barrel": 78.50,
        "current_carbon_price_usd_per_tonne": 25.0,
        "price_trend": "Stable with upward bias due to energy transition policies",
        "data_source": "Mock reference data (IEA/World Bank Q4 2025 estimates)",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Scenario-based Pricing Simulation
# ═══════════════════════════════════════════════════════════════════════════════

def scenario_pricing(
    plastic: str, weight_kg: float, temp_c: float,
    annual_batches: int, annual_cost: float, capex: float,
) -> dict[str, Any]:
    yld = _est_yield(plastic, temp_c)
    gas_mj = _gas_energy_mj(plastic, weight_kg, yld) * annual_batches

    scenarios_def = [
        ("Bear (low prices)", 0.008),
        ("Base case", 0.015),
        ("Bull (high prices)", 0.025),
        ("Carbon premium", 0.020),
        ("Subsidy-backed", 0.015),
    ]

    results: list[dict] = []
    for name, price in scenarios_def:
        rev = round(gas_mj * price, 2)
        if name == "Subsidy-backed":
            rev = round(rev + capex * 0.10, 2)  # 10% capex grant effect
        elif name == "Carbon premium":
            rev = round(rev + 50 * yld * weight_kg * annual_batches / 100000, 2)

        profit = round(rev - annual_cost, 2)
        roi = round(((profit * 5 - capex) / capex) * 100, 1) if capex > 0 else 0
        results.append({
            "scenario": name,
            "gas_price_usd_per_mj": price,
            "annual_revenue_usd": rev,
            "annual_profit_usd": profit,
            "roi_pct": roi,
        })

    best = max(results, key=lambda x: x["annual_profit_usd"])["scenario"]
    worst = min(results, key=lambda x: x["annual_profit_usd"])["scenario"]

    return {
        "scenarios": results,
        "best_case": best,
        "worst_case": worst,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 7. Carbon Credit Revenue Modeling
# ═══════════════════════════════════════════════════════════════════════════════

def carbon_credit_revenue(
    plastic: str, weight_kg: float, temp_c: float, pressure: float,
    annual_batches: int, carbon_price: float, annual_revenue: float,
) -> dict[str, Any]:
    em = _est_emission(plastic, temp_c, pressure) / 1000  # kg per kg feedstock
    baseline = 2.9  # incineration baseline kg CO₂ per kg
    reduction_per_batch = max(0, (baseline - em) * weight_kg)
    annual_tonnes = round(reduction_per_batch * annual_batches / 1000, 3)
    annual_rev = round(annual_tonnes * carbon_price, 2)
    five_yr = round(annual_rev * 5, 2)
    share = round((annual_rev / annual_revenue) * 100, 1) if annual_revenue > 0 else 0

    return {
        "annual_reduction_tonnes": annual_tonnes,
        "annual_credit_revenue_usd": annual_rev,
        "five_year_revenue_usd": five_yr,
        "revenue_share_pct": share,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 8. Small Plant Feasibility Calculator
# ═══════════════════════════════════════════════════════════════════════════════

def plant_feasibility(
    weight_kg: float, annual_batches: int, capex: float,
    annual_cost: float, annual_revenue: float,
    discount_rate: float = 0.10,
) -> dict[str, Any]:
    daily_cap = round(weight_kg * annual_batches / 365, 1)
    annual_cap = round(weight_kg * annual_batches / 1000, 2)

    annual_profit = annual_revenue - annual_cost

    # NPV over 5 years
    npv = -capex
    for y in range(1, 6):
        npv += annual_profit / ((1 + discount_rate) ** y)
    npv = round(npv, 2)

    # IRR approximation via bisection
    irr = 0.0
    for r in [i * 0.01 for i in range(-20, 200)]:
        test_npv = -capex
        for y in range(1, 6):
            test_npv += annual_profit / ((1 + r) ** y)
        if test_npv <= 0:
            irr = r - 0.01
            break
    else:
        irr = 1.99
    irr = round(irr * 100, 1)

    if npv > capex * 0.5 and irr > 15:
        grade = "Highly Feasible"
    elif npv > 0 and irr > 8:
        grade = "Feasible"
    elif npv > -capex * 0.2:
        grade = "Marginal"
    else:
        grade = "Not Feasible"

    return {
        "daily_capacity_kg": daily_cap,
        "annual_capacity_tonnes": annual_cap,
        "capex_usd": capex,
        "annual_opex_usd": round(annual_cost, 2),
        "annual_revenue_usd": round(annual_revenue, 2),
        "npv_5yr_usd": npv,
        "irr_pct": irr,
        "feasibility_grade": grade,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 9. Government Subsidy Estimator
# ═══════════════════════════════════════════════════════════════════════════════

def subsidy_estimate(
    country: str, capex: float,
) -> dict[str, Any]:
    # Mock subsidy data by country
    subsidy_data = {
        "India": {
            "pct": 0.30,
            "type": "Swachh Bharat Mission / MNRE capital subsidy",
            "notes": "Up to 30% capital subsidy for waste-to-energy projects under MNRE guidelines.",
        },
        "USA": {
            "pct": 0.26,
            "type": "Investment Tax Credit (ITC) / EPA grants",
            "notes": "26% ITC for qualifying renewable energy + potential EPA DERA grants.",
        },
        "UK": {
            "pct": 0.20,
            "type": "Green Heat Network Fund / Innovate UK",
            "notes": "Capital grants up to 20% for circular economy innovations.",
        },
        "Germany": {
            "pct": 0.25,
            "type": "KfW Environmental Programme",
            "notes": "Low-interest loans + up to 25% capital grant for waste management tech.",
        },
        "Brazil": {
            "pct": 0.15,
            "type": "BNDES Green Finance Line",
            "notes": "Concessional financing with ~15% effective subsidy for clean tech.",
        },
    }

    key = country.strip().title()
    data = subsidy_data.get(key, {
        "pct": 0.10,
        "type": "General clean technology incentive (estimated)",
        "notes": f"Generic 10% estimate for {key}. Check local government programs.",
    })

    subsidy_usd = round(capex * data["pct"], 2)
    effective_capex = round(capex - subsidy_usd, 2)

    return {
        "country": key,
        "estimated_subsidy_usd": subsidy_usd,
        "subsidy_type": data["type"],
        "capex_offset_pct": round(data["pct"] * 100, 1),
        "effective_capex_usd": effective_capex,
        "notes": data["notes"],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 10. Community-Scale Viability Score
# ═══════════════════════════════════════════════════════════════════════════════

def community_viability(
    weight_kg: float, annual_batches: int,
    annual_profit: float, capex: float,
) -> dict[str, Any]:
    daily_kg = weight_kg * annual_batches / 365

    # Average household generates ~0.5 kg plastic waste/day
    households = max(1, int(math.ceil(daily_kg / 0.5)))

    # Community energy savings (gas replacing LPG at ~$0.80/kg LPG)
    savings = round(annual_profit * 0.6, 2)  # 60% passed to community

    # Jobs: 1 per 50 kg/day throughput
    jobs = max(1, int(math.ceil(daily_kg / 50)))

    # Viability score
    score_profit = min(30, max(0, (annual_profit / capex) * 100)) if capex > 0 else 0
    score_scale = min(30, daily_kg / 5)  # up to 30 for 150+ kg/day
    score_community = min(20, households / 50 * 20)  # community size factor
    score_jobs = min(20, jobs * 5)

    total = round(score_profit + score_scale + score_community + score_jobs, 1)
    total = min(100, max(0, total))

    if total >= 75:
        grade = "Highly Viable"
    elif total >= 55:
        grade = "Viable"
    elif total >= 35:
        grade = "Marginally Viable"
    else:
        grade = "Not Viable"

    narrative = (
        f"A community of ~{households} households generating {daily_kg:.0f} kg/day "
        f"of plastic waste can sustain this plant, creating {jobs} job(s) and "
        f"saving the community ~${savings:,.0f}/year in energy costs."
    )

    return {
        "viability_score": total,
        "grade": grade,
        "min_households": households,
        "waste_needed_kg_per_day": round(daily_kg, 1),
        "community_savings_usd_annual": savings,
        "jobs_created": jobs,
        "narrative": narrative,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Orchestrator
# ═══════════════════════════════════════════════════════════════════════════════

def run_financial_analysis(
    plastic_type: str = "HDPE",
    weight_kg: float = 5.0,
    temperature_c: float = 500,
    pressure_atm: float = 1.0,
    annual_batches: int = 365,
    electricity_cost_per_kwh: float = 0.10,
    feedstock_cost_per_kg: float = 0.05,
    labor_monthly_usd: float = 2000,
    plant_capex_usd: float = 50_000,
    carbon_credit_price_usd: float = 25.0,
    gas_selling_price_per_mj: float = 0.015,
    country: str = "India",
) -> dict[str, Any]:
    t0 = time.perf_counter()

    key = plastic_type.strip().upper()
    if key not in KINETIC:
        raise ValueError(f"Unknown plastic_type '{plastic_type}'. Supported: {list(KINETIC.keys())}")

    # 1 — Profit margin
    pm = profit_margin(
        key, weight_kg, temperature_c, pressure_atm, annual_batches,
        electricity_cost_per_kwh, feedstock_cost_per_kg, labor_monthly_usd,
        gas_selling_price_per_mj, carbon_credit_price_usd,
    )

    # 2 — Break-even
    be = break_even(
        plant_capex_usd, annual_batches,
        pm["revenue_per_batch_usd"], pm["cost_per_batch_usd"],
        labor_monthly_usd,
    )

    # 3 — ROI projection
    roi = roi_projection(plant_capex_usd, pm["annual_profit_usd"])

    # 4 — Cost breakdown
    costs = cost_breakdown(
        temperature_c, weight_kg, annual_batches,
        electricity_cost_per_kwh, feedstock_cost_per_kg, labor_monthly_usd,
    )

    # 5 — Market pricing
    mkt = market_pricing(gas_selling_price_per_mj)

    # 6 — Scenario pricing
    scenarios = scenario_pricing(
        key, weight_kg, temperature_c, annual_batches,
        pm["annual_cost_usd"], plant_capex_usd,
    )

    # 7 — Carbon credit revenue
    carbon = carbon_credit_revenue(
        key, weight_kg, temperature_c, pressure_atm,
        annual_batches, carbon_credit_price_usd, pm["annual_revenue_usd"],
    )

    # 8 — Plant feasibility
    feasibility = plant_feasibility(
        weight_kg, annual_batches, plant_capex_usd,
        pm["annual_cost_usd"], pm["annual_revenue_usd"],
    )

    # 9 — Subsidy estimate
    subsidy = subsidy_estimate(country, plant_capex_usd)

    # 10 — Community viability
    community = community_viability(
        weight_kg, annual_batches,
        pm["annual_profit_usd"], plant_capex_usd,
    )

    elapsed = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "success": True,
        "processing_time_ms": elapsed,
        "plastic_type": key,
        "weight_kg": weight_kg,
        "profit_margin": pm,
        "break_even": be,
        "roi_projection": roi,
        "cost_breakdown": costs,
        "market_pricing": mkt,
        "scenario_simulation": scenarios,
        "carbon_credit_revenue": carbon,
        "plant_feasibility": feasibility,
        "subsidy_estimate": subsidy,
        "community_viability": community,
    }
