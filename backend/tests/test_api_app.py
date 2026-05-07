"""Integration tests for the Phase 3 assessment API."""

from __future__ import annotations

import os
import unittest

from fastapi.testclient import TestClient

from backend.api.main import app


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
    "context": {
        "employment_status": "full_time",
        "housing_status": "rent",
    },
}

SAMPLE_SURVEY_REQUEST = {
    "survey_version": "survey_v1",
    "answers": {
        "understood_result": 4,
        "trusted_result": 3,
        "most_confusing_part": "Debt ratio wording",
    },
    "context": {
        "time_on_results_ms": 12000,
        "time_on_survey_ms": 8000,
    },
}


class AssessmentApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self._original_env = {
            "FINSIGHT_STORE_BACKEND": os.getenv("FINSIGHT_STORE_BACKEND"),
            "FINSIGHT_AUTH_MODE": os.getenv("FINSIGHT_AUTH_MODE"),
            "FINSIGHT_EXPERIMENT_ARMS": os.getenv("FINSIGHT_EXPERIMENT_ARMS"),
        }
        os.environ["FINSIGHT_STORE_BACKEND"] = "memory"
        os.environ["FINSIGHT_AUTH_MODE"] = "disabled"
        os.environ["FINSIGHT_EXPERIMENT_ARMS"] = "control"
        for state_key in ("assessment_service", "request_actor_resolver"):
            if hasattr(app.state, state_key):
                delattr(app.state, state_key)
        self.client = TestClient(app)

    def tearDown(self) -> None:
        for key, value in self._original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        for state_key in ("assessment_service", "request_actor_resolver"):
            if hasattr(app.state, state_key):
                delattr(app.state, state_key)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("artifact_version", payload)
        self.assertIn("store_backend", payload)
        self.assertIn("auth_mode", payload)
        self.assertIn("experiment_name", payload)

    def test_reference_schema_endpoint(self) -> None:
        response = self.client.get("/v1/reference/onboarding-schema")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["schema_version"], "assessment-input-v1")
        self.assertGreaterEqual(len(payload["fields"]), 10)

    def test_cors_preflight_for_assessment_endpoint(self) -> None:
        response = self.client.options(
            "/v1/assessments",
            headers={
                "Origin": "http://localhost:3001",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "http://localhost:3001",
        )
        self.assertIn(
            "POST",
            response.headers.get("access-control-allow-methods", ""),
        )

    def test_create_and_fetch_assessment(self) -> None:
        create_response = self.client.post("/v1/assessments", json=SAMPLE_REQUEST)

        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()
        self.assertEqual(created["status"], "complete")
        self.assertGreater(len(created["drivers"]), 0)
        self.assertEqual(created["experiment"]["arm"], "control")
        self.assertEqual(created["explanation"]["status"], "not_generated")

        fetch_response = self.client.get(f"/v1/assessments/{created['assessment_id']}")
        self.assertEqual(fetch_response.status_code, 200)
        fetched = fetch_response.json()
        self.assertEqual(fetched["assessment_id"], created["assessment_id"])

    def test_submit_survey_response(self) -> None:
        create_response = self.client.post("/v1/assessments", json=SAMPLE_REQUEST)
        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()

        survey_response = self.client.post(
            f"/v1/assessments/{created['assessment_id']}/survey-responses",
            json=SAMPLE_SURVEY_REQUEST,
        )
        self.assertEqual(survey_response.status_code, 201)
        receipt = survey_response.json()
        self.assertEqual(receipt["assessment_id"], created["assessment_id"])
        self.assertEqual(receipt["survey_version"], "survey_v1")
        self.assertEqual(receipt["experiment_arm"], created["experiment"]["arm"])

    def test_duplicate_survey_response_returns_conflict(self) -> None:
        create_response = self.client.post("/v1/assessments", json=SAMPLE_REQUEST)
        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()

        first = self.client.post(
            f"/v1/assessments/{created['assessment_id']}/survey-responses",
            json=SAMPLE_SURVEY_REQUEST,
        )
        self.assertEqual(first.status_code, 201)

        second = self.client.post(
            f"/v1/assessments/{created['assessment_id']}/survey-responses",
            json=SAMPLE_SURVEY_REQUEST,
        )
        self.assertEqual(second.status_code, 409)


if __name__ == "__main__":
    unittest.main()
