"""
Physics Simulation API Router
===============================
FastAPI router exposing POST /physics/simulate-physics.
"""

import logging

from fastapi import APIRouter, HTTPException

from .engine import run_simulation
from .models import PhysicsSimulationRequest, PhysicsSimulationResponse

logger = logging.getLogger("physics_simulation")

router = APIRouter(prefix="/physics", tags=["Physics Simulation"])


@router.post("/simulate-physics", response_model=PhysicsSimulationResponse)
async def simulate_physics(req: PhysicsSimulationRequest):
    """
    Run a full pyrolysis physics simulation.

    Accepts reactor parameters and returns time-series arrays for
    10 physics models:
      1. Temperature ramp
      2. Arrhenius degradation
      3. Gas evolution
      4. Residence time optimisation
      5. Heat transfer
      6. Reactor type simulation
      7. Char prediction
      8. Tar formation
      9. Oxygen leakage
     10. Pressure fluctuation
    """
    try:
        result = run_simulation(
            plastic_type=req.plastic_type,
            weight_kg=req.weight_kg,
            temperature_c=req.temperature_c,
            pressure_atm=req.pressure_atm,
            residence_time_min=req.residence_time_min,
            heating_rate_c_min=req.heating_rate_c_min,
            reactor_type=req.reactor_type.value,
            oxygen_ingress_pct=req.oxygen_ingress_pct,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Physics simulation failed")
        raise HTTPException(status_code=500, detail=f"Simulation error: {exc}")

    logger.info(
        "Physics simulation [%s] reactor=%s completed in %.1fms",
        req.plastic_type.upper(),
        req.reactor_type.value,
        result["processing_time_ms"],
    )

    return PhysicsSimulationResponse(**result)
