"""
Database Models
===============
SQLAlchemy ORM models for storing predictions and detections.
"""

import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, JSON, Text, Boolean
from .config import Base

class User(Base):
    """Stores user accounts for authentication."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    organization = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)


class PredictionRecord(Base):
    """Stores every /predict call result."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Input
    plastic_type = Column(String(10), nullable=False, index=True)
    weight_kg = Column(Float, nullable=False)
    mode = Column(String(20), nullable=False)
    objective = Column(String(20), default="balanced")
    input_temperature = Column(Float, nullable=True)
    input_pressure = Column(Float, nullable=True)

    # Output
    predicted_yield_pct = Column(Float, nullable=False)
    predicted_emission_g_per_kg = Column(Float, nullable=False)
    risk_level = Column(String(10), nullable=False)

    # Recommended params
    recommended_temp_c = Column(Float, nullable=True)
    recommended_pressure_atm = Column(Float, nullable=True)
    params_source = Column(String(20), nullable=True)

    # Sustainability
    sustainability_score = Column(Float, nullable=True)
    sustainability_grade = Column(String(2), nullable=True)

    # Full response as JSON (for complete data)
    full_response = Column(JSON, nullable=True)


class DetectionRecord(Base):
    """Stores every /detect call result."""
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    # Results
    total_detections = Column(Integer, nullable=False)
    selected_class = Column(String(50), nullable=True)
    selected_confidence = Column(Float, nullable=True)
    selected_view = Column(String(10), nullable=True)
    inference_time_ms = Column(Float, nullable=False)

    # Full response as JSON
    full_response = Column(JSON, nullable=True)


class AdvancedAIRecord(Base):
    """Stores /advanced-ai/optimize call results."""
    __tablename__ = "advanced_ai_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    plastic_type = Column(String(10), nullable=False)
    weight_kg = Column(Float, nullable=False)
    processing_time_ms = Column(Float, nullable=True)

    # Best result from Bayesian optimization
    optimal_temperature_c = Column(Float, nullable=True)
    optimal_pressure_atm = Column(Float, nullable=True)
    optimal_yield_pct = Column(Float, nullable=True)
    optimal_emission = Column(Float, nullable=True)

    # RL recommendation
    rl_recommended_temp = Column(Float, nullable=True)
    rl_action = Column(String(20), nullable=True)

    # Full response
    full_response = Column(JSON, nullable=True)
