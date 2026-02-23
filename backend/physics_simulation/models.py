"""
Pydantic Schemas for Physics Simulation
========================================
Request and response models for the POST /simulate-physics endpoint.
All time-series outputs use plain lists for direct JSON serialisation.
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

class PhysicsSimulationRequest(BaseModel):
    plastic_type: str = Field(
        ..., description="PET, HDPE, LDPE, or PP (case-insensitive)"
    )
    weight_kg: float = Field(..., gt=0, description="Feedstock mass in kg")
    temperature_c: float = Field(
        ..., ge=200, le=800, description="Target reactor temperature in °C"
    )
    pressure_atm: float = Field(
        ..., ge=0.5, le=20, description="Operating pressure in atm"
    )
    residence_time_min: float = Field(
        default=60, ge=5, le=300, description="Total residence time in minutes"
    )
    heating_rate_c_min: float = Field(
        default=20, ge=1, le=200, description="Heating rate in °C/min"
    )
    reactor_type: ReactorType = Field(
        default=ReactorType.batch, description="Reactor configuration"
    )
    oxygen_ingress_pct: float = Field(
        default=0.5, ge=0, le=10,
        description="Oxygen leakage into reactor as vol-%",
    )


# ─── Time-series sub-models ──────────────────────────────────────────────────

class TemperatureRampResult(BaseModel):
    time_min: list[float]
    temperature_c: list[float]
    stage_labels: list[str] = Field(
        ..., description="'ramp' or 'hold' for each time step"
    )


class ArrheniusDegradationResult(BaseModel):
    time_min: list[float]
    reaction_rate: list[float]
    mass_remaining_frac: list[float]


class GasEvolutionResult(BaseModel):
    time_min: list[float]
    cumulative_yield_pct: list[float]
    instantaneous_rate: list[float]


class ResidenceTimeOptResult(BaseModel):
    residence_times_min: list[float]
    yield_pct: list[float]
    optimal_residence_time_min: float
    optimal_yield_pct: float


class HeatTransferResult(BaseModel):
    time_min: list[float]
    particle_temp_c: list[float]
    heat_flux_w_m2: list[float]


class ReactorSimResult(BaseModel):
    reactor_type: str
    mixing_efficiency: float
    heat_transfer_coeff: float
    residence_time_distribution: list[float]
    time_min: list[float]
    conversion_pct: list[float]


class CharPredictionResult(BaseModel):
    time_min: list[float]
    char_fraction: list[float]
    final_char_pct: float


class TarFormationResult(BaseModel):
    time_min: list[float]
    tar_fraction: list[float]
    peak_tar_pct: float
    peak_tar_time_min: float


class OxygenLeakageResult(BaseModel):
    time_min: list[float]
    o2_concentration_pct: list[float]
    oxidation_loss_pct: list[float]
    total_mass_loss_pct: float


class PressureFluctuationResult(BaseModel):
    time_min: list[float]
    pressure_atm: list[float]
    stability_index: float = Field(
        ..., ge=0, le=1,
        description="1 = perfectly stable, 0 = highly unstable",
    )
    max_deviation_atm: float


# ─── Response ─────────────────────────────────────────────────────────────────

class PhysicsSimulationResponse(BaseModel):
    success: bool = True
    processing_time_ms: float
    plastic_type: str
    weight_kg: float
    reactor_type: str

    temperature_ramp: TemperatureRampResult
    arrhenius_degradation: ArrheniusDegradationResult
    gas_evolution: GasEvolutionResult
    residence_time_optimization: ResidenceTimeOptResult
    heat_transfer: HeatTransferResult
    reactor_simulation: ReactorSimResult
    char_prediction: CharPredictionResult
    tar_formation: TarFormationResult
    oxygen_leakage: OxygenLeakageResult
    pressure_fluctuation: PressureFluctuationResult
