"""
Bayesian Optimization for Pyrolysis Parameters
================================================
Uses Optuna's TPE sampler to efficiently search for optimal temperature
and pressure, replacing brute-force grid search when enabled.

Does NOT replace the existing grid-search optimizer — runs alongside it.
"""

import logging
from typing import Optional

logger = logging.getLogger("ai_intelligence.bayesian")

PLASTIC_ENCODING = {"HDPE": 0, "LDPE": 1, "PET": 2, "PP": 3}


def bayesian_optimize(
    predict_fn,
    plastic_type: str,
    weight: float,
    n_trials: int = 80,
    yield_weight: float = 0.6,
    emission_weight: float = 0.4,
    temp_range: tuple[float, float] = (300.0, 600.0),
    pressure_range: tuple[float, float] = (1.0, 10.0),
) -> dict:
    """
    Bayesian optimization using Optuna TPE sampler.

    Parameters
    ----------
    predict_fn : callable
        Function(plastic_type, temperature, weight, pressure) → dict
    plastic_type : str
        One of PET, HDPE, LDPE, PP
    weight : float
        Feedstock weight in kg
    n_trials : int
        Number of optimization trials (default 80)
    yield_weight, emission_weight : float
        Weights for multi-objective scoring

    Returns
    -------
    dict with optimal params, predictions, and search metadata
    """
    try:
        import optuna
        optuna.logging.set_verbosity(optuna.logging.WARNING)
    except ImportError:
        logger.error("Optuna not installed. Install with: pip install optuna")
        raise ImportError("Optuna is required for Bayesian optimization. Run: pip install optuna")

    key = plastic_type.strip().upper()
    if key not in PLASTIC_ENCODING:
        raise ValueError(f"Unknown plastic: {plastic_type}. Valid: {list(PLASTIC_ENCODING.keys())}")

    best_result: Optional[dict] = None
    all_trials: list[dict] = []

    def objective(trial: optuna.Trial) -> float:
        nonlocal best_result

        temp = trial.suggest_float("temperature", temp_range[0], temp_range[1], step=5.0)
        pressure = trial.suggest_float("pressure", pressure_range[0], pressure_range[1], step=0.5)

        pred = predict_fn(
            plastic_type=key,
            temperature=temp,
            weight=weight,
            pressure=pressure,
        )

        yield_pct = pred["gas_yield_pct"]
        emission = pred["co2_emission_g_per_kg"]
        risk = pred["risk_level"]

        # Score: maximize yield, minimize emission
        score = yield_weight * yield_pct - emission_weight * emission

        trial_data = {
            "temperature": temp,
            "pressure": pressure,
            "gas_yield_pct": yield_pct,
            "co2_emission_g_per_kg": emission,
            "risk_level": risk,
            "score": round(score, 4),
        }
        all_trials.append(trial_data)

        return score  # Optuna maximizes by default with direction="maximize"

    study = optuna.create_study(
        direction="maximize",
        sampler=optuna.samplers.TPESampler(seed=42),
        study_name=f"pyrolysis_{key}_{weight}kg",
    )
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best_trial = study.best_trial
    best_temp = best_trial.params["temperature"]
    best_pressure = best_trial.params["pressure"]

    # Get full prediction for best params
    best_pred = predict_fn(
        plastic_type=key,
        temperature=best_temp,
        weight=weight,
        pressure=best_pressure,
    )

    # Top 5 alternatives
    sorted_trials = sorted(all_trials, key=lambda x: x["score"], reverse=True)
    top_5 = sorted_trials[:5]

    return {
        "method": "bayesian_optimization",
        "plastic_type": key,
        "weight_kg": weight,
        "optimal_temperature_c": best_temp,
        "optimal_pressure_atm": best_pressure,
        "predicted_yield_pct": best_pred["gas_yield_pct"],
        "predicted_emission_g_per_kg": best_pred["co2_emission_g_per_kg"],
        "predicted_risk_level": best_pred["risk_level"],
        "optimization_score": round(study.best_value, 4),
        "search_metadata": {
            "n_trials": n_trials,
            "sampler": "TPE",
            "yield_weight": yield_weight,
            "emission_weight": emission_weight,
        },
        "top_5_alternatives": top_5,
    }
