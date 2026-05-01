"""FastAPI app for the Phase 3 assessment API."""

from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, status

from .models import AssessmentResponse, CreateAssessmentRequest, HealthResponse, OnboardingSchemaResponse
from .reference import build_onboarding_schema
from .service import DEFAULT_ARTIFACT_PATH, AssessmentService


def _resolve_artifact_path() -> Path:
    configured = os.getenv("EXPENSHILO_ARTIFACT_PATH")
    if configured:
        return Path(configured)
    return DEFAULT_ARTIFACT_PATH


@asynccontextmanager
async def lifespan(app: FastAPI):
    artifact_path = _resolve_artifact_path()
    app.state.assessment_service = AssessmentService.from_artifact_path(artifact_path)
    yield


def get_assessment_service() -> AssessmentService:
    if not hasattr(app.state, "assessment_service"):
        artifact_path = _resolve_artifact_path()
        app.state.assessment_service = AssessmentService.from_artifact_path(artifact_path)
    return app.state.assessment_service


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
def create_assessment(request: CreateAssessmentRequest) -> AssessmentResponse:
    service = get_assessment_service()
    try:
        return service.create_assessment(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@app.get(
    "/v1/assessments/{assessment_id}",
    response_model=AssessmentResponse,
    tags=["assessments"],
)
def get_assessment(assessment_id: str) -> AssessmentResponse:
    service = get_assessment_service()
    assessment = service.get_assessment(assessment_id)
    if assessment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment '{assessment_id}' was not found.",
        )
    return assessment
