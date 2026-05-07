"""Deterministic and Claude-backed explanation helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import os
import time
from typing import Any

import httpx

from .models import (
    DriverResponse,
    ExplanationResponse,
    ExplanationSource,
    ExplanationStatus,
    ExperimentArm,
)


DEFAULT_STRUCTURED_PROMPT_VERSION = "structured_v1"
DEFAULT_LLM_PROMPT_VERSION = "anthropic_explanation_v1"
DEFAULT_ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_ANTHROPIC_API_VERSION = "2023-06-01"
DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-7"
DEFAULT_ANTHROPIC_MAX_TOKENS = 220
DEFAULT_ANTHROPIC_TIMEOUT_SECONDS = 20.0


SYSTEM_PROMPT = (
    "You explain a financial risk model to a research participant. "
    "Use only the facts provided. Write plain text only, not JSON or bullets. "
    "Keep the explanation to 90-140 words, clear and calm. "
    "Do not mention SHAP, experiment arms, API details, or internal model names. "
    "Avoid giving direct financial advice or moral judgment. "
    "Say the result is based on the information the user provided and is not financial advice."
)


class ExplanationGenerationError(RuntimeError):
    """Raised when a Claude explanation request cannot be completed."""


@dataclass(frozen=True)
class ExplanationFacts:
    assessment_id: str
    probability: float
    probability_band: str
    experiment_arm: str
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


def describe_probability_band(probability: float) -> str:
    if probability < 0.33:
        return "lower"
    if probability < 0.66:
        return "moderate"
    return "higher"


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
        drivers=[
            {
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


def build_structured_explanation(
    *,
    probability: float,
    drivers: list[DriverResponse],
) -> ExplanationResponse:
    probability_percent = probability * 100
    probability_band = describe_probability_band(probability)
    upward = _top_driver_names(drivers, "increases_probability")
    downward = _top_driver_names(drivers, "decreases_probability")

    upward_text = ", ".join(upward[:2]) if upward else "the measured spending and debt factors"
    message = (
        f"Based on the information provided, your estimated likelihood of expense strain is "
        f"{probability_percent:.1f}%, which falls in the {probability_band} range. "
        f"The strongest factors pushing this estimate upward are {upward_text}."
    )
    if downward:
        message += f" A smaller set of factors, such as {downward[0]}, is pulling the estimate down."
    message += " This summary is based on the information you provided and is not financial advice."

    return ExplanationResponse(
        status=ExplanationStatus.generated,
        source=ExplanationSource.structured,
        message=message,
        prompt_version=DEFAULT_STRUCTURED_PROMPT_VERSION,
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
            "Mention the probability range and 2-4 of the most important factors.\n"
            "Use a calm tone and avoid advice beyond general caution.\n"
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
        probability: float,
        experiment_arm: ExperimentArm,
        drivers: list[DriverResponse],
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

        if experiment_arm == ExperimentArm.structured_explanation:
            return ExplanationOutcome(
                response=build_structured_explanation(
                    probability=probability,
                    drivers=drivers,
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
            ),
            llm_record=llm_record,
        )
