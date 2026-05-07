"""Assessment API service layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import secrets
from uuid import uuid4

from backend.inference import AssessmentInput, ExpenshiloPredictor, ValidationError, load_artifact

from .auth import RequestActor
from .models import (
    AssessmentResponse,
    AssessmentStatus,
    CreateSurveyResponseRequest,
    CreateAssessmentRequest,
    DriverResponse,
    ExplanationResponse,
    ExplanationStatus,
    ExperimentArm,
    ExperimentAssignmentResponse,
    HealthResponse,
    PredictionResponse,
    SurveyResponseReceipt,
)
from .store import (
    AssessmentStore,
    DuplicateSurveyResponseError,
    InMemoryAssessmentStore,
    PersistedAssessmentRecord,
    PersistedSurveyResponseRecord,
)


DEFAULT_ARTIFACT_PATH = (
    Path(__file__).resolve().parents[1] / "artifacts" / "expenshilo_artifact.pkl"
)
DEFAULT_EXPERIMENT_NAME = "assessment_explanation"
DEFAULT_EXPERIMENT_VERSION = "v1"


@dataclass(frozen=True)
class ExperimentAssigner:
    experiment_name: str = DEFAULT_EXPERIMENT_NAME
    experiment_version: str = DEFAULT_EXPERIMENT_VERSION
    arms: tuple[ExperimentArm, ...] = (
        ExperimentArm.control,
        ExperimentArm.structured_explanation,
        ExperimentArm.llm_explanation,
    )

    def assign(self, assigned_at: datetime) -> ExperimentAssignmentResponse:
        if not self.arms:
            raise ValueError("At least one experiment arm must be configured.")

        return ExperimentAssignmentResponse(
            experiment_name=self.experiment_name,
            experiment_version=self.experiment_version,
            arm=secrets.choice(list(self.arms)),
            assigned_at=assigned_at,
        )


class AssessmentService:
    """Coordinates request validation, scoring, experiment assignment, and storage."""

    def __init__(
        self,
        predictor: ExpenshiloPredictor,
        artifact_path: Path,
        store: AssessmentStore | None = None,
        auth_mode: str = "disabled",
        experiment_assigner: ExperimentAssigner | None = None,
    ) -> None:
        self.predictor = predictor
        self.artifact_path = artifact_path
        self.store = store or InMemoryAssessmentStore()
        self.auth_mode = auth_mode
        self.experiment_assigner = experiment_assigner or ExperimentAssigner()

    @classmethod
    def from_artifact_path(
        cls,
        artifact_path: Path = DEFAULT_ARTIFACT_PATH,
        *,
        store: AssessmentStore | None = None,
        auth_mode: str = "disabled",
        experiment_assigner: ExperimentAssigner | None = None,
    ) -> "AssessmentService":
        artifact = load_artifact(artifact_path)
        predictor = ExpenshiloPredictor(artifact)
        return cls(
            predictor=predictor,
            artifact_path=artifact_path,
            store=store,
            auth_mode=auth_mode,
            experiment_assigner=experiment_assigner,
        )

    def build_health(self) -> HealthResponse:
        artifact = self.predictor.artifact
        return HealthResponse(
            artifact_path=str(self.artifact_path),
            artifact_version=artifact.artifact_version,
            prediction_model_name=artifact.prediction_model_name,
            shap_model_name=artifact.shap_model_name,
            store_backend=self.store.backend_name,
            auth_mode=self.auth_mode,
            experiment_name=self.experiment_assigner.experiment_name,
            experiment_version=self.experiment_assigner.experiment_version,
        )

    def create_assessment(
        self,
        request: CreateAssessmentRequest,
        actor: RequestActor,
    ) -> AssessmentResponse:
        try:
            assessment_input = AssessmentInput.from_mapping(request.input.model_dump())
        except ValidationError as exc:
            raise ValueError(str(exc)) from exc

        prediction_result = self.predictor.predict(assessment_input, top_k=5)
        assessment_id = str(uuid4())
        created_at = datetime.now(timezone.utc)
        experiment = self.experiment_assigner.assign(created_at)
        context_snapshot = request.context.model_dump(exclude_none=True) if request.context else None
        response = AssessmentResponse(
            assessment_id=assessment_id,
            status=AssessmentStatus.complete,
            created_at=created_at,
            submission_source=request.submission_source,
            prediction=PredictionResponse(
                probability=prediction_result.probability,
                model_version=prediction_result.model_version,
                feature_version=prediction_result.feature_version,
                prediction_model_name=prediction_result.prediction_model_name,
                shap_model_name=prediction_result.shap_model_name,
            ),
            experiment=experiment,
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
        record = PersistedAssessmentRecord(
            response=response,
            user_id=actor.user_id,
            raw_input_snapshot=request.input.model_dump(),
            research_snapshot=request.research.model_dump(),
            context_snapshot=context_snapshot,
            normalized_input=prediction_result.snapshot.normalized_input,
            engineered_features=prediction_result.snapshot.engineered_features,
            model_features=prediction_result.snapshot.model_features,
        )
        return self.store.save_assessment(record)

    def get_assessment(
        self,
        assessment_id: str,
        actor: RequestActor,
    ) -> AssessmentResponse | None:
        record = self.store.get_assessment_record(assessment_id)
        if record is None:
            return None
        if record.user_id is not None and actor.user_id != record.user_id:
            return None
        return record.response

    def submit_survey_response(
        self,
        assessment_id: str,
        request: CreateSurveyResponseRequest,
        actor: RequestActor,
    ) -> SurveyResponseReceipt | None:
        assessment_record = self.store.get_assessment_record(assessment_id)
        if assessment_record is None:
            return None
        if assessment_record.user_id is not None and actor.user_id != assessment_record.user_id:
            return None

        submitted_at = request.context.submitted_at if request.context else None
        if submitted_at is None:
            submitted_at = datetime.now(timezone.utc)

        receipt = SurveyResponseReceipt(
            survey_response_id=str(uuid4()),
            assessment_id=assessment_id,
            survey_version=request.survey_version,
            experiment_name=assessment_record.response.experiment.experiment_name,
            experiment_version=assessment_record.response.experiment.experiment_version,
            experiment_arm=assessment_record.response.experiment.arm,
            submitted_at=submitted_at,
        )
        context_snapshot = (
            request.context.model_dump(exclude_none=True) if request.context else None
        )

        survey_record = PersistedSurveyResponseRecord(
            receipt=receipt,
            user_id=actor.user_id,
            answers=request.answers,
            context_snapshot=context_snapshot,
        )
        return self.store.save_survey_response(survey_record)


__all__ = [
    "AssessmentService",
    "DEFAULT_ARTIFACT_PATH",
    "DEFAULT_EXPERIMENT_NAME",
    "DEFAULT_EXPERIMENT_VERSION",
    "DuplicateSurveyResponseError",
    "ExperimentAssigner",
]
