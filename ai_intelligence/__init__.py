"""
AI Intelligence Module
======================
Advanced AI extensions for the pyrolysis optimization platform.
All components are optional layers that do NOT modify existing models or endpoints.

Components:
- rl_optimizer: Reinforcement learning (Q-learning) for adaptive temperature recommendation
- bayesian_optimizer: Bayesian optimization via Optuna (replaces grid search optionally)
- uncertainty: Bootstrap ensemble for 95% confidence intervals
- ensemble_model: RandomForest + XGBoost weighted ensemble
- explainability: SHAP-based feature importance analysis
"""

from .rl_optimizer import RLTemperatureAgent
from .bayesian_optimizer import bayesian_optimize
from .uncertainty import bootstrap_confidence_interval
from .ensemble_model import EnsemblePyrolysisModel
from .explainability import explain_prediction

__all__ = [
    "RLTemperatureAgent",
    "bayesian_optimize",
    "bootstrap_confidence_interval",
    "EnsemblePyrolysisModel",
    "explain_prediction",
]
