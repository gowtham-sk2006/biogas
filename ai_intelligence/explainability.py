"""
Model Explainability via SHAP
==============================
Generates SHAP-based feature importance for pyrolysis predictions.
Returns the top-5 most impactful features for a given prediction.

Does NOT modify existing models — uses them as-is with SHAP TreeExplainer.
"""

import logging
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger("ai_intelligence.explainability")

BASE_DIR = Path(__file__).resolve().parent.parent
YIELD_MODEL_PATH = BASE_DIR / "yield_model.pkl"
EMISSION_MODEL_PATH = BASE_DIR / "emission_model.pkl"

PLASTIC_ENCODING = {"HDPE": 0, "LDPE": 1, "PET": 2, "PP": 3}
FEATURE_NAMES = [
    "Temperature (°C)",
    "Heating Rate (°C/min)",
    "Residence Time (min)",
    "Plastic Type",
    "Moisture Content (%)",
    "Feed Rate (kg/h)",
    "Catalyst Ratio",
]


def _load_model(path: Path):
    import pickle
    if not path.exists():
        raise FileNotFoundError(f"Model not found: {path}")
    with open(path, "rb") as f:
        return pickle.load(f)


def explain_prediction(
    plastic_type: str,
    temperature: float,
    weight: float,
    pressure: float,
    heating_rate: float = 20.0,
    residence_time: float = 60.0,
    moisture: float = 5.0,
    catalyst_ratio: float = 0.1,
    top_n: int = 5,
) -> dict:
    """
    Generate SHAP feature importance for a specific prediction.

    Parameters
    ----------
    plastic_type : str
    temperature, weight, pressure : float
    top_n : int
        Number of top features to return (default 5)

    Returns
    -------
    dict with yield and emission feature importances
    """
    try:
        import shap
    except ImportError:
        logger.warning("SHAP not installed. Using permutation-based fallback.")
        return _fallback_importance(
            plastic_type, temperature, weight, pressure,
            heating_rate, residence_time, moisture, catalyst_ratio, top_n
        )

    p_enc = PLASTIC_ENCODING.get(plastic_type.upper())
    if p_enc is None:
        raise ValueError(f"Unknown plastic: {plastic_type}")

    feed_rate = weight
    X = np.array([[temperature, heating_rate, residence_time,
                    p_enc, moisture, feed_rate, catalyst_ratio]])

    yield_model = _load_model(YIELD_MODEL_PATH)
    emission_model = _load_model(EMISSION_MODEL_PATH)

    result = {}
    for model, target_name in [(yield_model, "yield"), (emission_model, "emission")]:
        try:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X)

            if isinstance(shap_values, list):
                shap_values = shap_values[0]

            abs_values = np.abs(shap_values[0])
            sorted_idx = np.argsort(abs_values)[::-1][:top_n]

            features = []
            for idx in sorted_idx:
                features.append({
                    "feature": FEATURE_NAMES[idx],
                    "importance": round(float(abs_values[idx]), 4),
                    "shap_value": round(float(shap_values[0][idx]), 4),
                    "direction": "increases" if shap_values[0][idx] > 0 else "decreases",
                    "input_value": round(float(X[0][idx]), 2),
                })

            result[target_name] = {
                "top_features": features,
                "base_value": round(float(explainer.expected_value), 2) if not isinstance(explainer.expected_value, np.ndarray) else round(float(explainer.expected_value[0]), 2),
                "prediction": round(float(model.predict(X)[0]), 2),
            }
        except Exception as e:
            logger.warning("SHAP failed for %s model: %s. Using fallback.", target_name, e)
            result[target_name] = _single_fallback(
                model, X, target_name, top_n
            )

    return result


def _single_fallback(model, X: np.ndarray, target_name: str, top_n: int) -> dict:
    """Permutation-based importance for a single model."""
    base_pred = float(model.predict(X)[0])
    importances = []

    for i in range(X.shape[1]):
        X_perturbed = X.copy()
        X_perturbed[0, i] *= 1.1  # 10% perturbation
        perturbed_pred = float(model.predict(X_perturbed)[0])
        imp = abs(perturbed_pred - base_pred)
        importances.append(imp)

    sorted_idx = np.argsort(importances)[::-1][:top_n]
    features = []
    for idx in sorted_idx:
        features.append({
            "feature": FEATURE_NAMES[idx],
            "importance": round(importances[idx], 4),
            "shap_value": None,
            "direction": "varies",
            "input_value": round(float(X[0][idx]), 2),
        })

    return {
        "top_features": features,
        "base_value": round(base_pred, 2),
        "prediction": round(base_pred, 2),
        "method": "permutation_fallback",
    }


def _fallback_importance(
    plastic_type, temperature, weight, pressure,
    heating_rate, residence_time, moisture, catalyst_ratio, top_n
) -> dict:
    """Full fallback when SHAP is not installed."""
    p_enc = PLASTIC_ENCODING.get(plastic_type.upper(), 0)
    feed_rate = weight
    X = np.array([[temperature, heating_rate, residence_time,
                    p_enc, moisture, feed_rate, catalyst_ratio]])

    result = {}
    for path, name in [(YIELD_MODEL_PATH, "yield"), (EMISSION_MODEL_PATH, "emission")]:
        model = _load_model(path)
        result[name] = _single_fallback(model, X, name, top_n)

    return result
