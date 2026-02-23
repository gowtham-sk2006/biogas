"""
Uncertainty Estimation via Bootstrap Ensemble
==============================================
Generates 95% confidence intervals for yield and emission predictions
by running bootstrap resampling on the existing ML models.

Does NOT modify existing models — uses them as-is for inference.
"""

import logging

import numpy as np

logger = logging.getLogger("ai_intelligence.uncertainty")


def bootstrap_confidence_interval(
    predict_fn,
    plastic_type: str,
    temperature: float,
    weight: float,
    pressure: float,
    n_bootstrap: int = 50,
    noise_std_temp: float = 5.0,
    noise_std_pressure: float = 0.3,
    noise_std_weight: float = 0.5,
    confidence_level: float = 0.95,
) -> dict:
    """
    Estimate prediction uncertainty using bootstrap perturbation.

    Runs `n_bootstrap` predictions with small Gaussian noise added to
    input parameters, then computes percentile-based confidence intervals.

    Parameters
    ----------
    predict_fn : callable
        Function(plastic_type, temperature, weight, pressure) → dict
    plastic_type : str
    temperature, weight, pressure : float
    n_bootstrap : int
        Number of bootstrap samples (default 50)
    noise_std_temp : float
        Standard deviation of temperature noise (°C)
    noise_std_pressure : float
        Standard deviation of pressure noise (bar)
    noise_std_weight : float
        Standard deviation of weight noise (kg)
    confidence_level : float
        Confidence level (default 0.95 → 95% CI)

    Returns
    -------
    dict with mean, lower, upper bounds for yield and emission
    """
    yields = []
    emissions = []
    alpha = 1 - confidence_level

    for _ in range(n_bootstrap):
        # Perturb inputs with small Gaussian noise
        t = float(np.clip(temperature + np.random.normal(0, noise_std_temp), 300, 600))
        p = float(np.clip(pressure + np.random.normal(0, noise_std_pressure), 1, 10))
        w = float(np.clip(weight + np.random.normal(0, noise_std_weight), 0.5, 100))

        try:
            pred = predict_fn(
                plastic_type=plastic_type,
                temperature=t,
                weight=w,
                pressure=p,
            )
            yields.append(pred["gas_yield_pct"])
            emissions.append(pred["co2_emission_g_per_kg"])
        except Exception:
            continue

    if len(yields) < 10:
        logger.warning("Too few bootstrap samples (%d). Results may be unreliable.", len(yields))

    yields_arr = np.array(yields)
    emissions_arr = np.array(emissions)

    yield_mean = float(np.mean(yields_arr))
    yield_std = float(np.std(yields_arr))
    yield_lower = float(np.percentile(yields_arr, alpha / 2 * 100))
    yield_upper = float(np.percentile(yields_arr, (1 - alpha / 2) * 100))

    emission_mean = float(np.mean(emissions_arr))
    emission_std = float(np.std(emissions_arr))
    emission_lower = float(np.percentile(emissions_arr, alpha / 2 * 100))
    emission_upper = float(np.percentile(emissions_arr, (1 - alpha / 2) * 100))

    return {
        "n_samples": len(yields),
        "confidence_level": confidence_level,
        "yield": {
            "mean": round(yield_mean, 2),
            "std": round(yield_std, 2),
            "ci_lower": round(yield_lower, 2),
            "ci_upper": round(yield_upper, 2),
            "formatted": f"{yield_mean:.1f}% ± {(yield_upper - yield_lower) / 2:.1f}%",
        },
        "emission": {
            "mean": round(emission_mean, 2),
            "std": round(emission_std, 2),
            "ci_lower": round(emission_lower, 2),
            "ci_upper": round(emission_upper, 2),
            "formatted": f"{emission_mean:.1f} ± {(emission_upper - emission_lower) / 2:.1f} g/kg",
        },
    }
