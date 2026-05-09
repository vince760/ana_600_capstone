"""Deterministic and Claude-backed explanation helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import math
import os
import time
from typing import Any, Callable

import httpx

from backend.inference import AssessmentInput

from .models import (
    DriverEffect,
    DriverResponse,
    ExplanationFactorResponse,
    ExplanationResponse,
    ExplanationSource,
    ExplanationStatus,
    ExperimentArm,
    RecommendationScenarioResponse,
)


DEFAULT_STRUCTURED_PROMPT_VERSION = "structured_v1"
DEFAULT_LLM_PROMPT_VERSION = "anthropic_explanation_v1"
DEFAULT_ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_ANTHROPIC_API_VERSION = "2023-06-01"
DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-7"
DEFAULT_ANTHROPIC_MAX_TOKENS = 360
DEFAULT_ANTHROPIC_TIMEOUT_SECONDS = 20.0
MAX_FACTOR_EXPLANATIONS = 4
MAX_RECOMMENDATION_SCENARIOS = 3


SYSTEM_PROMPT = (
    "You explain a financial risk model to a research participant. "
    "Use only the facts provided. Write plain text only, not JSON or bullets. "
    "Keep the explanation to 120-170 words, clear and calm. "
    "Do not mention SHAP, experiment arms, API details, or internal model names. "
    "Explain what the probability means in relation to the Survey of Consumer Finances: "
    "it estimates how similar this profile is to households that reported spending more "
    "than their income. Avoid saying the participant will or will not experience strain. "
    "Avoid technical phrases like weighs heavily, pushed upward, pulled downward, or nudge. "
    "Use participant-friendly language such as looks more similar or looks less similar. "
    "Avoid direct financial advice or moral judgment. "
    "End with a complete sentence saying the result is for research and educational use, "
    "based on the information provided, and is not financial advice."
)


FACTOR_TITLES: dict[str, dict[str, str]] = {
    "PAYMENT_TO_INC": {
        "increases_probability": "Debt payments take up more room",
        "decreases_probability": "Debt payments leave more room",
    },
    "CONSPAY": {
        "increases_probability": "Monthly debt payments reduce flexibility",
        "decreases_probability": "Monthly debt payments look manageable",
    },
    "FOODHOME": {
        "increases_probability": "Grocery spending uses more cash flow",
        "decreases_probability": "Grocery spending looks manageable",
    },
    "FOODAWAY": {
        "increases_probability": "Dining and takeout reduce flexibility",
        "decreases_probability": "Dining and takeout look contained",
    },
    "FOOD_DISCRETIONARY": {
        "increases_probability": "More food spending goes to dining out",
        "decreases_probability": "Food spending is less dining-heavy",
    },
    "LIQ_TO_INC": {
        "increases_probability": "Cash buffer looks thinner",
        "decreases_probability": "Cash buffer lowers concern",
    },
    "DTI": {
        "increases_probability": "Debt is high relative to income",
        "decreases_probability": "Debt is modest relative to income",
    },
    "DEBT": {
        "increases_probability": "Total debt limits flexibility",
        "decreases_probability": "Total debt looks less constraining",
    },
    "CCBAL": {
        "increases_probability": "Credit card balances add strain",
        "decreases_probability": "Credit card balances look contained",
    },
    "CC_TO_INC": {
        "increases_probability": "Credit card balances are noticeable",
        "decreases_probability": "Credit card balances are limited",
    },
    "INCOME": {
        "increases_probability": "Income leaves less margin",
        "decreases_probability": "Income provides more breathing room",
    },
    "KIDS": {
        "increases_probability": "Household needs may be higher",
        "decreases_probability": "Household size added less strain",
    },
    "AGE": {
        "increases_probability": "Life-stage pattern adds concern",
        "decreases_probability": "Life-stage pattern lowers concern",
    },
    "FOODHOME_X_PRE_RETIREMENT": {
        "increases_probability": "Groceries matter more at this life stage",
        "decreases_probability": "Life stage softened the grocery signal",
    },
}


FACTOR_GROUPS: dict[str, str] = {
    "DEBT": "debt_load",
    "DTI": "debt_load",
    "PAYMENT_TO_INC": "debt_payment",
    "CONSPAY": "debt_payment",
    "CCBAL": "credit_card",
    "CC_TO_INC": "credit_card",
    "FOODHOME": "groceries",
    "FOODHOME_X_PRE_RETIREMENT": "groceries",
    "FOODAWAY": "dining",
    "FOOD_DISCRETIONARY": "dining",
}


class ExplanationGenerationError(RuntimeError):
    """Raised when a Claude explanation request cannot be completed."""


@dataclass(frozen=True)
class ExplanationFacts:
    assessment_id: str
    probability: float
    probability_band: str
    experiment_arm: str
    reference_population: str
    target_definition: str
    drivers: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class LlmGenerationRecord:
    prompt_version: str
    llm_model_name: str
    status: str
    request_payload: dict[str, Any]
    response_text: str | None
    response_metadata: dict[str, Any] | None
    created_at: datetime


@dataclass(frozen=True)
class ExplanationOutcome:
    response: ExplanationResponse
    llm_record: LlmGenerationRecord | None = None


@dataclass(frozen=True)
class RecommendationCandidate:
    feature_key: str
    field_name: str
    title: str
    suggested_change: str
    updated_input: AssessmentInput


def describe_probability_band(probability: float) -> str:
    if probability < 0.33:
        return "lower"
    if probability < 0.66:
        return "moderate"
    return "higher"


def _similarity_level_for_band(probability_band: str) -> str:
    if probability_band == "lower":
        return "less similar"
    if probability_band == "higher":
        return "more similar"
    return "moderately similar"


def _format_currency(value: float) -> str:
    return f"${value:,.0f}"


def _format_percent(value: float) -> str:
    return f"{value * 100:.1f}%"


def _format_percentage_points(value: float) -> str:
    return f"{value * 100:.1f} percentage points"


def _round_up(value: float, increment: float) -> float:
    if value <= 0:
        return 0.0
    return increment * math.ceil(value / increment)


def _copy_input(
    assessment_input: AssessmentInput,
    **updates: float | int,
) -> AssessmentInput:
    payload = assessment_input.to_dict()
    payload.update(updates)
    return AssessmentInput.from_mapping(payload)


def build_explanation_facts(
    *,
    assessment_id: str,
    probability: float,
    experiment_arm: ExperimentArm,
    drivers: list[DriverResponse],
) -> ExplanationFacts:
    return ExplanationFacts(
        assessment_id=assessment_id,
        probability=probability,
        probability_band=describe_probability_band(probability),
        experiment_arm=experiment_arm.value,
        reference_population=(
            "U.S. households in the Survey of Consumer Finances used to train this model"
        ),
        target_definition=(
            "whether a household reported spending more than its income"
        ),
        drivers=[
            {
                "feature_key": driver.feature_key,
                "display_name": driver.display_name,
                "effect": driver.effect.value,
                "normalized_value": driver.normalized_value,
                "shap_value": driver.shap_value,
                "plain_description": driver.plain_description,
            }
            for driver in drivers
        ],
    )


def _top_driver_names(drivers: list[DriverResponse], effect: str) -> list[str]:
    return [driver.display_name for driver in drivers if driver.effect.value == effect][:3]


def _build_factor_title(driver: DriverResponse) -> str:
    return FACTOR_TITLES.get(driver.feature_key, {}).get(driver.effect.value, driver.display_name)


def _estimate_direction_phrase(effect: DriverEffect) -> str:
    if effect == DriverEffect.increases_probability:
        return "raised the estimate"
    return "lowered the estimate"


def _build_factor_summary(
    driver: DriverResponse,
    assessment_input: AssessmentInput,
) -> str:
    direction_phrase = _estimate_direction_phrase(driver.effect)

    if driver.feature_key == "PAYMENT_TO_INC":
        return (
            f"About {_format_percent(driver.normalized_value)} of annual income goes to "
            f"consumer debt payments when annualized. Fixed debt payments leave less room "
            f"for other needs, so this {direction_phrase}."
        )

    if driver.feature_key == "CONSPAY":
        return (
            f"Monthly consumer debt payments are about "
            f"{_format_currency(assessment_input.monthly_consumer_debt_payments_usd)}, "
            f"which is money already committed before other expenses. In this profile, that "
            f"{direction_phrase}."
        )

    if driver.feature_key == "FOODHOME":
        if driver.effect == DriverEffect.increases_probability:
            return (
                f"Groceries are about {_format_currency(assessment_input.monthly_grocery_spend_usd)} "
                f"per month. For this profile, that spending level made the household look "
                f"more similar to SCF households that reported spending above income."
            )
        return (
            f"Groceries are about {_format_currency(assessment_input.monthly_grocery_spend_usd)} "
            f"per month. For this profile, that spending level did not match the pattern "
            f"most associated with spending above income."
        )

    if driver.feature_key == "FOODAWAY":
        return (
            f"Dining out and takeout are about "
            f"{_format_currency(assessment_input.monthly_dining_spend_usd)} per month, "
            f"which can reduce monthly flexibility. In this profile, that {direction_phrase}."
        )

    if driver.feature_key == "FOOD_DISCRETIONARY":
        return (
            f"About {_format_percent(driver.normalized_value)} of the food budget goes to "
            f"dining out or takeout. That spending mix {direction_phrase}."
        )

    if driver.feature_key == "LIQ_TO_INC":
        return (
            f"Accessible savings are about {_format_currency(assessment_input.liquid_assets_usd)}, "
            f"or {_format_percent(driver.normalized_value)} of annual income. A larger cash buffer "
            f"can make a profile look more resilient, so this {direction_phrase}."
        )

    if driver.feature_key == "DTI":
        return (
            f"Total debt is about {_format_currency(assessment_input.total_household_debt_usd)}, "
            f"or {_format_percent(driver.normalized_value)} of annual income. That compares "
            f"debt load with earning power, and here it {direction_phrase}."
        )

    if driver.feature_key == "DEBT":
        return (
            f"Total household debt is about {_format_currency(assessment_input.total_household_debt_usd)}, "
            f"which the model compares with the rest of the profile. Here, it {direction_phrase}."
        )

    if driver.feature_key == "CCBAL":
        return (
            f"Revolving credit card balances are about "
            f"{_format_currency(assessment_input.credit_card_revolving_balance_usd)}, "
            f"which can signal short-term borrowing pressure. In this profile, that "
            f"{direction_phrase}."
        )

    if driver.feature_key == "CC_TO_INC":
        return (
            f"Credit card balances are about {_format_percent(driver.normalized_value)} "
            f"of annual income. That is not the whole picture, but it still {direction_phrase}."
        )

    if driver.feature_key == "INCOME":
        if driver.effect == DriverEffect.increases_probability:
            return (
                f"Annual household income is about {_format_currency(assessment_input.annual_household_income_usd)}. "
                f"In the SCF data, income is not a simple one-way signal; for this profile, "
                f"it appeared alongside other inputs in a pattern that raised the estimate."
            )
        return (
            f"Annual household income is about {_format_currency(assessment_input.annual_household_income_usd)}. "
            f"More income can provide room to absorb routine bills, debt payments, and surprises, "
            f"so this {direction_phrase}."
        )

    if driver.feature_key == "KIDS":
        child_text = "1 child" if assessment_input.num_children_under_18 == 1 else (
            f"{assessment_input.num_children_under_18} children"
        )
        return (
            f"The household profile included {child_text}. Household size can change regular "
            f"expenses, and in this profile it {direction_phrase}."
        )

    if driver.feature_key == "AGE":
        return (
            f"Age {assessment_input.primary_user_age_years} is part of the life-stage pattern in "
            f"the SCF data. In this profile, that life-stage signal {direction_phrase}."
        )

    if driver.feature_key == "FOODHOME_X_PRE_RETIREMENT":
        return (
            f"At age {assessment_input.primary_user_age_years}, grocery spending of about "
            f"{_format_currency(assessment_input.monthly_grocery_spend_usd)} per month became "
            f"more important to the estimate and {direction_phrase}."
        )

    return (
        f"{driver.plain_description} In this result, that factor {direction_phrase}."
    )


def build_factor_explanations(
    *,
    drivers: list[DriverResponse],
    assessment_input: AssessmentInput,
) -> list[ExplanationFactorResponse]:
    factor_explanations: list[ExplanationFactorResponse] = []
    seen_groups: set[str] = set()

    for driver in drivers:
        group = FACTOR_GROUPS.get(driver.feature_key, driver.feature_key)
        if group in seen_groups:
            continue

        factor_explanations.append(
            ExplanationFactorResponse(
                feature_key=driver.feature_key,
                title=_build_factor_title(driver),
                summary=_build_factor_summary(driver, assessment_input),
                effect=driver.effect,
                source=ExplanationSource.structured,
            )
        )
        seen_groups.add(group)

        if len(factor_explanations) >= MAX_FACTOR_EXPLANATIONS:
            break

    return factor_explanations


def _recommendation_candidate_for_driver(
    driver: DriverResponse,
    assessment_input: AssessmentInput,
) -> RecommendationCandidate | None:
    if driver.feature_key == "LIQ_TO_INC":
        current = assessment_input.liquid_assets_usd
        increase = _round_up(max(current * 0.15, 500.0), 100.0)
        return RecommendationCandidate(
            feature_key=driver.feature_key,
            field_name="liquid_assets_usd",
            title="If liquid savings were higher",
            suggested_change=f"Increase liquid savings by about {_format_currency(increase)}",
            updated_input=_copy_input(
                assessment_input,
                liquid_assets_usd=current + increase,
            ),
        )

    if driver.effect != DriverEffect.increases_probability:
        return None

    if driver.feature_key in {"PAYMENT_TO_INC", "CONSPAY"}:
        current = assessment_input.monthly_consumer_debt_payments_usd
        reduction = min(current, _round_up(max(current * 0.10, 50.0), 25.0))
        if reduction < 25:
            return None
        return RecommendationCandidate(
            feature_key=driver.feature_key,
            field_name="monthly_consumer_debt_payments_usd",
            title="If monthly debt payments were lower",
            suggested_change=(
                f"Test a scenario where required monthly consumer debt payments are about "
                f"{_format_currency(reduction)} lower"
            ),
            updated_input=_copy_input(
                assessment_input,
                monthly_consumer_debt_payments_usd=max(current - reduction, 0.0),
            ),
        )

    if driver.feature_key in {"FOODHOME", "FOODHOME_X_PRE_RETIREMENT"}:
        current = assessment_input.monthly_grocery_spend_usd
        reduction = min(current, _round_up(max(current * 0.10, 50.0), 25.0))
        if reduction < 25:
            return None
        return RecommendationCandidate(
            feature_key=driver.feature_key,
            field_name="monthly_grocery_spend_usd",
            title="If grocery spending were lower",
            suggested_change=(
                f"Test a scenario where monthly grocery spending is about "
                f"{_format_currency(reduction)} lower"
            ),
            updated_input=_copy_input(
                assessment_input,
                monthly_grocery_spend_usd=max(current - reduction, 0.0),
            ),
        )

    if driver.feature_key in {"FOODAWAY", "FOOD_DISCRETIONARY"}:
        current = assessment_input.monthly_dining_spend_usd
        reduction = min(current, _round_up(max(current * 0.15, 40.0), 20.0))
        if reduction < 20:
            return None
        return RecommendationCandidate(
            feature_key=driver.feature_key,
            field_name="monthly_dining_spend_usd",
            title="If dining and takeout spending were lower",
            suggested_change=(
                f"Test a scenario where monthly dining and takeout spending is about "
                f"{_format_currency(reduction)} lower"
            ),
            updated_input=_copy_input(
                assessment_input,
                monthly_dining_spend_usd=max(current - reduction, 0.0),
            ),
        )

    if driver.feature_key in {"CCBAL", "CC_TO_INC"}:
        current = assessment_input.credit_card_revolving_balance_usd
        reduction = min(current, _round_up(max(current * 0.15, 250.0), 50.0))
        if reduction < 50:
            return None
        return RecommendationCandidate(
            feature_key=driver.feature_key,
            field_name="credit_card_revolving_balance_usd",
            title="If revolving credit card balances were lower",
            suggested_change=(
                f"Test a scenario where revolving credit card balances are about "
                f"{_format_currency(reduction)} lower"
            ),
            updated_input=_copy_input(
                assessment_input,
                credit_card_revolving_balance_usd=max(current - reduction, 0.0),
            ),
        )

    if driver.feature_key in {"DEBT", "DTI"}:
        current = assessment_input.total_household_debt_usd
        reduction = min(current, _round_up(max(current * 0.10, 1000.0), 100.0))
        if reduction < 100:
            return None
        return RecommendationCandidate(
            feature_key=driver.feature_key,
            field_name="total_household_debt_usd",
            title="If total debt were lower",
            suggested_change=(
                f"Test a scenario where total household debt is about "
                f"{_format_currency(reduction)} lower"
            ),
            updated_input=_copy_input(
                assessment_input,
                total_household_debt_usd=max(current - reduction, 0.0),
            ),
        )

    return None


def build_recommendation_scenarios(
    *,
    assessment_input: AssessmentInput,
    probability: float,
    drivers: list[DriverResponse],
    predict_probability: Callable[[AssessmentInput], float],
) -> list[RecommendationScenarioResponse]:
    scenarios: list[RecommendationScenarioResponse] = []
    seen_fields: set[str] = set()

    for driver in drivers:
        candidate = _recommendation_candidate_for_driver(driver, assessment_input)
        if candidate is None or candidate.field_name in seen_fields:
            continue

        projected_probability = predict_probability(candidate.updated_input)
        improvement = probability - projected_probability
        if improvement <= 0:
            continue

        scenarios.append(
            RecommendationScenarioResponse(
                feature_key=candidate.feature_key,
                title=candidate.title,
                suggested_change=candidate.suggested_change,
                summary=(
                    f"With all other inputs unchanged, this sensitivity check moves the estimate "
                    f"from {_format_percent(probability)} to {_format_percent(projected_probability)}. "
                    f"That is about {_format_percentage_points(improvement)} lower, so it should be "
                    f"read as a model scenario rather than a personal recommendation."
                ),
                current_probability=probability,
                projected_probability=projected_probability,
                absolute_improvement=improvement,
                source=ExplanationSource.structured,
            )
        )
        seen_fields.add(candidate.field_name)

        if len(scenarios) >= MAX_RECOMMENDATION_SCENARIOS:
            break

    return scenarios


def build_structured_explanation(
    *,
    probability: float,
    drivers: list[DriverResponse],
    factor_explanations: list[ExplanationFactorResponse],
    recommendation_scenarios: list[RecommendationScenarioResponse],
) -> ExplanationResponse:
    probability_percent = probability * 100
    probability_band = describe_probability_band(probability)
    upward = _top_driver_names(drivers, "increases_probability")
    downward = _top_driver_names(drivers, "decreases_probability")

    upward_text = ", ".join(upward[:2]) if upward else "the measured spending and debt factors"
    downward_text = ", ".join(downward[:2]) if downward else "the available financial buffer"
    message = (
        f"This result estimates a {probability_percent:.1f}% likelihood, which is in the "
        f"{probability_band} range. In this project, that number means this profile looks "
        f"{_similarity_level_for_band(probability_band)} to Survey of Consumer Finances households who "
        f"reported spending more than their income. "
    )

    if probability_band == "lower" and downward:
        message += (
            f"The main reasons the estimate stays low are {downward_text}. "
            f"The factors that still moved it higher were {upward_text}."
        )
    else:
        message += f"The main factors making the estimate higher were {upward_text}."
        if downward:
            message += (
                f" Factors such as {downward[0]} made the profile look less similar "
                f"to that group."
            )

    if recommendation_scenarios:
        message += " The what-if cards show how the model estimate changes when one input is adjusted."
    message += " This result is for research and educational use, based on the information provided, and is not financial advice."

    return ExplanationResponse(
        status=ExplanationStatus.generated,
        source=ExplanationSource.structured,
        message=message,
        prompt_version=DEFAULT_STRUCTURED_PROMPT_VERSION,
        factor_explanations=factor_explanations,
        recommendation_scenarios=recommendation_scenarios,
    )


class AnthropicExplanationClient:
    """Thin wrapper around the Anthropic Messages API."""

    def __init__(
        self,
        *,
        api_key: str,
        model_name: str,
        prompt_version: str,
        api_url: str = DEFAULT_ANTHROPIC_API_URL,
        api_version: str = DEFAULT_ANTHROPIC_API_VERSION,
        max_tokens: int = DEFAULT_ANTHROPIC_MAX_TOKENS,
        timeout_seconds: float = DEFAULT_ANTHROPIC_TIMEOUT_SECONDS,
    ) -> None:
        self.api_key = api_key
        self.model_name = model_name
        self.prompt_version = prompt_version
        self.api_url = api_url
        self.api_version = api_version
        self.max_tokens = max_tokens
        self.timeout_seconds = timeout_seconds

    @classmethod
    def from_env(cls) -> "AnthropicExplanationClient | None":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            return None

        return cls(
            api_key=api_key,
            model_name=os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL),
            prompt_version=os.getenv(
                "FINSIGHT_LLM_PROMPT_VERSION",
                DEFAULT_LLM_PROMPT_VERSION,
            ),
            api_url=os.getenv("ANTHROPIC_API_URL", DEFAULT_ANTHROPIC_API_URL),
            api_version=os.getenv(
                "ANTHROPIC_API_VERSION",
                DEFAULT_ANTHROPIC_API_VERSION,
            ),
            max_tokens=int(
                os.getenv("FINSIGHT_LLM_MAX_TOKENS", str(DEFAULT_ANTHROPIC_MAX_TOKENS))
            ),
            timeout_seconds=float(
                os.getenv(
                    "ANTHROPIC_TIMEOUT_SECONDS",
                    str(DEFAULT_ANTHROPIC_TIMEOUT_SECONDS),
                )
            ),
        )

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def _build_request_payload(self, facts: ExplanationFacts) -> dict[str, Any]:
        user_prompt = (
            "Write a plain-language explanation for this assessment.\n"
            "Use this order: first explain what the probability means, then explain 2-4 "
            "important factors, then close with the research/not-financial-advice caveat.\n"
            "Use concrete, everyday language. Prefer 'looks more similar to households that "
            "spent above income' or 'looks less similar' over technical model language.\n"
            "Do not overstate certainty. Finish with a complete sentence.\n"
            f"Facts:\n{json.dumps(facts.to_dict(), indent=2)}"
        )
        return {
            "model": self.model_name,
            "max_tokens": self.max_tokens,
            "system": SYSTEM_PROMPT,
            "messages": [
                {
                    "role": "user",
                    "content": user_prompt,
                }
            ],
        }

    def generate(self, facts: ExplanationFacts) -> LlmGenerationRecord:
        request_payload = self._build_request_payload(facts)
        created_at = datetime.now(timezone.utc)
        started = time.perf_counter()

        try:
            response = httpx.post(
                self.api_url,
                headers={
                    "x-api-key": self.api_key,
                    "anthropic-version": self.api_version,
                    "content-type": "application/json",
                },
                json=request_payload,
                timeout=self.timeout_seconds,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text or f"Anthropic request failed with {exc.response.status_code}"
            raise ExplanationGenerationError(detail) from exc
        except httpx.HTTPError as exc:
            raise ExplanationGenerationError(f"Anthropic request failed: {exc}") from exc

        payload = response.json()
        text_parts = [
            block.get("text", "")
            for block in payload.get("content", [])
            if block.get("type") == "text"
        ]
        response_text = " ".join(part.strip() for part in text_parts if part.strip()).strip()
        if not response_text:
            raise ExplanationGenerationError("Anthropic response did not include text content.")

        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        return LlmGenerationRecord(
            prompt_version=self.prompt_version,
            llm_model_name=str(payload.get("model") or self.model_name),
            status=ExplanationStatus.generated.value,
            request_payload=request_payload,
            response_text=response_text,
            response_metadata={
                "id": payload.get("id"),
                "type": payload.get("type"),
                "role": payload.get("role"),
                "stop_reason": payload.get("stop_reason"),
                "usage": payload.get("usage"),
                "latency_ms": elapsed_ms,
            },
            created_at=created_at,
        )


class ExplanationService:
    """Chooses the correct explanation strategy for the experiment arm."""

    def __init__(
        self,
        anthropic_client: AnthropicExplanationClient | None = None,
    ) -> None:
        self.anthropic_client = anthropic_client

    @classmethod
    def from_env(cls) -> "ExplanationService":
        return cls(anthropic_client=AnthropicExplanationClient.from_env())

    @property
    def llm_enabled(self) -> bool:
        return self.anthropic_client is not None and self.anthropic_client.enabled

    @property
    def llm_model_name(self) -> str | None:
        if self.anthropic_client is None:
            return None
        return self.anthropic_client.model_name

    @property
    def llm_prompt_version(self) -> str | None:
        if self.anthropic_client is None:
            return None
        return self.anthropic_client.prompt_version

    def build_for_arm(
        self,
        *,
        assessment_id: str,
        assessment_input: AssessmentInput,
        probability: float,
        experiment_arm: ExperimentArm,
        drivers: list[DriverResponse],
        predict_probability: Callable[[AssessmentInput], float],
    ) -> ExplanationOutcome:
        if experiment_arm == ExperimentArm.control:
            return ExplanationOutcome(
                response=ExplanationResponse(
                    status=ExplanationStatus.not_generated,
                    source=ExplanationSource.none,
                    message=(
                        "No explanation was attached for this assessment variant. "
                        "The prediction and ranked drivers are still available."
                    ),
                )
            )

        factor_explanations = build_factor_explanations(
            drivers=drivers,
            assessment_input=assessment_input,
        )
        recommendation_scenarios = build_recommendation_scenarios(
            assessment_input=assessment_input,
            probability=probability,
            drivers=drivers,
            predict_probability=predict_probability,
        )

        if experiment_arm == ExperimentArm.structured_explanation:
            return ExplanationOutcome(
                response=build_structured_explanation(
                    probability=probability,
                    drivers=drivers,
                    factor_explanations=factor_explanations,
                    recommendation_scenarios=recommendation_scenarios,
                )
            )

        facts = build_explanation_facts(
            assessment_id=assessment_id,
            probability=probability,
            experiment_arm=experiment_arm,
            drivers=drivers,
        )

        if self.anthropic_client is None:
            return ExplanationOutcome(
                response=ExplanationResponse(
                    status=ExplanationStatus.failed,
                    source=ExplanationSource.llm,
                    message=(
                        "The LLM explanation could not be generated because the Anthropic API "
                        "key is not configured for this backend."
                    ),
                    prompt_version=DEFAULT_LLM_PROMPT_VERSION,
                    llm_model_name=DEFAULT_ANTHROPIC_MODEL,
                    factor_explanations=factor_explanations,
                    recommendation_scenarios=recommendation_scenarios,
                ),
                llm_record=LlmGenerationRecord(
                    prompt_version=DEFAULT_LLM_PROMPT_VERSION,
                    llm_model_name=DEFAULT_ANTHROPIC_MODEL,
                    status=ExplanationStatus.failed.value,
                    request_payload={"facts": facts.to_dict()},
                    response_text=None,
                    response_metadata={"error": "ANTHROPIC_API_KEY not configured"},
                    created_at=datetime.now(timezone.utc),
                ),
            )

        try:
            llm_record = self.anthropic_client.generate(facts)
        except ExplanationGenerationError as exc:
            return ExplanationOutcome(
                response=ExplanationResponse(
                    status=ExplanationStatus.failed,
                    source=ExplanationSource.llm,
                    message=(
                        "The LLM explanation could not be generated for this assessment. "
                        "The prediction and ranked drivers are still available."
                    ),
                    prompt_version=self.anthropic_client.prompt_version,
                    llm_model_name=self.anthropic_client.model_name,
                    factor_explanations=factor_explanations,
                    recommendation_scenarios=recommendation_scenarios,
                ),
                llm_record=LlmGenerationRecord(
                    prompt_version=self.anthropic_client.prompt_version,
                    llm_model_name=self.anthropic_client.model_name,
                    status=ExplanationStatus.failed.value,
                    request_payload=self.anthropic_client._build_request_payload(facts),
                    response_text=None,
                    response_metadata={"error": str(exc)},
                    created_at=datetime.now(timezone.utc),
                ),
            )

        return ExplanationOutcome(
            response=ExplanationResponse(
                status=ExplanationStatus.generated,
                source=ExplanationSource.llm,
                message=llm_record.response_text or "",
                prompt_version=llm_record.prompt_version,
                llm_model_name=llm_record.llm_model_name,
                factor_explanations=factor_explanations,
                recommendation_scenarios=recommendation_scenarios,
            ),
            llm_record=llm_record,
        )
