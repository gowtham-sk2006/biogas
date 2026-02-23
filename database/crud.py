"""
Database CRUD Operations
========================
Async create/read functions for prediction and detection records.
"""

import logging
from typing import Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from .models import PredictionRecord, DetectionRecord, AdvancedAIRecord

logger = logging.getLogger("database.crud")


# ─── Predictions ──────────────────────────────────────────────────────────────

async def save_prediction(db: AsyncSession, data: dict) -> PredictionRecord:
    """Save a prediction result to the database."""
    record = PredictionRecord(
        plastic_type=data.get("plastic_type", ""),
        weight_kg=data.get("weight_kg", 0),
        mode=data.get("mode", "auto"),
        objective=data.get("objective", "balanced"),
        input_temperature=data.get("input_temperature"),
        input_pressure=data.get("input_pressure"),
        predicted_yield_pct=data.get("predicted_yield_pct", 0),
        predicted_emission_g_per_kg=data.get("predicted_emission_g_per_kg", 0),
        risk_level=data.get("predicted_risk_level", ""),
        recommended_temp_c=data.get("recommended_params", {}).get("temperature_c"),
        recommended_pressure_atm=data.get("recommended_params", {}).get("pressure_atm"),
        params_source=data.get("recommended_params", {}).get("source"),
        sustainability_score=data.get("sustainability", {}).get("score"),
        sustainability_grade=data.get("sustainability", {}).get("grade"),
        full_response=data,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    logger.info("Saved prediction #%d [%s]", record.id, record.plastic_type)
    return record


async def get_predictions(
    db: AsyncSession,
    limit: int = 20,
    plastic_type: Optional[str] = None,
) -> list[PredictionRecord]:
    """Fetch recent predictions, optionally filtered by plastic type."""
    stmt = select(PredictionRecord).order_by(desc(PredictionRecord.created_at))
    if plastic_type:
        stmt = stmt.where(PredictionRecord.plastic_type == plastic_type.upper())
    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_prediction_by_id(db: AsyncSession, record_id: int) -> Optional[PredictionRecord]:
    """Fetch a single prediction by ID."""
    result = await db.execute(select(PredictionRecord).where(PredictionRecord.id == record_id))
    return result.scalar_one_or_none()


# ─── Detections ───────────────────────────────────────────────────────────────

async def save_detection(db: AsyncSession, data: dict) -> DetectionRecord:
    """Save a detection result to the database."""
    summary = data.get("summary", {})
    selected = summary.get("selected_plastic", {}) or {}

    record = DetectionRecord(
        total_detections=summary.get("total_detections", 0),
        selected_class=selected.get("class_name"),
        selected_confidence=selected.get("confidence"),
        selected_view=selected.get("view"),
        inference_time_ms=data.get("inference_time_ms", 0),
        full_response=data,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    logger.info("Saved detection #%d", record.id)
    return record


async def get_detections(db: AsyncSession, limit: int = 20) -> list[DetectionRecord]:
    """Fetch recent detections."""
    stmt = select(DetectionRecord).order_by(desc(DetectionRecord.created_at)).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ─── Advanced AI ──────────────────────────────────────────────────────────────

async def save_advanced_ai(db: AsyncSession, data: dict) -> AdvancedAIRecord:
    """Save an advanced AI optimization result."""
    bayesian = data.get("bayesian_optimization", {}) or {}
    rl = data.get("rl_recommendation", {}) or {}

    record = AdvancedAIRecord(
        plastic_type=data.get("plastic_type", ""),
        weight_kg=data.get("weight_kg", 0),
        processing_time_ms=data.get("processing_time_ms"),
        optimal_temperature_c=bayesian.get("optimal_temperature_c"),
        optimal_pressure_atm=bayesian.get("optimal_pressure_atm"),
        optimal_yield_pct=bayesian.get("predicted_yield_pct"),
        optimal_emission=bayesian.get("predicted_emission_g_per_kg"),
        rl_recommended_temp=rl.get("recommended_temperature_c"),
        rl_action=rl.get("action"),
        full_response=data,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    logger.info("Saved advanced AI run #%d", record.id)
    return record
