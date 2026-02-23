"""
Pydantic Schemas for Advanced Engineering Layer
=================================================
Request and response models for POST /advanced-engineering.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class ReactorType(str, Enum):
    batch = "batch"
    fluidized_bed = "fluidized_bed"
    rotary_kiln = "rotary_kiln"


# ─── Request ──────────────────────────────────────────────────────────────────

class PlasticMix(BaseModel):
    plastic_type: str = Field(..., description="PET, HDPE, LDPE, or PP")
    fraction: float = Field(..., gt=0, le=1, description="Mass fraction (0–1)")


class EngineeringRequest(BaseModel):
    plastic_type: str = Field(
        default="HDPE", description="Primary plastic (PET, HDPE, LDPE, PP)"
    )
    weight_kg: float = Field(default=5.0, gt=0, description="Feedstock mass in kg")
    temperature_c: float = Field(
        default=500, ge=200, le=800, description="Reactor temperature °C"
    )
    pressure_atm: float = Field(
        default=1.0, ge=0.5, le=20, description="Operating pressure atm"
    )
    residence_time_min: float = Field(default=60, ge=5, le=300)
    heating_rate_c_min: float = Field(default=20, ge=1, le=200)
    reactor_type: ReactorType = Field(default=ReactorType.batch)
    reactor_age_cycles: int = Field(
        default=0, ge=0, le=10000,
        description="Number of completed cycles for aging model",
    )
    economic_weight: float = Field(
        default=0.5, ge=0, le=1,
        description="Weight for economic score (1 - this = environmental weight)",
    )
    plastic_mix: Optional[list[PlasticMix]] = Field(
        default=None,
        description="Optional mixed-plastic batch (overrides plastic_type if provided)",
    )


# ─── Sub-result models ───────────────────────────────────────────────────────

class ParetoPoint(BaseModel):
    temperature_c: float
    pressure_atm: float
    yield_pct: float
    emission_score: float
    economic_score: float
    combined_score: float


class ParetoResult(BaseModel):
    pareto_front: list[ParetoPoint]
    dominated_points: list[ParetoPoint]
    utopia_point: ParetoPoint


class EconEnvScore(BaseModel):
    economic_score: float
    environmental_score: float
    combined_score: float
    grade: str


class StabilityZone(BaseModel):
    temp_min_c: float
    temp_max_c: float
    pressure_min_atm: float
    pressure_max_atm: float
    label: str = Field(..., description="safe / marginal / unsafe")


class StabilityResult(BaseModel):
    zones: list[StabilityZone]
    current_zone: str


class SensitivityHeatmap(BaseModel):
    temperature_range: list[float]
    pressure_range: list[float]
    yield_matrix: list[list[float]]
    emission_matrix: list[list[float]]


class SafetyBoundary(BaseModel):
    max_safe_temperature_c: float
    max_safe_pressure_atm: float
    min_safe_residence_min: float
    safety_margin_pct: float
    is_within_bounds: bool


class DegradationResult(BaseModel):
    cycle_numbers: list[int]
    efficiency_pct: list[float]
    predicted_failure_cycle: int


class ReactorAgingResult(BaseModel):
    age_cycles: int
    efficiency_factor: float
    maintenance_urgency: str
    next_maintenance_cycle: int
    remaining_useful_life_pct: float


class TuningAdvice(BaseModel):
    parameter: str
    current_value: float
    suggested_value: float
    expected_improvement_pct: float
    reasoning: str


class TuningResult(BaseModel):
    recommendations: list[TuningAdvice]
    overall_improvement_pct: float


class TradeoffPoint(BaseModel):
    cost_usd: float
    emission_kg_co2: float
    temperature_c: float
    pressure_atm: float


class TradeoffResult(BaseModel):
    tradeoff_curve: list[TradeoffPoint]
    optimal_point: TradeoffPoint


class MixedBatchResult(BaseModel):
    blend_yield_pct: float
    blend_emission: float
    blend_risk: str
    per_plastic: list[dict]
    optimal_temperature_c: float
    optimal_pressure_atm: float


# ─── Response ─────────────────────────────────────────────────────────────────

class EngineeringResponse(BaseModel):
    success: bool = True
    processing_time_ms: float

    pareto_optimization: ParetoResult
    economic_environmental_score: EconEnvScore
    stability_zones: StabilityResult
    sensitivity_heatmap: SensitivityHeatmap
    safety_boundary: SafetyBoundary
    efficiency_degradation: DegradationResult
    reactor_aging: ReactorAgingResult
    tuning_advisor: TuningResult
    cost_emission_tradeoff: TradeoffResult
    mixed_batch_optimization: Optional[MixedBatchResult] = None
