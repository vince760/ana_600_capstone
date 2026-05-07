"""Storage backends for assessment persistence and survey tracking."""

from __future__ import annotations

from dataclasses import dataclass
import os
from threading import Lock
from typing import Any, Protocol
from urllib.parse import quote

import httpx

from .models import AssessmentResponse, SurveyResponseReceipt


class PersistenceError(RuntimeError):
    """Raised when persistence cannot be completed."""


class DuplicateSurveyResponseError(PersistenceError):
    """Raised when a survey has already been submitted for an assessment."""


@dataclass(frozen=True)
class PersistedAssessmentRecord:
    response: AssessmentResponse
    user_id: str | None
    raw_input_snapshot: dict[str, Any]
    research_snapshot: dict[str, Any]
    context_snapshot: dict[str, Any] | None
    normalized_input: dict[str, Any]
    engineered_features: dict[str, float]
    model_features: dict[str, float]


@dataclass(frozen=True)
class PersistedSurveyResponseRecord:
    receipt: SurveyResponseReceipt
    user_id: str | None
    answers: dict[str, Any]
    context_snapshot: dict[str, Any] | None


class AssessmentStore(Protocol):
    backend_name: str

    def save_assessment(
        self,
        record: PersistedAssessmentRecord,
    ) -> AssessmentResponse: ...

    def get_assessment_record(
        self,
        assessment_id: str,
    ) -> PersistedAssessmentRecord | None: ...

    def save_survey_response(
        self,
        record: PersistedSurveyResponseRecord,
    ) -> SurveyResponseReceipt: ...


class InMemoryAssessmentStore:
    """Development store used when Supabase is not configured."""

    backend_name = "memory"

    def __init__(self) -> None:
        self._lock = Lock()
        self._assessments: dict[str, PersistedAssessmentRecord] = {}
        self._survey_responses: dict[str, PersistedSurveyResponseRecord] = {}

    def save_assessment(
        self,
        record: PersistedAssessmentRecord,
    ) -> AssessmentResponse:
        with self._lock:
            self._assessments[record.response.assessment_id] = record
        return record.response

    def get_assessment_record(
        self,
        assessment_id: str,
    ) -> PersistedAssessmentRecord | None:
        with self._lock:
            return self._assessments.get(assessment_id)

    def save_survey_response(
        self,
        record: PersistedSurveyResponseRecord,
    ) -> SurveyResponseReceipt:
        with self._lock:
            if record.receipt.assessment_id in self._survey_responses:
                raise DuplicateSurveyResponseError(
                    f"Survey already submitted for assessment '{record.receipt.assessment_id}'."
                )
            self._survey_responses[record.receipt.assessment_id] = record
        return record.receipt


class SupabaseAssessmentStore:
    """Persists assessments and survey responses through Supabase REST APIs."""

    backend_name = "supabase"

    def __init__(
        self,
        *,
        supabase_url: str,
        service_role_key: str,
        schema: str = "public",
        timeout_seconds: float = 10.0,
    ) -> None:
        base_url = f"{supabase_url.rstrip('/')}/rest/v1/"
        self._client = httpx.Client(
            base_url=base_url,
            timeout=timeout_seconds,
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Accept": "application/json",
                "Accept-Profile": schema,
                "Content-Profile": schema,
                "Content-Type": "application/json",
            },
        )

    @classmethod
    def from_env(cls) -> "SupabaseAssessmentStore":
        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not supabase_url or not service_role_key:
            raise ValueError(
                "SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY "
                "must be set when FINSIGHT_STORE_BACKEND=supabase."
            )
        schema = os.getenv("SUPABASE_DB_SCHEMA", "public")
        timeout_seconds = float(os.getenv("SUPABASE_HTTP_TIMEOUT_SECONDS", "10"))
        return cls(
            supabase_url=supabase_url,
            service_role_key=service_role_key,
            schema=schema,
            timeout_seconds=timeout_seconds,
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, str] | None = None,
        json_body: Any | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        headers = extra_headers or {}
        try:
            response = self._client.request(
                method,
                path,
                params=params,
                json=json_body,
                headers=headers,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise PersistenceError(self._extract_error_message(exc.response)) from exc
        except httpx.HTTPError as exc:
            raise PersistenceError(f"Supabase request failed: {exc}") from exc
        return response

    def _extract_error_message(self, response: httpx.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            return response.text or f"Supabase request failed with status {response.status_code}"

        detail = payload.get("message") or payload.get("details") or payload.get("hint")
        if payload.get("code"):
            return f"{payload['code']}: {detail or 'Supabase request failed'}"
        return detail or f"Supabase request failed with status {response.status_code}"

    def _insert(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = self._request(
            "POST",
            table,
            json_body=payload,
            extra_headers={"Prefer": "return=representation"},
        )
        rows = response.json()
        if not rows:
            raise PersistenceError(f"Supabase did not return a row for insert into '{table}'.")
        return rows[0]

    def _select_one(
        self,
        table: str,
        *,
        filters: dict[str, str],
    ) -> dict[str, Any] | None:
        response = self._request("GET", table, params={"select": "*", **filters})
        rows = response.json()
        if not rows:
            return None
        return rows[0]

    def save_assessment(
        self,
        record: PersistedAssessmentRecord,
    ) -> AssessmentResponse:
        response_payload = record.response.model_dump(mode="json")
        payload = {
            "id": record.response.assessment_id,
            "user_id": record.user_id,
            "submission_source": record.response.submission_source.value,
            "status": record.response.status.value,
            "created_at": response_payload["created_at"],
            "experiment_name": record.response.experiment.experiment_name,
            "experiment_version": record.response.experiment.experiment_version,
            "experiment_arm": record.response.experiment.arm.value,
            "prediction_target": record.response.prediction.target,
            "prediction_probability": record.response.prediction.probability,
            "model_version": record.response.prediction.model_version,
            "feature_version": record.response.prediction.feature_version,
            "prediction_model_name": record.response.prediction.prediction_model_name,
            "shap_model_name": record.response.prediction.shap_model_name,
            "raw_input_snapshot": record.raw_input_snapshot,
            "research_snapshot": record.research_snapshot,
            "context_snapshot": record.context_snapshot,
            "normalized_input": record.normalized_input,
            "engineered_features": record.engineered_features,
            "model_features": record.model_features,
            "drivers": [driver.model_dump(mode="json") for driver in record.response.drivers],
            "explanation_status": record.response.explanation.status.value,
            "explanation_message": record.response.explanation.message,
            "response_payload": response_payload,
        }
        self._insert("assessments", payload)
        return record.response

    def get_assessment_record(
        self,
        assessment_id: str,
    ) -> PersistedAssessmentRecord | None:
        row = self._select_one(
            "assessments",
            filters={"id": f"eq.{quote(assessment_id, safe='')}"},
        )
        if row is None:
            return None

        response_payload = row.get("response_payload")
        if not response_payload:
            raise PersistenceError(
                f"Assessment '{assessment_id}' is missing response_payload in Supabase."
            )

        return PersistedAssessmentRecord(
            response=AssessmentResponse.model_validate(response_payload),
            user_id=row.get("user_id"),
            raw_input_snapshot=row.get("raw_input_snapshot") or {},
            research_snapshot=row.get("research_snapshot") or {},
            context_snapshot=row.get("context_snapshot"),
            normalized_input=row.get("normalized_input") or {},
            engineered_features=row.get("engineered_features") or {},
            model_features=row.get("model_features") or {},
        )

    def save_survey_response(
        self,
        record: PersistedSurveyResponseRecord,
    ) -> SurveyResponseReceipt:
        receipt_payload = record.receipt.model_dump(mode="json")
        payload = {
            "id": record.receipt.survey_response_id,
            "assessment_id": record.receipt.assessment_id,
            "user_id": record.user_id,
            "survey_version": record.receipt.survey_version,
            "experiment_name": record.receipt.experiment_name,
            "experiment_version": record.receipt.experiment_version,
            "experiment_arm": record.receipt.experiment_arm.value,
            "submitted_at": receipt_payload["submitted_at"],
            "answers": record.answers,
            "context_snapshot": record.context_snapshot,
        }

        try:
            self._insert("survey_responses", payload)
        except PersistenceError as exc:
            message = str(exc).lower()
            if "23505" in message or "duplicate key" in message or "unique" in message:
                raise DuplicateSurveyResponseError(
                    f"Survey already submitted for assessment '{record.receipt.assessment_id}'."
                ) from exc
            raise

        return record.receipt
