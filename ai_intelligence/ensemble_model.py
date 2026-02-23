"""
Ensemble Pyrolysis Model
========================
Combines RandomForest + XGBoost via weighted average for more robust
predictions. Does NOT replace existing models — runs alongside them.

Falls back to single-model prediction if XGBoost is not installed.
"""

import logging
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger("ai_intelligence.ensemble")

BASE_DIR = Path(__file__).resolve().parent.parent
PLASTIC_ENCODING = {"HDPE": 0, "LDPE": 1, "PET": 2, "PP": 3}

YIELD_MODEL_PATH = BASE_DIR / "yield_model.pkl"
EMISSION_MODEL_PATH = BASE_DIR / "emission_model.pkl"
ENSEMBLE_CACHE_PATH = Path(__file__).resolve().parent / "ensemble_models.pkl"


def _load_pickle(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"Model not found: {path}")
    with open(path, "rb") as f:
        return pickle.load(f)


class EnsemblePyrolysisModel:
    """
    Weighted ensemble combining existing RandomForest models with XGBoost.

    Weights:
        - rf_weight: weight for existing RandomForest (default 0.5)
        - xgb_weight: weight for XGBoost (default 0.5)

    If XGBoost models don't exist, falls back to RF-only with weight 1.0.
    """

    def __init__(self, rf_weight: float = 0.5, xgb_weight: float = 0.5):
        self.rf_weight = rf_weight
        self.xgb_weight = xgb_weight

        # Load existing RF models
        self.rf_yield = _load_pickle(YIELD_MODEL_PATH)
        self.rf_emission = _load_pickle(EMISSION_MODEL_PATH)

        # Try loading XGBoost models
        self.xgb_yield = None
        self.xgb_emission = None
        self._has_xgb = False

        try:
            self._try_load_xgb()
        except Exception as e:
            logger.info("XGBoost models not available (%s). Training inline.", e)
            self._train_xgb_from_rf()

    def _try_load_xgb(self):
        """Try loading cached XGBoost models."""
        if ENSEMBLE_CACHE_PATH.exists():
            data = _load_pickle(ENSEMBLE_CACHE_PATH)
            self.xgb_yield = data["xgb_yield"]
            self.xgb_emission = data["xgb_emission"]
            self._has_xgb = True
            logger.info("XGBoost ensemble models loaded from cache")

    def _train_xgb_from_rf(self):
        """
        Train XGBoost models using synthetic data generated from the RF models.
        This creates a diverse ensemble without needing the original training data.
        """
        try:
            from xgboost import XGBRegressor
        except ImportError:
            logger.warning("XGBoost not installed. Ensemble will use RF only. Install: pip install xgboost")
            self.rf_weight = 1.0
            self.xgb_weight = 0.0
            return

        logger.info("Training XGBoost ensemble from synthetic data...")

        # Generate synthetic training data using RF predictions
        n_samples = 2000
        np.random.seed(42)

        temperatures = np.random.uniform(300, 600, n_samples)
        heating_rates = np.random.uniform(10, 30, n_samples)
        residence_times = np.random.uniform(30, 90, n_samples)
        plastics = np.random.choice(list(PLASTIC_ENCODING.values()), n_samples)
        moistures = np.random.uniform(2, 10, n_samples)
        feed_rates = np.random.uniform(1, 20, n_samples)
        catalyst_ratios = np.random.uniform(0.05, 0.2, n_samples)

        X = np.column_stack([
            temperatures, heating_rates, residence_times,
            plastics, moistures, feed_rates, catalyst_ratios,
        ])

        # Get RF predictions as training targets (with small noise for diversity)
        y_yield = self.rf_yield.predict(X) + np.random.normal(0, 0.5, n_samples)
        y_emission = self.rf_emission.predict(X) + np.random.normal(0, 1.0, n_samples)

        # Train XGBoost
        self.xgb_yield = XGBRegressor(
            n_estimators=100, max_depth=6, learning_rate=0.1,
            random_state=42, verbosity=0,
        )
        self.xgb_yield.fit(X, y_yield)

        self.xgb_emission = XGBRegressor(
            n_estimators=100, max_depth=6, learning_rate=0.1,
            random_state=42, verbosity=0,
        )
        self.xgb_emission.fit(X, y_emission)

        self._has_xgb = True

        # Cache the trained models
        try:
            with open(ENSEMBLE_CACHE_PATH, "wb") as f:
                pickle.dump({"xgb_yield": self.xgb_yield, "xgb_emission": self.xgb_emission}, f)
            logger.info("XGBoost models cached to %s", ENSEMBLE_CACHE_PATH)
        except Exception as e:
            logger.warning("Failed to cache XGBoost models: %s", e)

    def predict(
        self,
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
        Weighted ensemble prediction combining RF and XGBoost.
        """
        p_enc = PLASTIC_ENCODING.get(plastic_type.upper())
        if p_enc is None:
            raise ValueError(f"Unknown plastic: {plastic_type}")

        feed_rate = weight
        X = np.array([[temperature, heating_rate, residence_time,
                        p_enc, moisture, feed_rate, catalyst_ratio]])

        rf_yield = float(self.rf_yield.predict(X)[0])
        rf_emission = float(self.rf_emission.predict(X)[0])

        if self._has_xgb and self.xgb_yield is not None:
            xgb_yield = float(self.xgb_yield.predict(X)[0])
            xgb_emission = float(self.xgb_emission.predict(X)[0])

            final_yield = self.rf_weight * rf_yield + self.xgb_weight * xgb_yield
            final_emission = self.rf_weight * rf_emission + self.xgb_weight * xgb_emission

            model_agreement = {
                "rf_yield": round(rf_yield, 2),
                "xgb_yield": round(xgb_yield, 2),
                "rf_emission": round(rf_emission, 2),
                "xgb_emission": round(xgb_emission, 2),
                "agreement_yield_pct": round(100 - abs(rf_yield - xgb_yield) / max(rf_yield, 0.01) * 100, 1),
                "agreement_emission_pct": round(100 - abs(rf_emission - xgb_emission) / max(rf_emission, 0.01) * 100, 1),
            }
        else:
            final_yield = rf_yield
            final_emission = rf_emission
            model_agreement = {"note": "XGBoost not available, using RF only"}

        return {
            "gas_yield_pct": round(final_yield, 2),
            "co2_emission_g_per_kg": round(final_emission, 2),
            "ensemble_method": "rf_xgb_weighted" if self._has_xgb else "rf_only",
            "weights": {"rf": self.rf_weight, "xgb": self.xgb_weight},
            "model_agreement": model_agreement,
        }
