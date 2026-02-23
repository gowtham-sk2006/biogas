"""
Pydantic Schemas for Financial Engine
========================================
Request and response models for POST /financial/analysis.
"""

from typing import Optional

from pydantic import BaseModel, Field


# ─── Request ──────────────────────────────────────────────────────────────────

class FinancialRequest(BaseModel):
    plastic_type: str = Field(default="HDPE", description="PET, HDPE, LDPE, or PP")
    weight_kg: float = Field(default=5.0, gt=0, description="Feedstock mass per batch (kg)")
    temperature_c: float = Field(default=500, ge=200, le=800)
    pressure_atm: float = Field(default=1.0, ge=0.5, le=20)
    annual_batches: int = Field(default=365, ge=1, le=100_000)
    electricity_cost_per_kwh: float = Field(default=0.10, ge=0, description="USD/kWh")
    feedstock_cost_per_kg: float = Field(default=0.05, ge=0, description="USD/kg")
    labor_monthly_usd: float = Field(default=2000, ge=0)
    plant_capex_usd: float = Field(default=50_000, ge=0, description="Total capital expenditure")
    carbon_credit_price_usd: float = Field(default=25.0, ge=0, description="USD per tonne CO₂")
    gas_selling_price_per_mj: float = Field(default=0.015, ge=0, description="USD per MJ of gas sold")
    country: str = Field(default="India", description="Country for subsidy estimation")


# ─── Sub-result models ───────────────────────────────────────────────────────

class ProfitMargin(BaseModel):
    revenue_per_batch_usd: float
    cost_per_batch_usd: float
    profit_per_batch_usd: float
    margin_pct: float
    annual_revenue_usd: float
    annual_cost_usd: float
    annual_profit_usd: float


class BreakEvenResult(BaseModel):
    fixed_costs_usd: float
    variable_cost_per_batch_usd: float
    revenue_per_batch_usd: float
    break_even_batches: int
    break_even_days: int
    break_even_months: float


class ROIProjection(BaseModel):
    years: list[int]
    cumulative_profit_usd: list[float]
    cumulative_roi_pct: list[float]
    payback_year: int
    year_5_roi_pct: float


class CostBreakdown(BaseModel):
    energy_usd: float
    feedstock_usd: float
    labor_usd: float
    maintenance_usd: float
    other_usd: float
    total_usd: float
    percentages: dict[str, float]


class MarketPricing(BaseModel):
    current_gas_price_usd_per_mj: float
    current_oil_price_usd_per_barrel: float
    current_carbon_price_usd_per_tonne: float
    price_trend: str
    data_source: str


class ScenarioPricing(BaseModel):
    scenario: str
    gas_price_usd_per_mj: float
    annual_revenue_usd: float
    annual_profit_usd: float
    roi_pct: float


class ScenarioResult(BaseModel):
    scenarios: list[ScenarioPricing]
    best_case: str
    worst_case: str


class CarbonRevenueModel(BaseModel):
    annual_reduction_tonnes: float
    annual_credit_revenue_usd: float
    five_year_revenue_usd: float
    revenue_share_pct: float


class PlantFeasibility(BaseModel):
    daily_capacity_kg: float
    annual_capacity_tonnes: float
    capex_usd: float
    annual_opex_usd: float
    annual_revenue_usd: float
    npv_5yr_usd: float
    irr_pct: float
    feasibility_grade: str


class SubsidyEstimate(BaseModel):
    country: str
    estimated_subsidy_usd: float
    subsidy_type: str
    capex_offset_pct: float
    effective_capex_usd: float
    notes: str


class CommunityViability(BaseModel):
    viability_score: float = Field(..., ge=0, le=100)
    grade: str
    min_households: int
    waste_needed_kg_per_day: float
    community_savings_usd_annual: float
    jobs_created: int
    narrative: str


# ─── Response ─────────────────────────────────────────────────────────────────

class FinancialResponse(BaseModel):
    success: bool = True
    processing_time_ms: float
    plastic_type: str
    weight_kg: float

    profit_margin: ProfitMargin
    break_even: BreakEvenResult
    roi_projection: ROIProjection
    cost_breakdown: CostBreakdown
    market_pricing: MarketPricing
    scenario_simulation: ScenarioResult
    carbon_credit_revenue: CarbonRevenueModel
    plant_feasibility: PlantFeasibility
    subsidy_estimate: SubsidyEstimate
    community_viability: CommunityViability
