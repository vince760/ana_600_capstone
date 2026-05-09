"""Tests for structured and Claude-backed explanation behavior."""

from __future__ import annotations

from datetime import datetime, timezone
import unittest

from backend.api.auth import RequestActor
from backend.api.explanations import (
    DEFAULT_LLM_PROMPT_VERSION,
    DEFAULT_STRUCTURED_PROMPT_VERSION,
    ExplanationService,
    LlmGenerationRecord,
)
from backend.api.models import CreateAssessmentRequest, ExperimentArm
from backend.api.service import AssessmentService, DEFAULT_ARTIFACT_PATH, ExperimentAssigner
from backend.api.store import InMemoryAssessmentStore


SAMPLE_REQUEST = {
    "submission_source": "onboarding",
    "input": {
        "primary_user_age_years": 34,
        "num_children_under_18": 1,
        "annual_household_income_usd": 72000,
        "total_household_debt_usd": 18500,
        "monthly_consumer_debt_payments_usd": 650,
        "liquid_assets_usd": 9000,
        "credit_card_revolving_balance_usd": 3200,
        "monthly_grocery_spend_usd": 650,
        "monthly_dining_spend_usd": 280,
    },
    "research": {
        "research_consent_accepted": True,
        "research_consent_version": "consent_v1",
        "flow_version": "onboarding_v1",
    },
}


class FakeAnthropicClient:
    enabled = True
    model_name = "claude-opus-4-7"
    prompt_version = DEFAULT_LLM_PROMPT_VERSION

    def generate(self, _facts) -> LlmGenerationRecord:
        return LlmGenerationRecord(
            prompt_version=self.prompt_version,
            llm_model_name=self.model_name,
            status="generated",
            request_payload={"messages": ["fake"]},
            response_text="This is a generated Claude explanation.",
            response_metadata={"id": "msg_test"},
            created_at=datetime.now(timezone.utc),
        )


class AssessmentExplanationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.actor = RequestActor(user_id=None, auth_mode="disabled")
        self.request = CreateAssessmentRequest.model_validate(SAMPLE_REQUEST)

    def _build_service(
        self,
        *,
        experiment_arm: ExperimentArm,
        explanation_service: ExplanationService,
    ) -> tuple[AssessmentService, InMemoryAssessmentStore]:
        store = InMemoryAssessmentStore()
        service = AssessmentService.from_artifact_path(
            DEFAULT_ARTIFACT_PATH,
            store=store,
            auth_mode="disabled",
            experiment_assigner=ExperimentAssigner(arms=(experiment_arm,)),
            explanation_service=explanation_service,
        )
        return service, store

    def test_structured_explanation_arm_generates_deterministic_message(self) -> None:
        service, _store = self._build_service(
            experiment_arm=ExperimentArm.structured_explanation,
            explanation_service=ExplanationService(),
        )

        response = service.create_assessment(self.request, self.actor)

        self.assertEqual(response.experiment.arm, ExperimentArm.structured_explanation)
        self.assertEqual(response.explanation.status.value, "generated")
        self.assertEqual(response.explanation.source.value, "structured")
        self.assertEqual(response.explanation.prompt_version, DEFAULT_STRUCTURED_PROMPT_VERSION)
        self.assertIn("Survey of Consumer Finances", response.explanation.message)
        self.assertGreaterEqual(len(response.explanation.factor_explanations), 3)
        self.assertGreaterEqual(len(response.explanation.recommendation_scenarios), 1)
        self.assertTrue(
            any(
                scenario.feature_key in {"PAYMENT_TO_INC", "CONSPAY", "FOODHOME"}
                for scenario in response.explanation.recommendation_scenarios
            )
        )

    def test_llm_explanation_arm_generates_and_logs_claude_output(self) -> None:
        service, store = self._build_service(
            experiment_arm=ExperimentArm.llm_explanation,
            explanation_service=ExplanationService(anthropic_client=FakeAnthropicClient()),
        )

        response = service.create_assessment(self.request, self.actor)
        llm_record = store.get_llm_explanation_record(response.assessment_id)

        self.assertEqual(response.experiment.arm, ExperimentArm.llm_explanation)
        self.assertEqual(response.explanation.status.value, "generated")
        self.assertEqual(response.explanation.source.value, "llm")
        self.assertEqual(response.explanation.message, "This is a generated Claude explanation.")
        self.assertGreaterEqual(len(response.explanation.factor_explanations), 3)
        self.assertGreaterEqual(len(response.explanation.recommendation_scenarios), 1)
        self.assertIsNotNone(llm_record)
        self.assertEqual(llm_record.status, "generated")
        self.assertEqual(llm_record.llm_model_name, "claude-opus-4-7")

    def test_llm_explanation_arm_without_api_key_fails_gracefully(self) -> None:
        service, store = self._build_service(
            experiment_arm=ExperimentArm.llm_explanation,
            explanation_service=ExplanationService(),
        )

        response = service.create_assessment(self.request, self.actor)
        llm_record = store.get_llm_explanation_record(response.assessment_id)

        self.assertEqual(response.explanation.status.value, "failed")
        self.assertEqual(response.explanation.source.value, "llm")
        self.assertIn("could not be generated", response.explanation.message)
        self.assertGreaterEqual(len(response.explanation.factor_explanations), 3)
        self.assertGreaterEqual(len(response.explanation.recommendation_scenarios), 1)
        self.assertIsNotNone(llm_record)
        self.assertEqual(llm_record.status, "failed")


if __name__ == "__main__":
    unittest.main()
