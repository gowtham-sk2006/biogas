"""
Physics Simulation Package
============================
Pyrolysis physics simulation models for temperature ramp, Arrhenius degradation,
gas evolution, heat transfer, reactor simulation, char/tar prediction,
oxygen leakage, and pressure stability.

Usage:
    from backend.physics_simulation import run_simulation
    result = run_simulation(plastic_type="HDPE", weight_kg=5, ...)
"""

from .engine import run_simulation
from .models import PhysicsSimulationRequest, PhysicsSimulationResponse

__all__ = [
    "run_simulation",
    "PhysicsSimulationRequest",
    "PhysicsSimulationResponse",
]
