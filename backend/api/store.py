"""Simple in-memory store for Phase 3 assessment responses."""

from __future__ import annotations

from threading import Lock

from .models import AssessmentResponse


class InMemoryAssessmentStore:
    """Temporary development store until Supabase persistence is added."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._items: dict[str, AssessmentResponse] = {}

    def save(self, assessment: AssessmentResponse) -> AssessmentResponse:
        with self._lock:
            self._items[assessment.assessment_id] = assessment
        return assessment

    def get(self, assessment_id: str) -> AssessmentResponse | None:
        with self._lock:
            return self._items.get(assessment_id)

