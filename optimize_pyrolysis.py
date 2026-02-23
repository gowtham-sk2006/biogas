"""
Pyrolysis Optimization Module
==============================
Grid-search optimizer that finds the best temperature and pressure
to maximize gas yield while minimizing CO₂ emission for a given
plastic type and weight.

Usage:
    from optimize_pyrolysis import optimize
    result = optimize("HDPE", weight=5.0)
    print(result)
"""

import os
import pickle
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
YIELD_MODEL_PATH = BASE_DIR / "yield_model.pkl"
EMISSION_MODEL_PATH = BASE_DIR / "emission_model.pkl"
RISK_MODEL_PATH = BASE_DIR / "risk_model.pkl"
PLASTIC_ENCODER_PATH = BASE_DIR / "plastic_label_encoder.pkl"
RISK_ENCODER_PATH = BASE_DIR / "risk_label_encoder.pkl"

# Plastic type mapping (must match training encoding order)
PLASTIC_ENCODING = {"HDPE": 0, "LDPE": 1, "PET": 2, "PP": 3}
VALID_PLASTICS = list(PLASTIC_ENCODING.keys())


# ─── Model Loader ────────────────────────────────────────────────────────────

def _load_pickle(path: Path):
    """Load a pickled model from disk."""
    if not path.exists():
        raise FileNotFoundError(f"Model not found: {path}. Run train_pyrolysis_models.py first.")
    with open(path, "rb") as f:
        return pickle.load(f)


class _ModelCache:
    """Lazy-loaded singleton cache for ML models."""
    _yield_model = None
    _emission_model = None
    _risk_model = None

    @classmethod
    def yield_model(cls):
        if cls._yield_model is None:
            cls._yield_model = _load_pickle(YIELD_MODEL_PATH)
        return cls._yield_model

    @classmethod
    def emission_model(cls):
        if cls._emission_model is None:
            cls._emission_model = _load_pickle(EMISSION_MODEL_PATH)
        return cls._emission_model

    @classmethod
    def risk_model(cls):
        if cls._risk_model is None:
            cls._risk_model = _load_pickle(RISK_MODEL_PATH)
        return cls._risk_model


# ─── Core Prediction ─────────────────────────────────────────────────────────

def predict(
    plastic_type: str,
    temperature: float,
    weight: float,
    pressure: float,
    heating_rate: float = 20.0,
    residence_time: float = 60.0,
    moisture: float = 5.0,
    catalyst_ratio: float = 0.1,
) -> dict:
    """
    Predict gas yield, CO₂ emission, and risk level for given parameters.

    Returns dict with yield_pct, co2_emission, risk_level.
    """
    plastic_enc = PLASTIC_ENCODING.get(plastic_type.upper())
    if plastic_enc is None:
        raise ValueError(f"Unknown plastic: {plastic_type}. Valid: {VALID_PLASTICS}")

    # Feature vector (same order as training)
    # [Temperature, Heating_Rate, Residence_Time, Plastic_Type_Enc,
    #  Moisture_Content, Feed_Rate, Catalyst_Ratio]
    feed_rate = weight  # kg/h approximation from weight
    X = np.array([[temperature, heating_rate, residence_time,
                    plastic_enc, moisture, feed_rate, catalyst_ratio]])

    gas_yield = float(_ModelCache.yield_model().predict(X)[0])
    co2_emission = float(_ModelCache.emission_model().predict(X)[0])
    risk_encoded = int(_ModelCache.risk_model().predict(X)[0])

    risk_labels = {0: "High", 1: "Low", 2: "Medium"}
    try:
        le = _load_pickle(RISK_ENCODER_PATH)
        risk_label = le.inverse_transform([risk_encoded])[0]
    except Exception:
        risk_label = risk_labels.get(risk_encoded, "Unknown")

    return {
        "gas_yield_pct": round(gas_yield, 2),
        "co2_emission_g_per_kg": round(co2_emission, 2),
        "risk_level": risk_label,
    }


# ─── Optimization (Vectorized) ────────────────────────────────────────────────

def optimize(
    plastic_type: str,
    weight: float,
    temp_min: float = 300.0,
    temp_max: float = 600.0,
    temp_step: float = 5.0,
    pressure_min: float = 1.0,
    pressure_max: float = 10.0,
    pressure_step: float = 0.5,
    yield_weight: float = 0.6,
    emission_weight: float = 0.4,
    heating_rate: float = 20.0,
    residence_time: float = 60.0,
    moisture: float = 5.0,
    catalyst_ratio: float = 0.1,
) -> dict:
    """
    Find optimal temperature and pressure that maximize yield
    and minimize emission for a given plastic type and weight.

    Uses vectorized batch predictions for speed.

    Objective:
        score = yield_weight × norm_yield − emission_weight × norm_emission
    """
    import warnings
    warnings.filterwarnings("ignore")

    key = plastic_type.strip().upper()
    if key not in PLASTIC_ENCODING:
        raise ValueError(f"Unknown plastic: {plastic_type}. Valid: {VALID_PLASTICS}")

    plastic_enc = PLASTIC_ENCODING[key]
    temperatures = np.arange(temp_min, temp_max + temp_step, temp_step)
    pressures = np.arange(pressure_min, pressure_max + pressure_step, pressure_step)

    # ── Build full grid as single numpy array (vectorized) ────────────────
    temp_grid, pres_grid = np.meshgrid(temperatures, pressures, indexing="ij")
    temp_flat = temp_grid.ravel()
    pres_flat = pres_grid.ravel()
    n = len(temp_flat)

    feed_rate = weight
    X = np.column_stack([
        temp_flat,                           # Temperature
        np.full(n, heating_rate),            # Heating_Rate
        np.full(n, residence_time),          # Residence_Time
        np.full(n, plastic_enc),             # Plastic_Type_Enc
        np.full(n, moisture),                # Moisture_Content
        np.full(n, feed_rate),               # Feed_Rate
        np.full(n, catalyst_ratio),          # Catalyst_Ratio
    ])

    # ── Single batch prediction per model ─────────────────────────────────
    gas_yields = _ModelCache.yield_model().predict(X)
    co2_emissions = _ModelCache.emission_model().predict(X)
    risk_encoded = _ModelCache.risk_model().predict(X)

    # Decode risk labels
    try:
        le = _load_pickle(RISK_ENCODER_PATH)
        risk_labels = le.inverse_transform(risk_encoded.astype(int))
    except Exception:
        risk_map = {0: "High", 1: "Low", 2: "Medium"}
        risk_labels = np.array([risk_map.get(int(r), "Unknown") for r in risk_encoded])

    # ── Build results DataFrame ───────────────────────────────────────────
    df = pd.DataFrame({
        "temperature": np.round(temp_flat, 1),
        "pressure": np.round(pres_flat, 1),
        "gas_yield_pct": np.round(gas_yields, 2),
        "co2_emission_g_per_kg": np.round(co2_emissions, 2),
        "risk_level": risk_labels,
    })

    # ── Normalize & score ─────────────────────────────────────────────────
    y_min, y_max = df["gas_yield_pct"].min(), df["gas_yield_pct"].max()
    e_min, e_max = df["co2_emission_g_per_kg"].min(), df["co2_emission_g_per_kg"].max()
    y_range = y_max - y_min if y_max != y_min else 1.0
    e_range = e_max - e_min if e_max != e_min else 1.0

    df["score"] = (
        yield_weight * (df["gas_yield_pct"] - y_min) / y_range
        - emission_weight * (df["co2_emission_g_per_kg"] - e_min) / e_range
    )

    # ── Best result ───────────────────────────────────────────────────────
    best_idx = df["score"].idxmax()
    best = df.loc[best_idx]

    # ── Top-5 alternatives ────────────────────────────────────────────────
    top5 = (
        df.nlargest(5, "score")[
            ["temperature", "pressure", "gas_yield_pct",
             "co2_emission_g_per_kg", "risk_level", "score"]
        ]
        .to_dict(orient="records")
    )

    return {
        "plastic_type": key,
        "weight_kg": weight,
        "optimal_temperature_c": float(best["temperature"]),
        "optimal_pressure_atm": float(best["pressure"]),
        "predicted_yield_pct": float(best["gas_yield_pct"]),
        "predicted_emission_g_per_kg": float(best["co2_emission_g_per_kg"]),
        "predicted_risk_level": best["risk_level"],
        "optimization_score": round(float(best["score"]), 4),
        "search_space": {
            "temperature_range": [temp_min, temp_max],
            "pressure_range": [pressure_min, pressure_max],
            "combinations_evaluated": len(df),
        },
        "top_5_alternatives": top5,
    }


# ─── Demo ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    for plastic in VALID_PLASTICS:
        print(f"\n{'=' * 60}")
        print(f"  Optimizing for {plastic} (5 kg)")
        print("=" * 60)
        result = optimize(plastic, weight=5.0)
        print(json.dumps(result, indent=2))
