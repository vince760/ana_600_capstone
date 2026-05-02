"""Integration tests for the Phase 3 assessment API."""

from __future__ import annotations

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


class AssessmentApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_endpoint(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("artifact_version", payload)

    def test_reference_schema_endpoint(self) -> None:
        response = self.client.get("/v1/reference/onboarding-schema")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["schema_version"], "assessment-input-v1")
        self.assertGreaterEqual(len(payload["fields"]), 10)

    def test_create_and_fetch_assessment(self) -> None:
        create_response = self.client.post("/v1/assessments", json=SAMPLE_REQUEST)

        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()
        self.assertEqual(created["status"], "complete")
        self.assertGreater(len(created["drivers"]), 0)
        self.assertEqual(created["explanation"]["status"], "not_generated")

        fetch_response = self.client.get(f"/v1/assessments/{created['assessment_id']}")
        self.assertEqual(fetch_response.status_code, 200)
        fetched = fetch_response.json()
        self.assertEqual(fetched["assessment_id"], created["assessment_id"])


if __name__ == "__main__":
    unittest.main()
