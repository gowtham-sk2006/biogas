"""
Material Properties Database for Plastics
==========================================
Structured property data for PET, HDPE, LDPE, and PP plastics.

Usage:
    from material_properties import get_material_properties
    props = get_material_properties("PET")
"""

from typing import Optional

# ─── Database ─────────────────────────────────────────────────────────────────

PLASTIC_DATABASE: dict[str, dict] = {
    "PET": {
        "full_name": "Polyethylene Terephthalate",
        "resin_code": 1,
        "density": {
            "value_min": 1.33,
            "value_max": 1.45,
            "unit": "g/cm³",
            "typical": 1.38,
        },
        "thickness_range": {
            "value_min": 0.2,
            "value_max": 0.8,
            "unit": "mm",
            "typical": 0.5,
        },
        "ideal_temperature_range": {
            "min_celsius": 60,
            "max_celsius": 260,
            "melting_point_celsius": 260,
            "glass_transition_celsius": 70,
            "unit": "°C",
        },
        "calorific_value": {
            "value": 23.5,
            "unit": "MJ/kg",
            "notes": "Higher heating value (HHV)",
        },
    },
    "HDPE": {
        "full_name": "High-Density Polyethylene",
        "resin_code": 2,
        "density": {
            "value_min": 0.93,
            "value_max": 0.97,
            "unit": "g/cm³",
            "typical": 0.95,
        },
        "thickness_range": {
            "value_min": 0.5,
            "value_max": 3.0,
            "unit": "mm",
            "typical": 1.5,
        },
        "ideal_temperature_range": {
            "min_celsius": -50,
            "max_celsius": 130,
            "melting_point_celsius": 130,
            "glass_transition_celsius": -110,
            "unit": "°C",
        },
        "calorific_value": {
            "value": 46.5,
            "unit": "MJ/kg",
            "notes": "Higher heating value (HHV)",
        },
    },
    "LDPE": {
        "full_name": "Low-Density Polyethylene",
        "resin_code": 4,
        "density": {
            "value_min": 0.91,
            "value_max": 0.94,
            "unit": "g/cm³",
            "typical": 0.92,
        },
        "thickness_range": {
            "value_min": 0.02,
            "value_max": 0.5,
            "unit": "mm",
            "typical": 0.1,
        },
        "ideal_temperature_range": {
            "min_celsius": -50,
            "max_celsius": 110,
            "melting_point_celsius": 115,
            "glass_transition_celsius": -110,
            "unit": "°C",
        },
        "calorific_value": {
            "value": 46.0,
            "unit": "MJ/kg",
            "notes": "Higher heating value (HHV)",
        },
    },
    "PP": {
        "full_name": "Polypropylene",
        "resin_code": 5,
        "density": {
            "value_min": 0.89,
            "value_max": 0.92,
            "unit": "g/cm³",
            "typical": 0.91,
        },
        "thickness_range": {
            "value_min": 0.3,
            "value_max": 2.5,
            "unit": "mm",
            "typical": 1.0,
        },
        "ideal_temperature_range": {
            "min_celsius": -10,
            "max_celsius": 165,
            "melting_point_celsius": 165,
            "glass_transition_celsius": -20,
            "unit": "°C",
        },
        "calorific_value": {
            "value": 46.4,
            "unit": "MJ/kg",
            "notes": "Higher heating value (HHV)",
        },
    },
}


# ─── Public API ───────────────────────────────────────────────────────────────

def get_material_properties(plastic_type: str) -> dict:
    """
    Retrieve material properties for a plastic type.

    Args:
        plastic_type: One of "PET", "HDPE", "LDPE", "PP" (case-insensitive).

    Returns:
        Structured dict with density, thickness_range, ideal_temperature_range,
        and calorific_value.

    Raises:
        ValueError: If the plastic type is not in the database.
    """
    key = plastic_type.strip().upper()
    if key not in PLASTIC_DATABASE:
        available = ", ".join(sorted(PLASTIC_DATABASE.keys()))
        raise ValueError(
            f"Unknown plastic type '{plastic_type}'. Available: {available}"
        )
    return {"plastic_type": key, **PLASTIC_DATABASE[key]}


def list_available_plastics() -> list[str]:
    """Return a sorted list of all plastic types in the database."""
    return sorted(PLASTIC_DATABASE.keys())


def get_all_properties() -> dict[str, dict]:
    """Return properties for all plastics in the database."""
    return {k: get_material_properties(k) for k in sorted(PLASTIC_DATABASE.keys())}


# ─── Demo ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    print("Available plastics:", list_available_plastics())
    print()

    for plastic in list_available_plastics():
        props = get_material_properties(plastic)
        print(f"─── {plastic} ({props['full_name']}) ───")
        print(json.dumps(props, indent=2, ensure_ascii=False))
        print()
