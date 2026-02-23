"""
Advanced Engineering Layer API Router
=======================================
FastAPI router exposing POST /engineering/advanced-engineering.
"""

import logging

from fastapi import APIRouter, HTTPException

from .engine import run_engineering_analysis
from .models import EngineeringRequest, EngineeringResponse

logger = logging.getLogger("engineering_layer")

router = APIRouter(prefix="/engineering", tags=["Advanced Engineering"])


@router.post("/advanced-engineering", response_model=EngineeringResponse)
async def advanced_engineering(req: EngineeringRequest):
    """
    Run advanced engineering analysis for pyrolysis process optimisation.

    Returns:
      - Pareto front points (yield vs emission)
      - Economic + environmental weighted scores
      - Stability zones & safety boundaries
      - Sensitivity heatmaps (temperature × pressure)
      - Efficiency degradation & reactor aging curves
      - Automated parameter tuning recommendations
      - Cost vs emission tradeoff curve
      - Mixed plastic batch optimisation (if plastic_mix provided)
    """
    try:
        mix = None
        if req.plastic_mix:
            mix = [{"plastic_type": m.plastic_type, "fraction": m.fraction} for m in req.plastic_mix]

        result = run_engineering_analysis(
            plastic_type=req.plastic_type,
            weight_kg=req.weight_kg,
            temperature_c=req.temperature_c,
            pressure_atm=req.pressure_atm,
            residence_time_min=req.residence_time_min,
            heating_rate_c_min=req.heating_rate_c_min,
            reactor_type=req.reactor_type.value,
            reactor_age_cycles=req.reactor_age_cycles,
            economic_weight=req.economic_weight,
            plastic_mix=mix,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Engineering analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis error: {exc}")

    logger.info(
        "Engineering analysis [%s] completed in %.1fms — Pareto front: %d points",
        req.plastic_type.upper(),
        result["processing_time_ms"],
        len(result["pareto_optimization"]["pareto_front"]),
    )

    return EngineeringResponse(**result)
