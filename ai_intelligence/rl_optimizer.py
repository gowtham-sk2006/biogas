"""
Reinforcement Learning Temperature Optimizer
=============================================
Simplified Q-learning agent that learns optimal temperature settings
for different plastic types by maximizing yield while minimizing emissions.

State:  (plastic_type_enc, temperature_bin, pressure_bin)
Action: increase_temp, decrease_temp, hold
Reward: yield - alpha * emission
"""

import logging
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger("ai_intelligence.rl")

# ─── Configuration ────────────────────────────────────────────────────────────
PLASTIC_ENCODING = {"HDPE": 0, "LDPE": 1, "PET": 2, "PP": 3}
TEMP_BINS = np.arange(300, 601, 10)   # 31 bins
PRESSURE_BINS = np.arange(1, 11, 1)   # 10 bins
ACTIONS = [-20, -10, -5, 0, 5, 10, 20]  # temperature deltas °C

QTABLE_PATH = Path(__file__).resolve().parent / "q_table.pkl"


def _discretize_temp(temp: float) -> int:
    return int(np.clip(np.searchsorted(TEMP_BINS, temp) - 1, 0, len(TEMP_BINS) - 2))


def _discretize_pressure(pressure: float) -> int:
    return int(np.clip(np.searchsorted(PRESSURE_BINS, pressure) - 1, 0, len(PRESSURE_BINS) - 2))


class RLTemperatureAgent:
    """
    Tabular Q-learning agent for adaptive temperature recommendation.

    Usage:
        agent = RLTemperatureAgent()
        agent.train(predict_fn, episodes=500)
        recommended_temp = agent.recommend("HDPE", current_temp=450, pressure=5)
    """

    def __init__(
        self,
        alpha: float = 0.1,        # learning rate
        gamma: float = 0.95,       # discount factor
        epsilon: float = 0.15,     # exploration rate
        emission_penalty: float = 0.5,  # emission weight in reward
    ):
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.emission_penalty = emission_penalty

        n_plastics = len(PLASTIC_ENCODING)
        n_temps = len(TEMP_BINS) - 1
        n_pressures = len(PRESSURE_BINS) - 1
        n_actions = len(ACTIONS)

        # Q-table: (plastic, temp_bin, pressure_bin, action) → value
        self.q_table = np.zeros((n_plastics, n_temps, n_pressures, n_actions))
        self._trained = False

    def _state(self, plastic_enc: int, temp: float, pressure: float):
        return (plastic_enc, _discretize_temp(temp), _discretize_pressure(pressure))

    def _reward(self, yield_pct: float, emission: float) -> float:
        """Higher yield and lower emission → higher reward."""
        return yield_pct - self.emission_penalty * emission

    def _choose_action(self, state: tuple, exploit_only: bool = False) -> int:
        if not exploit_only and np.random.random() < self.epsilon:
            return np.random.randint(len(ACTIONS))
        return int(np.argmax(self.q_table[state]))

    def train(
        self,
        predict_fn,
        episodes: int = 500,
        steps_per_episode: int = 10,
    ):
        """
        Train the agent using a predict_fn that simulates the environment.

        predict_fn(plastic_type: str, temperature: float, weight: float, pressure: float)
            → dict with keys: gas_yield_pct, co2_emission_g_per_kg
        """
        logger.info("Starting RL training: %d episodes × %d steps", episodes, steps_per_episode)

        plastic_names = list(PLASTIC_ENCODING.keys())

        for ep in range(episodes):
            # Random starting conditions
            plastic = np.random.choice(plastic_names)
            p_enc = PLASTIC_ENCODING[plastic]
            temp = float(np.random.choice(TEMP_BINS[:-1]))
            pressure = float(np.random.choice(PRESSURE_BINS[:-1]))
            weight = np.random.uniform(1, 20)

            for step in range(steps_per_episode):
                state = self._state(p_enc, temp, pressure)
                action_idx = self._choose_action(state)
                delta = ACTIONS[action_idx]

                new_temp = float(np.clip(temp + delta, 300, 600))

                try:
                    pred = predict_fn(
                        plastic_type=plastic,
                        temperature=new_temp,
                        weight=weight,
                        pressure=pressure,
                    )
                    reward = self._reward(pred["gas_yield_pct"], pred["co2_emission_g_per_kg"])
                except Exception:
                    reward = -10.0
                    new_temp = temp

                new_state = self._state(p_enc, new_temp, pressure)

                # Q-learning update
                old_q = self.q_table[state + (action_idx,)]
                best_next = np.max(self.q_table[new_state])
                self.q_table[state + (action_idx,)] = old_q + self.alpha * (
                    reward + self.gamma * best_next - old_q
                )

                temp = new_temp

            # Decay epsilon
            if ep % 100 == 0 and ep > 0:
                self.epsilon = max(0.01, self.epsilon * 0.9)

        self._trained = True
        logger.info("RL training complete. Q-table shape: %s", self.q_table.shape)

    def recommend(self, plastic_type: str, current_temp: float, pressure: float) -> dict:
        """Recommend optimal temperature adjustment."""
        p_enc = PLASTIC_ENCODING.get(plastic_type.upper())
        if p_enc is None:
            raise ValueError(f"Unknown plastic: {plastic_type}")

        state = self._state(p_enc, current_temp, pressure)
        action_idx = self._choose_action(state, exploit_only=True)
        delta = ACTIONS[action_idx]
        recommended_temp = float(np.clip(current_temp + delta, 300, 600))

        q_values = self.q_table[state]
        confidence = float(np.max(q_values) - np.mean(q_values)) if np.std(q_values) > 0 else 0.0

        return {
            "current_temperature_c": current_temp,
            "recommended_temperature_c": recommended_temp,
            "temperature_delta_c": delta,
            "action": "increase" if delta > 0 else "decrease" if delta < 0 else "hold",
            "confidence": round(min(confidence / 10, 1.0), 3),
            "trained": self._trained,
        }

    def save(self, path: Optional[Path] = None):
        path = path or QTABLE_PATH
        with open(path, "wb") as f:
            pickle.dump({"q_table": self.q_table, "epsilon": self.epsilon}, f)
        logger.info("Q-table saved to %s", path)

    def load(self, path: Optional[Path] = None):
        path = path or QTABLE_PATH
        if path.exists():
            with open(path, "rb") as f:
                data = pickle.load(f)
            self.q_table = data["q_table"]
            self.epsilon = data.get("epsilon", 0.01)
            self._trained = True
            logger.info("Q-table loaded from %s", path)
        else:
            logger.warning("No Q-table found at %s — using untrained agent", path)
