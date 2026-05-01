# Frontend API Handoff

Use this doc for the current backend.

## Base URL

- `http://127.0.0.1:8000`

## API Docs

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## Current Notes

- No auth is implemented yet.
- Assessment storage is in memory only for Phase 3.
- Restarting the API clears previously created assessments.
- Claude explanations are not integrated yet.

## Endpoints

- `GET /health`
- `GET /v1/reference/onboarding-schema`
- `POST /v1/assessments`
- `GET /v1/assessments/{assessment_id}`

## Create Assessment

`POST /v1/assessments`

### Request body

```json
{
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
    "monthly_dining_spend_usd": 280
  },
  "research": {
    "research_consent_accepted": true,
    "research_consent_version": "consent_v1",
    "flow_version": "onboarding_v1"
  },
  "context": {
    "employment_status": "full_time",
    "housing_status": "rent",
    "marital_status": "single",
    "education_level": "bachelors",
    "free_text_notes": "Optional"
  }
}
```

### Response shape

```json
{
  "assessment_id": "uuid",
  "status": "complete",
  "created_at": "2026-04-30T22:00:00Z",
  "submission_source": "onboarding",
  "prediction": {
    "target": "expenshilo_probability",
    "probability": 0.67,
    "model_version": "expenshilo_v1",
    "feature_version": "assessment-input-v1",
    "prediction_model_name": "XGBoost",
    "shap_model_name": "XGBoost"
  },
  "drivers": [
    {
      "feature_key": "PAYMENT_TO_INC",
      "display_name": "Debt Payments Relative to Income",
      "normalized_value": 0.11,
      "shap_value": 0.18,
      "effect": "increases_probability",
      "plain_description": "Higher monthly debt payments relative to income increase predicted risk."
    }
  ],
  "explanation": {
    "status": "not_generated",
    "message": "Plain-language explanation generation will be added in a later phase."
  }
}
```

## Frontend Integration Notes

- `research.research_consent_accepted` must be `true` or the request will fail validation.
- `submission_source` is currently always `"onboarding"`.
- Use `assessment_id` from the create response if you need to fetch the saved result again.
- If you want the live field contract for the form, call `GET /v1/reference/onboarding-schema`.
