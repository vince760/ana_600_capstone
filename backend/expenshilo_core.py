"""Shared expenshilo feature-engineering and training-prep logic."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
import math
from typing import Any, Mapping, Sequence

import numpy as np
import pandas as pd


FEATURE_VERSION = "scf-expenshilo-features-v1"
MODEL_TARGET = "expenshilo_probability"

RAW_FEATURES = {
    "INCOME": "Total Household Income",
    "DEBT": "Total Debt",
    "CONSPAY": "Monthly Consumer Debt Payments",
    "FOODHOME": "Food Spending (Home)",
    "KIDS": "Number of Children in Household",
}

CANONICAL_RAW_INPUT_ORDER = (
    "INCOME",
    "DEBT",
    "CONSPAY",
    "LIQ",
    "CCBAL",
    "FOODHOME",
    "FOODAWAY",
    "AGE",
    "KIDS",
)

MODEL_FEATURE_ORDER = (
    "INCOME",
    "DEBT",
    "CONSPAY",
    "FOODHOME",
    "KIDS",
    "DTI",
    "PAYMENT_TO_INC",
    "CC_TO_INC",
    "LIQ_TO_INC",
    "FOODHOME_X_PRE_RETIREMENT",
    "FOOD_DISCRETIONARY",
)

DOLLAR_MODEL_FEATURES = ("INCOME", "DEBT", "CONSPAY", "FOODHOME")
RATIO_MODEL_FEATURES = ("DTI", "PAYMENT_TO_INC", "CC_TO_INC", "LIQ_TO_INC")
INTERACTION_MODEL_FEATURES = ("FOODHOME_X_PRE_RETIREMENT", "FOOD_DISCRETIONARY")


@dataclass(frozen=True)
class InferencePreprocessingConfig:
    """Learned serving-time preprocessing values from training artifacts."""

    feature_version: str = FEATURE_VERSION
    fill_values: dict[str, float] = field(default_factory=dict)
    upper_clip_bounds: dict[str, float] = field(default_factory=dict)


def safe_ratio(numerator: float, denominator: float) -> float:
    """Return a finite ratio, defaulting to 0 when denominator is non-positive."""

    if denominator <= 0:
        return 0.0
    return float(numerator) / float(denominator)


def add_household_id(df: pd.DataFrame) -> pd.DataFrame:
    """Add the grouped SCF household identifier used for leakage-safe splits."""

    result = df.copy()
    if "Y1" in result.columns:
        result["household_id"] = result["Y1"].astype(str).str[:-1].astype(int)
    else:
        result["household_id"] = np.arange(len(result))
    return result


def add_target_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Add the V6 financial-confirmation target and return summary metadata."""

    result = df.copy()
    result["TOTAL_OUTFLOW"] = (
        result["TPAY"] * 12
        + result["FOODHOME"]
        + result["FOODAWAY"]
        + result["FOODDELV"].fillna(0)
    )
    result["SPEND_RATIO"] = np.where(
        result["INCOME"] > 0,
        result["TOTAL_OUTFLOW"] / result["INCOME"],
        0,
    )
    result["SPEND_RATIO"] = (
        result["SPEND_RATIO"].replace([np.inf, -np.inf], np.nan).fillna(0)
    )

    median_spend_ratio = float(result["SPEND_RATIO"].median())
    self_reported = (result["EXPENSHILO"] == 1).astype(int)
    result["calc_over"] = (result["SPEND_RATIO"] > median_spend_ratio).astype(int)
    result["target"] = (self_reported & result["calc_over"]).astype(int)

    metadata = {
        "median_spend_ratio_cutoff": median_spend_ratio,
        "self_reported_count": int(self_reported.sum()),
        "numerical_overspending_count": int(result["calc_over"].sum()),
        "positive_count": int(result["target"].sum()),
        "neither_count": int(((self_reported == 0) & (result["calc_over"] == 0)).sum()),
        "self_only_count": int(((self_reported == 1) & (result["calc_over"] == 0)).sum()),
        "calc_only_count": int(((self_reported == 0) & (result["calc_over"] == 1)).sum()),
        "positive_rate": float(result["target"].mean()),
    }

    return result, metadata


def add_engineered_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add the engineered columns used by the expenshilo model."""

    result = df.copy()

    if "DEBT2INC" in result.columns:
        result["DTI"] = result["DEBT2INC"]
    else:
        result["DTI"] = np.where(result["INCOME"] > 0, result["DEBT"] / result["INCOME"], 0)

    result["PAYMENT_TO_INC"] = np.where(
        result["INCOME"] > 0,
        (result["CONSPAY"] * 12) / result["INCOME"],
        0,
    )
    result["CC_TO_INC"] = np.where(result["INCOME"] > 0, result["CCBAL"] / result["INCOME"], 0)
    result["LIQ_TO_INC"] = np.where(result["INCOME"] > 0, result["LIQ"] / result["INCOME"], 0)
    result["IS_PRE_RETIREMENT"] = (result["AGE"] >= 55).astype(int)
    result["FOODHOME_X_PRE_RETIREMENT"] = result["FOODHOME"] * result["IS_PRE_RETIREMENT"]
    result["FOOD_DISCRETIONARY"] = (
        result["FOODAWAY"] / (result["FOODHOME"] + result["FOODAWAY"] + 1)
    )

    if "AGE" in result.columns:
        result["age_group"] = pd.cut(
            result["AGE"],
            bins=[0, 34, 54, 100],
            labels=["young_adult", "prime_earning", "pre_retirement"],
            include_lowest=True,
        )

    return result


def get_available_raw_features(df: pd.DataFrame) -> dict[str, str]:
    """Return raw model features that exist in the provided dataframe."""

    return {feature: label for feature, label in RAW_FEATURES.items() if feature in df.columns}


def get_model_feature_columns(df: pd.DataFrame) -> list[str]:
    """Return the ordered model feature set available in the dataframe."""

    return [feature for feature in MODEL_FEATURE_ORDER if feature in df.columns]


def apply_preprocessing_to_feature_mapping(
    model_features: Mapping[str, float],
    config: InferencePreprocessingConfig | None,
) -> OrderedDict[str, float]:
    """Apply training-derived fill and clip rules to a single feature mapping."""

    processed = OrderedDict(
        (key, float(value) if value is not None else value)
        for key, value in model_features.items()
    )

    if config is None:
        return processed

    for key, fill_value in config.fill_values.items():
        current = processed.get(key)
        if current is None or not math.isfinite(float(current)):
            processed[key] = float(fill_value)

    for key, upper_bound in config.upper_clip_bounds.items():
        current = processed.get(key)
        if current is None:
            continue
        processed[key] = min(float(current), float(upper_bound))

    return processed


def build_engineered_feature_mapping(
    raw_features: Mapping[str, float | int],
) -> dict[str, float]:
    """Build engineered expenshilo features from canonical raw values."""

    income = float(raw_features["INCOME"])
    debt = float(raw_features["DEBT"])
    monthly_payments = float(raw_features["CONSPAY"])
    liquid_assets = float(raw_features["LIQ"])
    revolving_cc_balance = float(raw_features["CCBAL"])
    annual_grocery = float(raw_features["FOODHOME"])
    annual_dining = float(raw_features["FOODAWAY"])
    age = int(raw_features["AGE"])

    is_pre_retirement = 1.0 if age >= 55 else 0.0

    return {
        "DTI": safe_ratio(debt, income),
        "PAYMENT_TO_INC": safe_ratio(monthly_payments * 12, income),
        "CC_TO_INC": safe_ratio(revolving_cc_balance, income),
        "LIQ_TO_INC": safe_ratio(liquid_assets, income),
        "IS_PRE_RETIREMENT": is_pre_retirement,
        "FOODHOME_X_PRE_RETIREMENT": annual_grocery * is_pre_retirement,
        "FOOD_DISCRETIONARY": annual_dining / (annual_grocery + annual_dining + 1.0),
    }


def build_model_feature_mapping(
    raw_features: Mapping[str, float | int],
    preprocessing: InferencePreprocessingConfig | None = None,
) -> tuple[dict[str, float], OrderedDict[str, float]]:
    """Build engineered and ordered model features from canonical raw inputs."""

    missing = [feature for feature in CANONICAL_RAW_INPUT_ORDER if feature not in raw_features]
    if missing:
        raise KeyError(f"Missing canonical raw features: {', '.join(missing)}")

    engineered = build_engineered_feature_mapping(raw_features)
    model_features = OrderedDict(
        (
            ("INCOME", float(raw_features["INCOME"])),
            ("DEBT", float(raw_features["DEBT"])),
            ("CONSPAY", float(raw_features["CONSPAY"])),
            ("FOODHOME", float(raw_features["FOODHOME"])),
            ("KIDS", float(raw_features["KIDS"])),
            ("DTI", engineered["DTI"]),
            ("PAYMENT_TO_INC", engineered["PAYMENT_TO_INC"]),
            ("CC_TO_INC", engineered["CC_TO_INC"]),
            ("LIQ_TO_INC", engineered["LIQ_TO_INC"]),
            ("FOODHOME_X_PRE_RETIREMENT", engineered["FOODHOME_X_PRE_RETIREMENT"]),
            ("FOOD_DISCRETIONARY", engineered["FOOD_DISCRETIONARY"]),
        )
    )
    return engineered, apply_preprocessing_to_feature_mapping(model_features, preprocessing)


def preprocess_training_features(
    df: pd.DataFrame,
    feature_cols: Sequence[str] | None = None,
) -> tuple[pd.DataFrame, InferencePreprocessingConfig, dict[str, Any]]:
    """Apply training-time fill and clip rules and return the learned config."""

    if feature_cols is None:
        feature_cols = get_model_feature_columns(df)

    feature_frame = df[list(feature_cols)].copy()
    fill_values: dict[str, float] = {}
    fill_counts: dict[str, int] = {}

    for column in feature_cols:
        feature_frame[column] = feature_frame[column].replace([np.inf, -np.inf], np.nan)
        na_count = int(feature_frame[column].isna().sum())
        if na_count > 0:
            fill_value = float(feature_frame[column].median())
            fill_values[column] = fill_value
            fill_counts[column] = na_count
            feature_frame[column] = feature_frame[column].fillna(fill_value)

    upper_clip_bounds: dict[str, float] = {}
    clip_counts: dict[str, int] = {}
    clip_groups = (
        DOLLAR_MODEL_FEATURES
        + RATIO_MODEL_FEATURES
        + INTERACTION_MODEL_FEATURES
    )
    for column in feature_cols:
        if column not in clip_groups:
            continue
        upper_bound = float(feature_frame[column].quantile(0.99))
        upper_clip_bounds[column] = upper_bound
        clipped = int((feature_frame[column] > upper_bound).sum())
        clip_counts[column] = clipped
        feature_frame[column] = feature_frame[column].clip(upper=upper_bound)

    config = InferencePreprocessingConfig(
        feature_version=FEATURE_VERSION,
        fill_values=fill_values,
        upper_clip_bounds=upper_clip_bounds,
    )

    summary = {
        "fill_counts": fill_counts,
        "upper_clip_bounds": upper_clip_bounds,
        "clip_counts": clip_counts,
    }

    return feature_frame, config, summary
