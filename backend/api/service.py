"""Assessment API service layer."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from backend.inference import AssessmentInput, ExpenshiloPredictor, ValidationError, load_artifact

from .models import (
    AssessmentResponse,
    AssessmentStatus,
    CreateAssessmentRequest,
    DriverResponse,
    ExplanationResponse,
    ExplanationStatus,
    HealthResponse,
    PredictionResponse,
)
from .store import InMemoryAssessmentStore


DEFAULT_ARTIFACT_PATH = (
    Path(__file__).resolve().parents[1] / "artifacts" / "expenshilo_artifact.pkl"
)


class AssessmentService:
    """Coordinates request validation, scoring, and temporary storage."""

    def __init__(
        self,
        predictor: ExpenshiloPredictor,
        artifact_path: Path,
        store: InMemoryAssessmentStore | None = None,
    ) -> None:
        self.predictor = predictor
        self.artifact_path = artifact_path
        self.store = store or InMemoryAssessmentStore()

    @classmethod
    def from_artifact_path(
        cls,
        artifact_path: Path = DEFAULT_ARTIFACT_PATH,
    ) -> "AssessmentService":
        artifact = load_artifact(artifact_path)
        predictor = ExpenshiloPredictor(artifact)
        return cls(predictor=predictor, artifact_path=artifact_path)

    def build_health(self) -> HealthResponse:
        artifact = self.predictor.artifact
        return HealthResponse(
            artifact_path=str(self.artifact_path),
            artifact_version=artifact.artifact_version,
            prediction_model_name=artifact.prediction_model_name,
            shap_model_name=artifact.shap_model_name,
        )

    def create_assessment(self, request: CreateAssessmentRequest) -> AssessmentResponse:
        try:
            assessment_input = AssessmentInput.from_mapping(request.input.model_dump())
        except ValidationError as exc:
            raise ValueError(str(exc)) from exc

        prediction_result = self.predictor.predict(assessment_input, top_k=5)
        assessment_id = str(uuid4())
        response = AssessmentResponse(
            assessment_id=assessment_id,
            status=AssessmentStatus.complete,
            created_at=datetime.now(timezone.utc),
            submission_source=request.submission_source,
            prediction=PredictionResponse(
                probability=prediction_result.probability,
                model_version=prediction_result.model_version,
                feature_version=prediction_result.feature_version,
                prediction_model_name=prediction_result.prediction_model_name,
                shap_model_name=prediction_result.shap_model_name,
            ),
            drivers=[
                DriverResponse(
                    feature_key=driver.feature_key,
                    display_name=driver.display_name,
                    normalized_value=driver.normalized_value,
                    shap_value=driver.shap_value,
                    effect=driver.effect,
                    plain_description=driver.plain_description,
                )
                for driver in prediction_result.drivers
            ],
            explanation=ExplanationResponse(
                status=ExplanationStatus.not_generated,
                message=(
                    "Plain-language explanation generation will be added in a later phase. "
                    "This response currently includes deterministic prediction and SHAP drivers only."
                ),
            ),
        )
        return self.store.save(response)

    def get_assessment(self, assessment_id: str) -> AssessmentResponse | None:
        return self.store.get(assessment_id)

