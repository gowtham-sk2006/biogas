"""
Pyrolysis Prediction — ML Training Pipeline
=============================================
1. Generates a synthetic pyrolysis dataset.
2. Trains three models:
   - RandomForestRegressor   → Gas_Yield        → yield_model.pkl
   - GradientBoostingRegressor → CO2_Emission   → emission_model.pkl
   - RandomForestClassifier  → Risk_Level       → risk_model.pkl
3. Evaluates and prints metrics for each model.
"""

import os
import pickle
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore")

SEED = 42
N_SAMPLES = 2000
OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

np.random.seed(SEED)


# ═══════════════════════════════════════════════════════════════════════════════
#  STEP 1 — Generate Synthetic Pyrolysis Dataset
# ═══════════════════════════════════════════════════════════════════════════════

def generate_dataset(n: int = N_SAMPLES) -> pd.DataFrame:
    """
    Create a realistic synthetic pyrolysis dataset.

    Features:
        Temperature (°C)      – Reactor temperature
        Heating_Rate (°C/min) – Rate of heating
        Residence_Time (min)  – Time in reactor
        Plastic_Type          – PET / HDPE / LDPE / PP (encoded)
        Moisture_Content (%)  – Feedstock moisture
        Feed_Rate (kg/h)      – Feedstock feed rate
        Catalyst_Ratio        – Catalyst-to-plastic ratio

    Targets:
        Gas_Yield (%)         – Percentage gas yield (regression)
        CO2_Emission (g/kg)   – CO₂ emitted per kg plastic (regression)
        Risk_Level            – Low / Medium / High (classification)
    """
    # ── Features ──────────────────────────────────────────────────────────
    temperature = np.random.uniform(300, 700, n)
    heating_rate = np.random.uniform(5, 50, n)
    residence_time = np.random.uniform(10, 120, n)
    plastic_type = np.random.choice([0, 1, 2, 3], n)  # PET=0, HDPE=1, LDPE=2, PP=3
    moisture = np.random.uniform(0, 15, n)
    feed_rate = np.random.uniform(1, 20, n)
    catalyst_ratio = np.random.uniform(0, 0.3, n)

    # ── Target: Gas_Yield (%) ─────────────────────────────────────────────
    # Higher temp & longer residence → more gas; moisture reduces yield
    gas_yield = (
        15
        + 0.05 * temperature
        + 0.1 * heating_rate
        + 0.08 * residence_time
        - 0.5 * moisture
        + 5 * catalyst_ratio
        - 2 * (plastic_type == 0).astype(float)
        + 3 * (plastic_type == 1).astype(float)
        + np.random.normal(0, 2, n)
    )
    gas_yield = np.clip(gas_yield, 5, 65)

    # ── Target: CO2_Emission (g/kg) ───────────────────────────────────────
    # Higher temp → more CO₂; catalyst reduces it
    co2_emission = (
        50
        + 0.3 * temperature
        + 0.2 * heating_rate
        - 0.1 * residence_time
        + 2 * moisture
        + 10 * (plastic_type == 0).astype(float)
        - 15 * catalyst_ratio * 100
        + np.random.normal(0, 10, n)
    )
    co2_emission = np.clip(co2_emission, 20, 350)

    # ── Target: Risk_Level ────────────────────────────────────────────────
    # Based on temperature, moisture, and emission
    risk_score = (
        0.005 * temperature
        + 0.05 * moisture
        + 0.002 * co2_emission
        - 0.01 * residence_time
        + np.random.normal(0, 0.3, n)
    )
    risk_level = np.where(risk_score < 3.0, "Low",
                 np.where(risk_score < 4.0, "Medium", "High"))

    # ── Assemble DataFrame ────────────────────────────────────────────────
    plastic_map = {0: "PET", 1: "HDPE", 2: "LDPE", 3: "PP"}
    df = pd.DataFrame({
        "Temperature": np.round(temperature, 1),
        "Heating_Rate": np.round(heating_rate, 1),
        "Residence_Time": np.round(residence_time, 1),
        "Plastic_Type": [plastic_map[p] for p in plastic_type],
        "Moisture_Content": np.round(moisture, 2),
        "Feed_Rate": np.round(feed_rate, 2),
        "Catalyst_Ratio": np.round(catalyst_ratio, 4),
        "Gas_Yield": np.round(gas_yield, 2),
        "CO2_Emission": np.round(co2_emission, 2),
        "Risk_Level": risk_level,
    })
    return df


# ═══════════════════════════════════════════════════════════════════════════════
#  STEP 2 — Preprocessing
# ═══════════════════════════════════════════════════════════════════════════════

def preprocess(df: pd.DataFrame):
    """Encode categoricals and split features / targets."""
    df = df.copy()

    # Encode Plastic_Type
    le_plastic = LabelEncoder()
    df["Plastic_Type_Enc"] = le_plastic.fit_transform(df["Plastic_Type"])

    # Encode Risk_Level
    le_risk = LabelEncoder()
    df["Risk_Level_Enc"] = le_risk.fit_transform(df["Risk_Level"])

    feature_cols = [
        "Temperature", "Heating_Rate", "Residence_Time",
        "Plastic_Type_Enc", "Moisture_Content", "Feed_Rate", "Catalyst_Ratio",
    ]
    X = df[feature_cols]
    y_yield = df["Gas_Yield"]
    y_emission = df["CO2_Emission"]
    y_risk = df["Risk_Level_Enc"]

    return X, y_yield, y_emission, y_risk, le_plastic, le_risk


# ═══════════════════════════════════════════════════════════════════════════════
#  STEP 3 — Train & Evaluate
# ═══════════════════════════════════════════════════════════════════════════════

def train_yield_model(X_train, X_test, y_train, y_test):
    """Train RandomForestRegressor for Gas_Yield."""
    print("\n" + "=" * 60)
    print("  MODEL 1 — Gas Yield (RandomForestRegressor)")
    print("=" * 60)

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    print(f"  R² Score : {r2_score(y_test, y_pred):.4f}")
    print(f"  MAE      : {mean_absolute_error(y_test, y_pred):.4f}")
    print(f"  RMSE     : {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")

    return model


def train_emission_model(X_train, X_test, y_train, y_test):
    """Train GradientBoostingRegressor for CO2_Emission."""
    print("\n" + "=" * 60)
    print("  MODEL 2 — CO₂ Emission (GradientBoostingRegressor)")
    print("=" * 60)

    model = GradientBoostingRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        min_samples_split=5,
        min_samples_leaf=3,
        random_state=SEED,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    print(f"  R² Score : {r2_score(y_test, y_pred):.4f}")
    print(f"  MAE      : {mean_absolute_error(y_test, y_pred):.4f}")
    print(f"  RMSE     : {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")

    return model


def train_risk_model(X_train, X_test, y_train, y_test, le_risk):
    """Train RandomForestClassifier for Risk_Level."""
    print("\n" + "=" * 60)
    print("  MODEL 3 — Risk Level (RandomForestClassifier)")
    print("=" * 60)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    print(f"  Accuracy : {accuracy_score(y_test, y_pred):.4f}")
    print()
    print(classification_report(
        y_test, y_pred,
        target_names=le_risk.classes_,
    ))

    return model


# ═══════════════════════════════════════════════════════════════════════════════
#  STEP 4 — Save Models
# ═══════════════════════════════════════════════════════════════════════════════

def save_model(model, filename: str):
    """Pickle a model to disk."""
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "wb") as f:
        pickle.dump(model, f)
    size_kb = os.path.getsize(path) / 1024
    print(f"  [✓] Saved {filename} ({size_kb:.1f} KB)")


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  PYROLYSIS PREDICTION — ML TRAINING PIPELINE")
    print("=" * 60)

    # 1. Generate dataset
    print("\n[1] Generating synthetic pyrolysis dataset …")
    df = generate_dataset()
    print(f"    Samples : {len(df)}")
    print(f"    Features: {list(df.columns[:7])}")
    print(f"    Targets : Gas_Yield, CO2_Emission, Risk_Level")
    print(f"\n    Risk distribution:\n{df['Risk_Level'].value_counts().to_string()}")

    # Save dataset for reference
    csv_path = os.path.join(OUTPUT_DIR, "pyrolysis_dataset.csv")
    df.to_csv(csv_path, index=False)
    print(f"\n    [✓] Dataset saved to pyrolysis_dataset.csv")

    # 2. Preprocess
    X, y_yield, y_emission, y_risk, le_plastic, le_risk = preprocess(df)

    X_train, X_test, \
    y_yield_train, y_yield_test, \
    y_emission_train, y_emission_test, \
    y_risk_train, y_risk_test = train_test_split(
        X, y_yield, y_emission, y_risk,
        test_size=0.2,
        random_state=SEED,
        stratify=y_risk,
    )

    print(f"\n    Train: {len(X_train)} | Test: {len(X_test)}")

    # 3. Train models
    yield_model = train_yield_model(X_train, X_test, y_yield_train, y_yield_test)
    emission_model = train_emission_model(X_train, X_test, y_emission_train, y_emission_test)
    risk_model = train_risk_model(X_train, X_test, y_risk_train, y_risk_test, le_risk)

    # 4. Save models
    print("\n" + "=" * 60)
    print("  SAVING MODELS")
    print("=" * 60)
    save_model(yield_model, "yield_model.pkl")
    save_model(emission_model, "emission_model.pkl")
    save_model(risk_model, "risk_model.pkl")
    save_model(le_risk, "risk_label_encoder.pkl")
    save_model(le_plastic, "plastic_label_encoder.pkl")

    print("\n✅ Pipeline complete!")
