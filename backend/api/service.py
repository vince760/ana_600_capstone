"""Assessment API service layer."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from pathlib import Path
import secrets
from uuid import uuid4

from backend.inference import AssessmentInput, ExpenshiloPredictor, ValidationError, load_artifact

from .auth import RequestActor
from .explanations import ExplanationService
from .models import (
    AssessmentResponse,
    AssessmentStatus,
    AssessmentInputPayload,
    CreateSurveyResponseRequest,
    CreateAssessmentRequest,
    DriverResponse,
    ExperimentArm,
    ExperimentAssignmentResponse,
    HealthResponse,
    PredictionResponse,
    SimulateAssessmentRequest,
    SimulatedAssessmentResponse,
    SurveyResponseReceipt,
)
from .store import (
    AssessmentStore,
    DuplicateSurveyResponseError,
    InMemoryAssessmentStore,
    PersistenceError,
    PersistedAssessmentRecord,
    PersistedLlmExplanationRecord,
    PersistedSurveyResponseRecord,
)


DEFAULT_ARTIFACT_PATH = (
    Path(__file__).resolve().parents[1] / "artifacts" / "expenshilo_artifact.pkl"
)
DEFAULT_EXPERIMENT_NAME = "assessment_explanation"
DEFAULT_EXPERIMENT_VERSION = "v1"
LOGGER = logging.getLogger(__name__)


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
        explanation_service: ExplanationService | None = None,
    ) -> None:
        self.predictor = predictor
        self.artifact_path = artifact_path
        self.store = store or InMemoryAssessmentStore()
        self.auth_mode = auth_mode
        self.experiment_assigner = experiment_assigner or ExperimentAssigner()
        self.explanation_service = explanation_service or ExplanationService()

    @classmethod
    def from_artifact_path(
        cls,
        artifact_path: Path = DEFAULT_ARTIFACT_PATH,
        *,
        store: AssessmentStore | None = None,
        auth_mode: str = "disabled",
        experiment_assigner: ExperimentAssigner | None = None,
        explanation_service: ExplanationService | None = None,
    ) -> "AssessmentService":
        artifact = load_artifact(artifact_path)
        predictor = ExpenshiloPredictor(artifact)
        return cls(
            predictor=predictor,
            artifact_path=artifact_path,
            store=store,
            auth_mode=auth_mode,
            experiment_assigner=experiment_assigner,
            explanation_service=explanation_service,
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
            llm_enabled=self.explanation_service.llm_enabled,
            llm_model_name=self.explanation_service.llm_model_name,
            llm_prompt_version=self.explanation_service.llm_prompt_version,
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
        driver_responses = self._build_driver_responses(prediction_result)

        explanation_outcome = self.explanation_service.build_for_arm(
            assessment_id=assessment_id,
            assessment_input=assessment_input,
            probability=prediction_result.probability,
            experiment_arm=experiment.arm,
            drivers=driver_responses,
            predict_probability=self.predictor.predict_probability,
        )

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
            drivers=driver_responses,
            explanation=explanation_outcome.response,
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
        saved_response = self.store.save_assessment(record)

        if explanation_outcome.llm_record is not None:
            llm_record = PersistedLlmExplanationRecord(
                explanation_id=str(uuid4()),
                assessment_id=assessment_id,
                user_id=actor.user_id,
                prompt_version=explanation_outcome.llm_record.prompt_version,
                llm_model_name=explanation_outcome.llm_record.llm_model_name,
                status=explanation_outcome.llm_record.status,
                request_payload=explanation_outcome.llm_record.request_payload,
                response_text=explanation_outcome.llm_record.response_text,
                response_metadata=explanation_outcome.llm_record.response_metadata,
                created_at=explanation_outcome.llm_record.created_at.isoformat().replace("+00:00", "Z"),
            )
            try:
                self.store.save_llm_explanation(llm_record)
            except PersistenceError:
                LOGGER.exception(
                    "Failed to persist LLM explanation log for assessment %s",
                    assessment_id,
                )

        return saved_response

    def _build_driver_responses(self, prediction_result) -> list[DriverResponse]:
        return [
            DriverResponse(
                feature_key=driver.feature_key,
                display_name=driver.display_name,
                normalized_value=driver.normalized_value,
                shap_value=driver.shap_value,
                effect=driver.effect,
                plain_description=driver.plain_description,
            )
            for driver in prediction_result.drivers
        ]

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

    def simulate_assessment(
        self,
        assessment_id: str,
        request: SimulateAssessmentRequest,
        actor: RequestActor,
    ) -> SimulatedAssessmentResponse | None:
        assessment_record = self.store.get_assessment_record(assessment_id)
        if assessment_record is None:
            return None
        if assessment_record.user_id is not None and actor.user_id != assessment_record.user_id:
            return None

        base_input = dict(assessment_record.raw_input_snapshot)
        if request.input is not None:
            simulated_input_payload = request.input.model_dump()
        else:
            simulated_input_payload = {
                **base_input,
                **request.input_overrides.model_dump(exclude_none=True),
            }

        try:
            simulated_input = AssessmentInput.from_mapping(simulated_input_payload)
        except ValidationError as exc:
            raise ValueError(str(exc)) from exc

        simulated_result = self.predictor.predict(simulated_input, top_k=5)
        base_probability = assessment_record.response.prediction.probability
        changed_fields = [
            field_name
            for field_name, value in simulated_input.to_dict().items()
            if base_input.get(field_name) != value
        ]

        return SimulatedAssessmentResponse(
            assessment_id=assessment_id,
            base_probability=base_probability,
            simulated_prediction=PredictionResponse(
                probability=simulated_result.probability,
                model_version=simulated_result.model_version,
                feature_version=simulated_result.feature_version,
                prediction_model_name=simulated_result.prediction_model_name,
                shap_model_name=simulated_result.shap_model_name,
            ),
            probability_delta=simulated_result.probability - base_probability,
            input=AssessmentInputPayload.model_validate(simulated_input.to_dict()),
            changed_fields=changed_fields,
            drivers=self._build_driver_responses(simulated_result),
        )

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
