"""Schema and validation helpers for expenshilo inference."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import math
from typing import Any, Mapping

from backend.expenshilo_core import FEATURE_VERSION, InferencePreprocessingConfig

from .constants import REQUIRED_INPUT_FIELDS


class ValidationError(ValueError):
    """Raised when assessment input fails validation."""


def _coerce_int(name: str, value: Any) -> int:
    if isinstance(value, bool):
        raise ValidationError(f"{name} must be an integer, not a boolean")

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        if not value.is_integer():
            raise ValidationError(f"{name} must be a whole number")
        return int(value)

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            raise ValidationError(f"{name} is required")
        try:
            parsed = float(stripped)
        except ValueError as exc:
            raise ValidationError(f"{name} must be a number") from exc
        if not parsed.is_integer():
            raise ValidationError(f"{name} must be a whole number")
        return int(parsed)

    raise ValidationError(f"{name} must be a whole number")


def _coerce_float(name: str, value: Any) -> float:
    if isinstance(value, bool):
        raise ValidationError(f"{name} must be a number, not a boolean")

    if isinstance(value, (int, float)):
        parsed = float(value)
    elif isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            raise ValidationError(f"{name} is required")
        try:
            parsed = float(stripped)
        except ValueError as exc:
            raise ValidationError(f"{name} must be a number") from exc
    else:
        raise ValidationError(f"{name} must be a number")

    if not math.isfinite(parsed):
        raise ValidationError(f"{name} must be finite")

    return parsed


@dataclass(frozen=True)
class AssessmentInput:
    """Validated Phase 1 onboarding payload used for model inference."""

    primary_user_age_years: int
    num_children_under_18: int
    annual_household_income_usd: float
    total_household_debt_usd: float
    monthly_consumer_debt_payments_usd: float
    liquid_assets_usd: float
    credit_card_revolving_balance_usd: float
    monthly_grocery_spend_usd: float
    monthly_dining_spend_usd: float

    def __post_init__(self) -> None:
        if not 18 <= self.primary_user_age_years <= 100:
            raise ValidationError("primary_user_age_years must be between 18 and 100")

        if not 0 <= self.num_children_under_18 <= 20:
            raise ValidationError("num_children_under_18 must be between 0 and 20")

        currency_fields = (
            "annual_household_income_usd",
            "total_household_debt_usd",
            "monthly_consumer_debt_payments_usd",
            "liquid_assets_usd",
            "credit_card_revolving_balance_usd",
            "monthly_grocery_spend_usd",
            "monthly_dining_spend_usd",
        )
        for field_name in currency_fields:
            if getattr(self, field_name) < 0:
                raise ValidationError(f"{field_name} must be greater than or equal to 0")

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "AssessmentInput":
        missing = [field_name for field_name in REQUIRED_INPUT_FIELDS if field_name not in data]
        if missing:
            raise ValidationError(
                f"Missing required fields: {', '.join(sorted(missing))}"
            )

        return cls(
            primary_user_age_years=_coerce_int(
                "primary_user_age_years", data["primary_user_age_years"]
            ),
            num_children_under_18=_coerce_int(
                "num_children_under_18", data["num_children_under_18"]
            ),
            annual_household_income_usd=_coerce_float(
                "annual_household_income_usd", data["annual_household_income_usd"]
            ),
            total_household_debt_usd=_coerce_float(
                "total_household_debt_usd", data["total_household_debt_usd"]
            ),
            monthly_consumer_debt_payments_usd=_coerce_float(
                "monthly_consumer_debt_payments_usd",
                data["monthly_consumer_debt_payments_usd"],
            ),
            liquid_assets_usd=_coerce_float(
                "liquid_assets_usd", data["liquid_assets_usd"]
            ),
            credit_card_revolving_balance_usd=_coerce_float(
                "credit_card_revolving_balance_usd",
                data["credit_card_revolving_balance_usd"],
            ),
            monthly_grocery_spend_usd=_coerce_float(
                "monthly_grocery_spend_usd", data["monthly_grocery_spend_usd"]
            ),
            monthly_dining_spend_usd=_coerce_float(
                "monthly_dining_spend_usd", data["monthly_dining_spend_usd"]
            ),
        )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

@dataclass(frozen=True)
class FeatureSnapshot:
    """Normalized feature payload ready for persistence or model scoring."""

    feature_version: str
    raw_input: dict[str, Any]
    normalized_input: dict[str, Any]
    engineered_features: dict[str, float]
    model_features: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
