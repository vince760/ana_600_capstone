"""Tests for expenshilo inference feature normalization."""

import unittest

from backend.inference import (
    AssessmentInput,
    InferencePreprocessingConfig,
    ValidationError,
    build_feature_snapshot,
    build_model_feature_vector,
)


class AssessmentInputTests(unittest.TestCase):
    def test_rejects_negative_currency_value(self) -> None:
        with self.assertRaises(ValidationError):
            AssessmentInput.from_mapping(
                {
                    "primary_user_age_years": 34,
                    "num_children_under_18": 1,
                    "annual_household_income_usd": 72000,
                    "total_household_debt_usd": -1,
                    "monthly_consumer_debt_payments_usd": 650,
                    "liquid_assets_usd": 9000,
                    "credit_card_revolving_balance_usd": 3200,
                    "monthly_grocery_spend_usd": 650,
                    "monthly_dining_spend_usd": 280,
                }
            )


class FeatureEngineeringTests(unittest.TestCase):
    def setUp(self) -> None:
        self.assessment_input = AssessmentInput.from_mapping(
            {
                "primary_user_age_years": 58,
                "num_children_under_18": 2,
                "annual_household_income_usd": 120000,
                "total_household_debt_usd": 30000,
                "monthly_consumer_debt_payments_usd": 900,
                "liquid_assets_usd": 15000,
                "credit_card_revolving_balance_usd": 6000,
                "monthly_grocery_spend_usd": 700,
                "monthly_dining_spend_usd": 300,
            }
        )

    def test_builds_normalized_and_engineered_features(self) -> None:
        snapshot = build_feature_snapshot(self.assessment_input)

        self.assertEqual(snapshot.normalized_input["annual_grocery_spend_usd"], 8400)
        self.assertEqual(snapshot.normalized_input["annual_dining_spend_usd"], 3600)
        self.assertAlmostEqual(snapshot.engineered_features["DTI"], 0.25)
        self.assertAlmostEqual(snapshot.engineered_features["PAYMENT_TO_INC"], 0.09)
        self.assertAlmostEqual(snapshot.engineered_features["CC_TO_INC"], 0.05)
        self.assertAlmostEqual(snapshot.engineered_features["LIQ_TO_INC"], 0.125)
        self.assertEqual(snapshot.engineered_features["IS_PRE_RETIREMENT"], 1.0)
        self.assertEqual(
            snapshot.engineered_features["FOODHOME_X_PRE_RETIREMENT"], 8400.0
        )
        self.assertAlmostEqual(
            snapshot.engineered_features["FOOD_DISCRETIONARY"],
            3600 / 12001,
        )

    def test_build_model_feature_vector_respects_feature_order(self) -> None:
        vector = build_model_feature_vector(self.assessment_input)

        self.assertEqual(len(vector), 11)
        self.assertEqual(vector[0], 120000.0)
        self.assertEqual(vector[1], 30000.0)
        self.assertEqual(vector[2], 900.0)
        self.assertEqual(vector[3], 8400.0)
        self.assertEqual(vector[4], 2.0)

    def test_applies_optional_upper_clip_bounds(self) -> None:
        config = InferencePreprocessingConfig(
            upper_clip_bounds={
                "INCOME": 100000,
                "FOODHOME_X_PRE_RETIREMENT": 5000,
            }
        )

        snapshot = build_feature_snapshot(self.assessment_input, preprocessing=config)

        self.assertEqual(snapshot.model_features["INCOME"], 100000.0)
        self.assertEqual(snapshot.model_features["FOODHOME_X_PRE_RETIREMENT"], 5000.0)


if __name__ == "__main__":
    unittest.main()
