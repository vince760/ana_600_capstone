"""Pydantic models for the Phase 3 assessment API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SubmissionSource(str, Enum):
    onboarding = "onboarding"


class AssessmentStatus(str, Enum):
    complete = "complete"
    processing = "processing"
    failed = "failed"


class ExplanationStatus(str, Enum):
    not_generated = "not_generated"


class DriverEffect(str, Enum):
    increases_probability = "increases_probability"
    decreases_probability = "decreases_probability"


class AssessmentInputPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    primary_user_age_years: int = Field(..., ge=18, le=100)
    num_children_under_18: int = Field(..., ge=0, le=20)
    annual_household_income_usd: float = Field(..., ge=0)
    total_household_debt_usd: float = Field(..., ge=0)
    monthly_consumer_debt_payments_usd: float = Field(..., ge=0)
    liquid_assets_usd: float = Field(..., ge=0)
    credit_card_revolving_balance_usd: float = Field(..., ge=0)
    monthly_grocery_spend_usd: float = Field(..., ge=0)
    monthly_dining_spend_usd: float = Field(..., ge=0)


class ResearchMetadataPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    research_consent_accepted: bool
    research_consent_version: str = Field(..., min_length=1)
    flow_version: str = Field(..., min_length=1)

    @field_validator("research_consent_accepted")
    @classmethod
    def ensure_consent(cls, value: bool) -> bool:
        if value is not True:
            raise ValueError("research_consent_accepted must be true")
        return value


class AssessmentContextPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employment_status: str | None = None
    housing_status: str | None = None
    marital_status: str | None = None
    education_level: str | None = None
    free_text_notes: str | None = None


class CreateAssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    submission_source: SubmissionSource = SubmissionSource.onboarding
    input: AssessmentInputPayload
    research: ResearchMetadataPayload
    context: AssessmentContextPayload | None = None


class PredictionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target: Literal["expenshilo_probability"] = "expenshilo_probability"
    probability: float = Field(..., ge=0, le=1)
    model_version: str
    feature_version: str
    prediction_model_name: str
    shap_model_name: str


class DriverResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature_key: str
    display_name: str
    normalized_value: float
    shap_value: float
    effect: DriverEffect
    plain_description: str


class ExplanationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ExplanationStatus = ExplanationStatus.not_generated
    message: str


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assessment_id: str
    status: AssessmentStatus
    created_at: datetime
    submission_source: SubmissionSource
    prediction: PredictionResponse
    drivers: list[DriverResponse]
    explanation: ExplanationResponse


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"] = "ok"
    artifact_path: str
    artifact_version: str
    prediction_model_name: str
    shap_model_name: str


class OnboardingFieldDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    label: str
    type: Literal["integer", "number", "boolean", "string"]
    unit: str | None = None
    required: bool
    minimum: float | int | None = None
    maximum: float | int | None = None
    section: str
    description: str
    example: int | float | bool | str | None = None


class OnboardingSchemaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str
    submission_source: SubmissionSource
    fields: list[OnboardingFieldDefinition]

