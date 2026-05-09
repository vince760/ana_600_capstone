"""Pydantic models for the Phase 3 assessment API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SubmissionSource(str, Enum):
    onboarding = "onboarding"


class AssessmentStatus(str, Enum):
    complete = "complete"
    processing = "processing"
    failed = "failed"


class ExplanationStatus(str, Enum):
    not_generated = "not_generated"
    generated = "generated"
    failed = "failed"


class ExplanationSource(str, Enum):
    none = "none"
    structured = "structured"
    llm = "llm"


class DriverEffect(str, Enum):
    increases_probability = "increases_probability"
    decreases_probability = "decreases_probability"


class ExperimentArm(str, Enum):
    control = "control"
    structured_explanation = "structured_explanation"
    llm_explanation = "llm_explanation"


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


class SimulationInputOverridesPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    primary_user_age_years: int | None = Field(default=None, ge=18, le=100)
    num_children_under_18: int | None = Field(default=None, ge=0, le=20)
    annual_household_income_usd: float | None = Field(default=None, ge=0)
    total_household_debt_usd: float | None = Field(default=None, ge=0)
    monthly_consumer_debt_payments_usd: float | None = Field(default=None, ge=0)
    liquid_assets_usd: float | None = Field(default=None, ge=0)
    credit_card_revolving_balance_usd: float | None = Field(default=None, ge=0)
    monthly_grocery_spend_usd: float | None = Field(default=None, ge=0)
    monthly_dining_spend_usd: float | None = Field(default=None, ge=0)


class SimulateAssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    input: AssessmentInputPayload | None = None
    input_overrides: SimulationInputOverridesPayload | None = None

    @model_validator(mode="after")
    def ensure_simulation_payload_present(self) -> "SimulateAssessmentRequest":
        if self.input is None and self.input_overrides is None:
            raise ValueError("Either input or input_overrides must be provided")
        if (
            self.input_overrides is not None
            and not self.input_overrides.model_dump(exclude_none=True)
        ):
            raise ValueError("input_overrides must include at least one field")
        return self


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


class ExplanationFactorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature_key: str
    title: str
    summary: str
    effect: DriverEffect
    source: ExplanationSource


class RecommendationScenarioResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature_key: str
    title: str
    suggested_change: str
    summary: str
    current_probability: float = Field(..., ge=0, le=1)
    projected_probability: float = Field(..., ge=0, le=1)
    absolute_improvement: float = Field(..., ge=0)
    source: ExplanationSource


class ExplanationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ExplanationStatus = ExplanationStatus.not_generated
    source: ExplanationSource = ExplanationSource.none
    message: str
    prompt_version: str | None = None
    llm_model_name: str | None = None
    factor_explanations: list[ExplanationFactorResponse] = Field(default_factory=list)
    recommendation_scenarios: list[RecommendationScenarioResponse] = Field(default_factory=list)


class ExperimentAssignmentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    experiment_name: str = Field(..., min_length=1)
    experiment_version: str = Field(..., min_length=1)
    arm: ExperimentArm
    assigned_at: datetime


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assessment_id: str
    status: AssessmentStatus
    created_at: datetime
    submission_source: SubmissionSource
    prediction: PredictionResponse
    experiment: ExperimentAssignmentResponse
    drivers: list[DriverResponse]
    explanation: ExplanationResponse


class SimulatedAssessmentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assessment_id: str
    base_probability: float = Field(..., ge=0, le=1)
    simulated_prediction: PredictionResponse
    probability_delta: float
    input: AssessmentInputPayload
    changed_fields: list[str]
    drivers: list[DriverResponse]


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"] = "ok"
    artifact_path: str
    artifact_version: str
    prediction_model_name: str
    shap_model_name: str
    store_backend: str
    auth_mode: str
    experiment_name: str
    experiment_version: str
    llm_enabled: bool
    llm_model_name: str | None = None
    llm_prompt_version: str | None = None


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


class SurveySubmissionContextPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    results_viewed_at: datetime | None = None
    survey_started_at: datetime | None = None
    submitted_at: datetime | None = None
    time_on_results_ms: int | None = Field(default=None, ge=0)
    time_on_survey_ms: int | None = Field(default=None, ge=0)


class CreateSurveyResponseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    survey_version: str = Field(..., min_length=1)
    answers: dict[str, Any]
    context: SurveySubmissionContextPayload | None = None

    @field_validator("answers")
    @classmethod
    def ensure_answers_present(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not value:
            raise ValueError("answers must include at least one survey response")
        return value


class SurveyResponseReceipt(BaseModel):
    model_config = ConfigDict(extra="forbid")

    survey_response_id: str
    assessment_id: str
    survey_version: str
    experiment_name: str
    experiment_version: str
    experiment_arm: ExperimentArm
    submitted_at: datetime
