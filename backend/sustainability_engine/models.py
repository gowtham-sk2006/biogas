"""
Pydantic Schemas for Sustainability Engine
=============================================
Request and response models for POST /sustainability/report.
"""

from typing import Optional

from pydantic import BaseModel, Field


# ─── Request ──────────────────────────────────────────────────────────────────

class SustainabilityRequest(BaseModel):
    plastic_type: str = Field(
        default="HDPE", description="PET, HDPE, LDPE, or PP"
    )
    weight_kg: float = Field(default=5.0, gt=0, description="Feedstock mass in kg")
    temperature_c: float = Field(
        default=500, ge=200, le=800, description="Reactor temperature °C"
    )
    pressure_atm: float = Field(
        default=1.0, ge=0.5, le=20, description="Operating pressure atm"
    )
    gas_yield_pct: Optional[float] = Field(
        default=None, ge=0, le=100,
        description="Override gas yield %; auto-estimated if omitted",
    )
    co2_emission_g_per_kg: Optional[float] = Field(
        default=None, ge=0,
        description="Override CO₂ emission g/kg; auto-estimated if omitted",
    )
    country_grid_factor: float = Field(
        default=0.82,
        description="National grid emission factor kg CO₂/kWh (default: India)",
    )
    annual_batches: int = Field(
        default=365, ge=1, le=100_000,
        description="Projected batches per year for annualized metrics",
    )


# ─── Sub-result models ───────────────────────────────────────────────────────

class LifecyclePhase(BaseModel):
    phase: str
    co2_kg: float
    energy_mj: float
    water_liters: float


class LifecycleAssessment(BaseModel):
    phases: list[LifecyclePhase]
    total_co2_kg: float
    total_energy_mj: float
    total_water_liters: float
    net_benefit_vs_landfill_pct: float


class CarbonCreditResult(BaseModel):
    baseline_emission_kg: float
    pyrolysis_emission_kg: float
    reduction_kg: float
    credits_earned: float
    credit_value_usd: float
    methodology: str


class WasteDiversionResult(BaseModel):
    waste_diverted_kg: float
    waste_diverted_annual_tonnes: float
    landfill_volume_saved_m3: float
    diversion_rate_pct: float


class SDGScore(BaseModel):
    sdg_11_sustainable_cities: float = Field(..., ge=0, le=100)
    sdg_12_responsible_consumption: float = Field(..., ge=0, le=100)
    sdg_13_climate_action: float = Field(..., ge=0, le=100)
    composite_sdg_score: float = Field(..., ge=0, le=100)
    narrative: str


class TreeEquivalent(BaseModel):
    co2_offset_kg_annual: float
    trees_equivalent_annual: int
    trees_equivalent_lifetime_20yr: int
    forest_area_hectares: float


class FossilFuelReplacement(BaseModel):
    gas_energy_mj: float
    diesel_replaced_liters: float
    natural_gas_replaced_m3: float
    crude_oil_replaced_kg: float
    annual_fossil_saving_usd: float


class LandfillComparison(BaseModel):
    landfill_methane_kg: float
    landfill_co2e_kg: float
    pyrolysis_co2_kg: float
    avoided_ghg_kg_co2e: float
    improvement_pct: float


class IncinerationComparison(BaseModel):
    incineration_co2_kg: float
    pyrolysis_co2_kg: float
    co2_saving_kg: float
    energy_recovery_advantage_pct: float
    dioxin_risk_avoided: bool


class EnvironmentalRiskIndex(BaseModel):
    air_quality_risk: float = Field(..., ge=0, le=10)
    water_contamination_risk: float = Field(..., ge=0, le=10)
    soil_risk: float = Field(..., ge=0, le=10)
    overall_risk_index: float = Field(..., ge=0, le=10)
    risk_grade: str


class ESGComposite(BaseModel):
    environmental_score: float = Field(..., ge=0, le=100)
    social_score: float = Field(..., ge=0, le=100)
    governance_score: float = Field(..., ge=0, le=100)
    composite_esg: float = Field(..., ge=0, le=100)
    rating: str


# ─── Response ─────────────────────────────────────────────────────────────────

class SustainabilityResponse(BaseModel):
    success: bool = True
    processing_time_ms: float
    plastic_type: str
    weight_kg: float

    lifecycle_assessment: LifecycleAssessment
    carbon_credits: CarbonCreditResult
    waste_diversion: WasteDiversionResult
    sdg_mapping: SDGScore
    tree_equivalent: TreeEquivalent
    fossil_fuel_replacement: FossilFuelReplacement
    landfill_comparison: LandfillComparison
    incineration_comparison: IncinerationComparison
    environmental_risk_index: EnvironmentalRiskIndex
    esg_composite: ESGComposite
