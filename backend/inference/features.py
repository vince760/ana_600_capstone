"""Normalization and feature engineering for expenshilo inference."""

from __future__ import annotations

from backend.expenshilo_core import (
    FEATURE_VERSION,
    build_model_feature_mapping,
)
from .schemas import AssessmentInput, FeatureSnapshot, InferencePreprocessingConfig


def _normalize_input(assessment_input: AssessmentInput) -> dict[str, float | int]:
    return {
        "primary_user_age_years": assessment_input.primary_user_age_years,
        "num_children_under_18": assessment_input.num_children_under_18,
        "annual_household_income_usd": assessment_input.annual_household_income_usd,
        "total_household_debt_usd": assessment_input.total_household_debt_usd,
        "monthly_consumer_debt_payments_usd": (
            assessment_input.monthly_consumer_debt_payments_usd
        ),
        "liquid_assets_usd": assessment_input.liquid_assets_usd,
        "credit_card_revolving_balance_usd": (
            assessment_input.credit_card_revolving_balance_usd
        ),
        "monthly_grocery_spend_usd": assessment_input.monthly_grocery_spend_usd,
        "monthly_dining_spend_usd": assessment_input.monthly_dining_spend_usd,
        "annual_grocery_spend_usd": assessment_input.monthly_grocery_spend_usd * 12,
        "annual_dining_spend_usd": assessment_input.monthly_dining_spend_usd * 12,
    }


def build_feature_snapshot(
    assessment_input: AssessmentInput,
    preprocessing: InferencePreprocessingConfig | None = None,
) -> FeatureSnapshot:
    """Build raw, normalized, engineered, and ordered model features."""

    normalized_input = _normalize_input(assessment_input)
    canonical_raw_features = {
        "INCOME": float(normalized_input["annual_household_income_usd"]),
        "DEBT": float(normalized_input["total_household_debt_usd"]),
        "CONSPAY": float(normalized_input["monthly_consumer_debt_payments_usd"]),
        "LIQ": float(normalized_input["liquid_assets_usd"]),
        "CCBAL": float(normalized_input["credit_card_revolving_balance_usd"]),
        "FOODHOME": float(normalized_input["annual_grocery_spend_usd"]),
        "FOODAWAY": float(normalized_input["annual_dining_spend_usd"]),
        "AGE": int(normalized_input["primary_user_age_years"]),
        "KIDS": int(normalized_input["num_children_under_18"]),
    }
    engineered_features, model_features = build_model_feature_mapping(
        canonical_raw_features,
        preprocessing=preprocessing,
    )

    return FeatureSnapshot(
        feature_version=preprocessing.feature_version if preprocessing else FEATURE_VERSION,
        raw_input=assessment_input.to_dict(),
        normalized_input=normalized_input,
        engineered_features=engineered_features,
        model_features=dict(model_features),
    )


def build_model_feature_vector(
    assessment_input: AssessmentInput,
    preprocessing: InferencePreprocessingConfig | None = None,
) -> list[float]:
    """Return the ordered numeric vector expected by the saved model."""

    snapshot = build_feature_snapshot(assessment_input, preprocessing=preprocessing)
    return [float(value) for value in snapshot.model_features.values()]
