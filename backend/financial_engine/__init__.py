"""
Financial Engine Package
==========================
Profit analysis, ROI projection, break-even, feasibility,
subsidies, and community viability for pyrolysis operations.

Usage:
    from backend.financial_engine import run_financial_analysis
    result = run_financial_analysis(plastic_type="HDPE", weight_kg=5, ...)
"""

from .engine import run_financial_analysis
from .models import FinancialRequest, FinancialResponse

__all__ = [
    "run_financial_analysis",
    "FinancialRequest",
    "FinancialResponse",
]
