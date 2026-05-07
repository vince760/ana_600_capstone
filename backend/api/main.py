"""FastAPI app for the Phase 3 assessment API."""

from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .auth import AuthenticationError, RequestActor, RequestActorResolver
from .env import load_backend_env
from .models import (
    AssessmentResponse,
    CreateAssessmentRequest,
    CreateSurveyResponseRequest,
    HealthResponse,
    OnboardingSchemaResponse,
    SurveyResponseReceipt,
)
from .reference import build_onboarding_schema
from .service import (
    DEFAULT_ARTIFACT_PATH,
    DEFAULT_EXPERIMENT_NAME,
    DEFAULT_EXPERIMENT_VERSION,
    AssessmentService,
    DuplicateSurveyResponseError,
    ExperimentArm,
    ExperimentAssigner,
)
from .store import AssessmentStore, PersistenceError, SupabaseAssessmentStore


load_backend_env()


def _resolve_artifact_path() -> Path:
    configured = os.getenv("EXPENSHILO_ARTIFACT_PATH")
    if configured:
        return Path(configured)
    return DEFAULT_ARTIFACT_PATH


def _resolve_store() -> AssessmentStore:
    backend = os.getenv("FINSIGHT_STORE_BACKEND", "memory").strip().lower()
    if backend == "memory":
        from .store import InMemoryAssessmentStore

        return InMemoryAssessmentStore()
    if backend == "supabase":
        return SupabaseAssessmentStore.from_env()
    raise ValueError("FINSIGHT_STORE_BACKEND must be either 'memory' or 'supabase'.")


def _resolve_experiment_assigner() -> ExperimentAssigner:
    experiment_name = os.getenv("FINSIGHT_EXPERIMENT_NAME", DEFAULT_EXPERIMENT_NAME)
    experiment_version = os.getenv(
        "FINSIGHT_EXPERIMENT_VERSION",
        DEFAULT_EXPERIMENT_VERSION,
    )
    configured_arms = os.getenv("FINSIGHT_EXPERIMENT_ARMS")
    if not configured_arms:
        return ExperimentAssigner(
            experiment_name=experiment_name,
            experiment_version=experiment_version,
        )

    parsed_arms: list[ExperimentArm] = []
    for raw_value in configured_arms.split(","):
        value = raw_value.strip()
        if not value:
            continue
        parsed_arms.append(ExperimentArm(value))

    if not parsed_arms:
        raise ValueError("FINSIGHT_EXPERIMENT_ARMS must include at least one arm value.")

    return ExperimentAssigner(
        experiment_name=experiment_name,
        experiment_version=experiment_version,
        arms=tuple(parsed_arms),
    )


def _build_assessment_service() -> AssessmentService:
    artifact_path = _resolve_artifact_path()
    store = _resolve_store()
    actor_resolver = RequestActorResolver.from_env()
    experiment_assigner = _resolve_experiment_assigner()
    app.state.request_actor_resolver = actor_resolver
    return AssessmentService.from_artifact_path(
        artifact_path,
        store=store,
        auth_mode=actor_resolver.auth_mode,
        experiment_assigner=experiment_assigner,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.assessment_service = _build_assessment_service()
    yield


def get_assessment_service() -> AssessmentService:
    if not hasattr(app.state, "assessment_service"):
        app.state.assessment_service = _build_assessment_service()
    return app.state.assessment_service


def get_request_actor_resolver() -> RequestActorResolver:
    if not hasattr(app.state, "request_actor_resolver"):
        app.state.request_actor_resolver = RequestActorResolver.from_env()
    return app.state.request_actor_resolver


def resolve_request_actor(
    authorization: Annotated[str | None, Header()] = None,
) -> RequestActor:
    resolver = get_request_actor_resolver()
    try:
        return resolver.resolve(authorization)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


app = FastAPI(
    title="FinSight Assessment API",
    version="0.1.0",
    description=(
    "Assessment service for expenshilo probability scoring and SHAP driver retrieval."
    ),
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    service = get_assessment_service()
    return service.build_health()


@app.get(
    "/v1/reference/onboarding-schema",
    response_model=OnboardingSchemaResponse,
    tags=["reference"],
)
def onboarding_schema() -> OnboardingSchemaResponse:
    return build_onboarding_schema()


@app.post(
    "/v1/assessments",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["assessments"],
)
def create_assessment(
    request: CreateAssessmentRequest,
    actor: Annotated[RequestActor, Depends(resolve_request_actor)],
) -> AssessmentResponse:
    service = get_assessment_service()
    try:
        return service.create_assessment(request, actor)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except PersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@app.get(
    "/v1/assessments/{assessment_id}",
    response_model=AssessmentResponse,
    tags=["assessments"],
)
def get_assessment(
    assessment_id: str,
    actor: Annotated[RequestActor, Depends(resolve_request_actor)],
) -> AssessmentResponse:
    service = get_assessment_service()
    try:
        assessment = service.get_assessment(assessment_id, actor)
    except PersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    if assessment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment '{assessment_id}' was not found.",
        )
    return assessment


@app.post(
    "/v1/assessments/{assessment_id}/survey-responses",
    response_model=SurveyResponseReceipt,
    status_code=status.HTTP_201_CREATED,
    tags=["surveys"],
)
def create_survey_response(
    assessment_id: str,
    request: CreateSurveyResponseRequest,
    actor: Annotated[RequestActor, Depends(resolve_request_actor)],
) -> SurveyResponseReceipt:
    service = get_assessment_service()
    try:
        receipt = service.submit_survey_response(assessment_id, request, actor)
    except DuplicateSurveyResponseError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except PersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    if receipt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment '{assessment_id}' was not found.",
        )
    return receipt
