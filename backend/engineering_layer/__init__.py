"""
Advanced Engineering Layer Package
====================================
Multi-objective Pareto optimisation, safety analysis, reactor aging,
sensitivity mapping, and mixed-plastic batch optimization.

Usage:
    from backend.engineering_layer import run_engineering_analysis
    result = run_engineering_analysis(plastic_type="HDPE", weight_kg=5, ...)
"""

from .engine import run_engineering_analysis
from .models import EngineeringRequest, EngineeringResponse

__all__ = [
    "run_engineering_analysis",
    "EngineeringRequest",
    "EngineeringResponse",
]
