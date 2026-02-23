"""
Database History Router
========================
REST endpoints for browsing prediction and detection history.
All endpoints are read-only and do NOT modify existing endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_db
from . import crud

logger = logging.getLogger("database.router")

router = APIRouter(prefix="/history", tags=["History"])


# ─── Predictions ──────────────────────────────────────────────────────────────

@router.get("/predictions")
async def list_predictions(
    limit: int = Query(default=20, ge=1, le=100),
    plastic_type: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """List recent prediction records."""
    records = await crud.get_predictions(db, limit=limit, plastic_type=plastic_type)
    return {
        "count": len(records),
        "results": [
            {
                "id": r.id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "plastic_type": r.plastic_type,
                "weight_kg": r.weight_kg,
                "mode": r.mode,
                "objective": r.objective,
                "predicted_yield_pct": r.predicted_yield_pct,
                "predicted_emission_g_per_kg": r.predicted_emission_g_per_kg,
                "risk_level": r.risk_level,
                "sustainability_score": r.sustainability_score,
                "sustainability_grade": r.sustainability_grade,
            }
            for r in records
        ],
    }


@router.get("/predictions/{record_id}")
async def get_prediction(record_id: int, db: AsyncSession = Depends(get_db)):
    """Get full prediction details by ID."""
    record = await crud.get_prediction_by_id(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return {
        "id": record.id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "full_response": record.full_response,
    }


# ─── Detections ───────────────────────────────────────────────────────────────

@router.get("/detections")
async def list_detections(
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List recent detection records."""
    records = await crud.get_detections(db, limit=limit)
    return {
        "count": len(records),
        "results": [
            {
                "id": r.id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "total_detections": r.total_detections,
                "selected_class": r.selected_class,
                "selected_confidence": r.selected_confidence,
                "inference_time_ms": r.inference_time_ms,
            }
            for r in records
        ],
    }


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Get summary statistics."""
    from sqlalchemy import func, select
    from .models import PredictionRecord, DetectionRecord

    async with db.begin():
        pred_count = (await db.execute(select(func.count(PredictionRecord.id)))).scalar() or 0
        det_count = (await db.execute(select(func.count(DetectionRecord.id)))).scalar() or 0
        avg_yield = (await db.execute(select(func.avg(PredictionRecord.predicted_yield_pct)))).scalar()
        avg_emission = (await db.execute(select(func.avg(PredictionRecord.predicted_emission_g_per_kg)))).scalar()

    return {
        "total_predictions": pred_count,
        "total_detections": det_count,
        "average_yield_pct": round(avg_yield, 2) if avg_yield else None,
        "average_emission_g_per_kg": round(avg_emission, 2) if avg_emission else None,
    }
