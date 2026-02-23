"""
Sustainability Engine API Router
==================================
FastAPI router exposing POST /sustainability/report.
"""

import logging

from fastapi import APIRouter, HTTPException

from .engine import run_sustainability_report
from .models import SustainabilityRequest, SustainabilityResponse

logger = logging.getLogger("sustainability_engine")

router = APIRouter(prefix="/sustainability", tags=["Sustainability"])


@router.post("/report", response_model=SustainabilityResponse)
async def sustainability_report(req: SustainabilityRequest):
    """
    Generate a structured sustainability report for pyrolysis operations.

    Returns 10 analyses:
      1. Lifecycle Assessment (LCA)
      2. Carbon credit estimation
      3. Waste diversion impact
      4. SDG 11/12/13 mapping
      5. Tree equivalent estimation
      6. Fossil fuel replacement
      7. Landfill methane comparison
      8. Incineration emission comparison
      9. Environmental risk index
     10. ESG composite score
    """
    try:
        result = run_sustainability_report(
            plastic_type=req.plastic_type,
            weight_kg=req.weight_kg,
            temperature_c=req.temperature_c,
            pressure_atm=req.pressure_atm,
            gas_yield_pct=req.gas_yield_pct,
            co2_emission_g_per_kg=req.co2_emission_g_per_kg,
            country_grid_factor=req.country_grid_factor,
            annual_batches=req.annual_batches,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Sustainability report failed")
        raise HTTPException(status_code=500, detail=f"Report error: {exc}")

    logger.info(
        "Sustainability report [%s] — ESG: %s (%.1f), SDG: %.1f, processed in %.1fms",
        req.plastic_type.upper(),
        result["esg_composite"]["rating"],
        result["esg_composite"]["composite_esg"],
        result["sdg_mapping"]["composite_sdg_score"],
        result["processing_time_ms"],
    )

    return SustainabilityResponse(**result)
