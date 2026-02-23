"""
Sustainability Engine Package
================================
Lifecycle assessment, carbon credits, SDG mapping, ESG scoring,
and environmental comparisons for pyrolysis operations.

Usage:
    from backend.sustainability_engine import run_sustainability_report
    result = run_sustainability_report(plastic_type="HDPE", weight_kg=5, ...)
"""

from .engine import run_sustainability_report
from .models import SustainabilityRequest, SustainabilityResponse

__all__ = [
    "run_sustainability_report",
    "SustainabilityRequest",
    "SustainabilityResponse",
]
