"""
Financial Engine API Router
==============================
FastAPI router exposing POST /financial/analysis.
"""

import logging

from fastapi import APIRouter, HTTPException

from .engine import run_financial_analysis
from .models import FinancialRequest, FinancialResponse

logger = logging.getLogger("financial_engine")

router = APIRouter(prefix="/financial", tags=["Financial Analysis"])


@router.post("/analysis", response_model=FinancialResponse)
async def financial_analysis(req: FinancialRequest):
    """
    Run comprehensive financial analysis for a pyrolysis plant.

    Returns 10 analyses:
      1. Profit margin calculator
      2. Break-even analysis
      3. 5-year ROI projection
      4. Operating cost breakdown
      5. Market energy pricing
      6. Scenario-based pricing simulation
      7. Carbon credit revenue modeling
      8. Small plant feasibility (NPV / IRR)
      9. Government subsidy estimator
     10. Community-scale viability score
    """
    try:
        result = run_financial_analysis(
            plastic_type=req.plastic_type,
            weight_kg=req.weight_kg,
            temperature_c=req.temperature_c,
            pressure_atm=req.pressure_atm,
            annual_batches=req.annual_batches,
            electricity_cost_per_kwh=req.electricity_cost_per_kwh,
            feedstock_cost_per_kg=req.feedstock_cost_per_kg,
            labor_monthly_usd=req.labor_monthly_usd,
            plant_capex_usd=req.plant_capex_usd,
            carbon_credit_price_usd=req.carbon_credit_price_usd,
            gas_selling_price_per_mj=req.gas_selling_price_per_mj,
            country=req.country,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Financial analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis error: {exc}")

    logger.info(
        "Financial analysis [%s] — Margin: %.1f%%, Payback: Y%d, processed in %.1fms",
        req.plastic_type.upper(),
        result["profit_margin"]["margin_pct"],
        result["roi_projection"]["payback_year"],
        result["processing_time_ms"],
    )

    return FinancialResponse(**result)
