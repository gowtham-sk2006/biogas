"""
Advanced AI Optimization Router
=================================
FastAPI router exposing POST /advanced-ai-optimize endpoint.
Orchestrates all AI intelligence modules:
  - Bayesian optimization (Optuna)
  - Ensemble prediction (RF + XGBoost)
  - Uncertainty estimation (bootstrap CI)
  - RL temperature recommendation (Q-learning)
  - Model explainability (SHAP)

Does NOT modify any existing endpoints.
"""

import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("ai_intelligence.router")

router = APIRouter(prefix="/advanced-ai", tags=["Advanced AI"])


# ─── Request / Response Schemas ───────────────────────────────────────────────

class AdvancedOptimizeRequest(BaseModel):
    plastic_type: str = Field(..., description="PET, HDPE, LDPE, or PP")
    weight: float = Field(..., gt=0, description="Feedstock weight in kg")
    temperature: Optional[float] = Field(None, ge=200, le=800, description="Current temperature °C (for RL)")
    pressure: Optional[float] = Field(None, ge=0.5, le=20, description="Current pressure bar (for RL)")
    n_trials: int = Field(default=20, ge=10, le=100, description="Bayesian optimization trials")
    yield_weight: float = Field(default=0.6, ge=0, le=1, description="Yield priority weight")
    emission_weight: float = Field(default=0.4, ge=0, le=1, description="Emission penalty weight")
    enable_rl: bool = Field(default=True, description="Enable RL temperature recommendation")
    enable_bayesian: bool = Field(default=True, description="Enable Bayesian optimization")
    enable_ensemble: bool = Field(default=True, description="Enable ensemble prediction")
    enable_uncertainty: bool = Field(default=True, description="Enable uncertainty estimation")
    enable_explainability: bool = Field(default=True, description="Enable SHAP explainability")


class AdvancedOptimizeResponse(BaseModel):
    success: bool = True
    processing_time_ms: float
    plastic_type: str
    weight_kg: float

    # Bayesian optimization results
    bayesian_optimization: Optional[dict] = None

    # Ensemble prediction
    ensemble_prediction: Optional[dict] = None

    # Uncertainty bounds
    uncertainty: Optional[dict] = None

    # RL recommendation
    rl_recommendation: Optional[dict] = None

    # SHAP explainability
    explainability: Optional[dict] = None

    # Errors (non-fatal)
    warnings: list[str] = Field(default_factory=list)


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/optimize", response_model=AdvancedOptimizeResponse)
async def advanced_ai_optimize(req: AdvancedOptimizeRequest):
    """
    Advanced AI-powered optimization combining multiple techniques:

    - **Bayesian Optimization** (Optuna TPE) — efficient parameter search
    - **Ensemble Model** (RF + XGBoost) — robust weighted predictions
    - **Uncertainty Estimation** (Bootstrap) — 95% confidence intervals
    - **RL Recommendation** (Q-learning) — adaptive temperature suggestion
    - **Explainability** (SHAP) — top-5 feature importance

    Each component can be individually enabled/disabled.
    """
    t0 = time.perf_counter()

    key = req.plastic_type.strip().upper()
    valid_types = ["PET", "HDPE", "LDPE", "PP"]
    if key not in valid_types:
        raise HTTPException(status_code=422, detail=f"Invalid plastic_type. Must be one of {valid_types}")

    # Import the existing predict function (used as environment)
    from optimize_pyrolysis import predict as ml_predict

    warnings: list[str] = []
    result = AdvancedOptimizeResponse(
        success=True,
        processing_time_ms=0,
        plastic_type=key,
        weight_kg=req.weight,
    )

    # Default temperature/pressure for modules that need it
    temperature = req.temperature or 450.0
    pressure = req.pressure or 5.0

    # ── 1. Bayesian Optimization ─────────────────────────────────────────
    if req.enable_bayesian:
        try:
            from .bayesian_optimizer import bayesian_optimize
            result.bayesian_optimization = bayesian_optimize(
                predict_fn=ml_predict,
                plastic_type=key,
                weight=req.weight,
                n_trials=req.n_trials,
                yield_weight=req.yield_weight,
                emission_weight=req.emission_weight,
            )
            # Use Bayesian-optimal params for downstream modules
            temperature = result.bayesian_optimization["optimal_temperature_c"]
            pressure = result.bayesian_optimization["optimal_pressure_atm"]
        except ImportError as e:
            warnings.append(f"Bayesian optimization skipped: {e}")
            logger.warning("Bayesian optimization unavailable: %s", e)
        except Exception as e:
            warnings.append(f"Bayesian optimization error: {e}")
            logger.error("Bayesian optimization failed: %s", e, exc_info=True)

    # ── 2. Ensemble Prediction ───────────────────────────────────────────
    if req.enable_ensemble:
        try:
            from .ensemble_model import EnsemblePyrolysisModel
            ensemble = EnsemblePyrolysisModel()
            result.ensemble_prediction = ensemble.predict(
                plastic_type=key,
                temperature=temperature,
                weight=req.weight,
                pressure=pressure,
            )
        except Exception as e:
            warnings.append(f"Ensemble prediction error: {e}")
            logger.error("Ensemble prediction failed: %s", e, exc_info=True)

    # ── 3. Uncertainty Estimation ────────────────────────────────────────
    if req.enable_uncertainty:
        try:
            from .uncertainty import bootstrap_confidence_interval
            result.uncertainty = bootstrap_confidence_interval(
                predict_fn=ml_predict,
                plastic_type=key,
                temperature=temperature,
                weight=req.weight,
                pressure=pressure,
            )
        except Exception as e:
            warnings.append(f"Uncertainty estimation error: {e}")
            logger.error("Uncertainty estimation failed: %s", e, exc_info=True)

    # ── 4. RL Recommendation ─────────────────────────────────────────────
    if req.enable_rl:
        try:
            from .rl_optimizer import RLTemperatureAgent
            agent = RLTemperatureAgent()
            agent.load()  # Load pre-trained Q-table if exists

            # If not trained, do a quick inline training
            if not agent._trained:
                logger.info("RL agent not pre-trained. Running quick 200-episode training...")
                agent.train(predict_fn=ml_predict, episodes=200, steps_per_episode=8)
                agent.save()

            result.rl_recommendation = agent.recommend(
                plastic_type=key,
                current_temp=temperature,
                pressure=pressure,
            )
        except Exception as e:
            warnings.append(f"RL recommendation error: {e}")
            logger.error("RL recommendation failed: %s", e, exc_info=True)

    # ── 5. Explainability ────────────────────────────────────────────────
    if req.enable_explainability:
        try:
            from .explainability import explain_prediction
            result.explainability = explain_prediction(
                plastic_type=key,
                temperature=temperature,
                weight=req.weight,
                pressure=pressure,
            )
        except Exception as e:
            warnings.append(f"Explainability error: {e}")
            logger.error("Explainability failed: %s", e, exc_info=True)

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
    result.processing_time_ms = elapsed_ms
    result.warnings = warnings

    logger.info(
        "Advanced AI optimize [%s] %.1fkg: %.1fms (%d warnings)",
        key, req.weight, elapsed_ms, len(warnings),
    )

    return result
