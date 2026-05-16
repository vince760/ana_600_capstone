# Frontend API Handoff

Use this doc for the current FastAPI assessment backend.

## Base URL

Local backend:

```text
http://127.0.0.1:8000
```

Frontend env var:

```env
NEXT_PUBLIC_ASSESSMENT_API_URL=http://127.0.0.1:8000
```

For production, set that Vercel env var to the deployed backend origin, for
example:

```env
NEXT_PUBLIC_ASSESSMENT_API_URL=https://finsight-assessment-api.herokuapp.com
```

Do not include a trailing slash, `/v1`, or any endpoint path. The frontend API
client appends endpoint paths like `/v1/assessments`.

If requests show a URL shaped like `https://api.example.com/https://api.example.com//v1/assessments`,
the frontend has either a stale deployment or an incorrectly composed API URL.
Redeploy Vercel after changing `NEXT_PUBLIC_ASSESSMENT_API_URL`.

## API Docs

Local:

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

Production uses the same paths on the deployed backend origin.

## Auth

Local development can run with backend auth disabled.

Production should use:

```env
FINSIGHT_AUTH_MODE=supabase
```

When auth is enabled, every assessment, fetch, simulation, and survey request
must include:

```http
Authorization: Bearer <supabase-access-token>
```

The existing frontend API client in `src/lib/api/finsight-backend.ts` already
gets the current Supabase session and attaches this header when available.

## Endpoints

- `GET /health`
- `GET /v1/reference/onboarding-schema`
- `POST /v1/assessments`
- `GET /v1/assessments/{assessment_id}`
- `POST /v1/assessments/{assessment_id}/simulations`
- `POST /v1/assessments/{assessment_id}/survey-responses`

## Create Assessment

`POST /v1/assessments`

Use this after the user completes onboarding and accepts the research consent.
This creates the research record, runs the model, calculates SHAP drivers,
assigns an experiment arm, and generates the explanation payload for that arm.

### Request Body

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

### Required Input Fields

- `primary_user_age_years`
- `num_children_under_18`
- `annual_household_income_usd`
- `total_household_debt_usd`
- `monthly_consumer_debt_payments_usd`
- `liquid_assets_usd`
- `credit_card_revolving_balance_usd`
- `monthly_grocery_spend_usd`
- `monthly_dining_spend_usd`

All money fields are plain numbers in USD, not formatted strings.

### Response Shape

```json
{
  "assessment_id": "uuid",
  "status": "complete",
  "created_at": "2026-05-07T04:44:22.510876Z",
  "submission_source": "onboarding",
  "prediction": {
    "target": "expenshilo_probability",
    "probability": 0.6,
    "model_version": "expenshilo-artifact-v1",
    "feature_version": "scf-expenshilo-features-v1",
    "prediction_model_name": "XGBoost",
    "shap_model_name": "XGBoost"
  },
  "experiment": {
    "experiment_name": "assessment_explanation",
    "experiment_version": "v1",
    "arm": "llm_explanation",
    "assigned_at": "2026-05-07T04:44:22.510876Z"
  },
  "drivers": [
    {
      "feature_key": "PAYMENT_TO_INC",
      "display_name": "Payment-to-Income Ratio",
      "normalized_value": 0.1083,
      "shap_value": 0.6733,
      "effect": "increases_probability",
      "plain_description": "Annualized consumer-debt payments as a share of annual income."
    }
  ],
  "explanation": {
    "status": "generated",
    "source": "llm",
    "message": "Plain-language explanation text...",
    "prompt_version": "anthropic_explanation_v1",
    "llm_model_name": "claude-opus-4-7",
    "factor_explanations": [
      {
        "feature_key": "PAYMENT_TO_INC",
        "title": "Debt payments take up meaningful income",
        "summary": "Your monthly consumer-debt payments are part of the pattern that raised this estimate.",
        "effect": "increases_probability",
        "source": "structured"
      }
    ],
    "recommendation_scenarios": [
      {
        "feature_key": "CONSPAY",
        "title": "Lower monthly debt payments",
        "suggested_change": "Reduce monthly consumer-debt payments by about $75.",
        "summary": "Holding the other inputs constant, the model estimate would move from 60% to 53%.",
        "current_probability": 0.6,
        "projected_probability": 0.53,
        "absolute_improvement": 0.07,
        "source": "structured"
      }
    ]
  }
}
```

## Explanation Arms

The backend returns one of three experiment arms:

- `control`: prediction and SHAP drivers only; no participant-facing explanation
  text
- `structured_explanation`: deterministic explanation summary, factor cards,
  and recommendation scenarios
- `llm_explanation`: Claude-generated summary plus deterministic factor cards
  and recommendation scenarios

Recommended frontend behavior:

- Always show the probability and top drivers.
- Hide the summary text for `control` when `explanation.status` is
  `not_generated`.
- Render `explanation.factor_explanations` as cards when the array has items.
- Render `explanation.recommendation_scenarios` as optional calculator-style
  "what if" prompts when the array has items.
- Treat recommendation scenarios as model sensitivity checks, not financial
  advice.

## Result-Screen Calculator

`POST /v1/assessments/{assessment_id}/simulations`

Use this when the user adjusts values on the result screen. It re-scores the
saved model, but it does not create a new persisted assessment, does not assign
a new experiment arm, and does not call Claude.

### Partial Overrides

```json
{
  "input_overrides": {
    "monthly_consumer_debt_payments_usd": 450,
    "credit_card_revolving_balance_usd": 1800
  }
}
```

### Full Edited Input

```json
{
  "input": {
    "primary_user_age_years": 34,
    "num_children_under_18": 1,
    "annual_household_income_usd": 72000,
    "total_household_debt_usd": 18500,
    "monthly_consumer_debt_payments_usd": 450,
    "liquid_assets_usd": 9000,
    "credit_card_revolving_balance_usd": 1800,
    "monthly_grocery_spend_usd": 650,
    "monthly_dining_spend_usd": 280
  }
}
```

### Response Shape

```json
{
  "assessment_id": "uuid",
  "base_probability": 0.6,
  "simulated_prediction": {
    "target": "expenshilo_probability",
    "probability": 0.42,
    "model_version": "expenshilo-artifact-v1",
    "feature_version": "scf-expenshilo-features-v1",
    "prediction_model_name": "XGBoost",
    "shap_model_name": "XGBoost"
  },
  "probability_delta": -0.18,
  "input": {
    "primary_user_age_years": 34,
    "num_children_under_18": 1,
    "annual_household_income_usd": 72000,
    "total_household_debt_usd": 18500,
    "monthly_consumer_debt_payments_usd": 450,
    "liquid_assets_usd": 9000,
    "credit_card_revolving_balance_usd": 1800,
    "monthly_grocery_spend_usd": 650,
    "monthly_dining_spend_usd": 280
  },
  "changed_fields": [
    "monthly_consumer_debt_payments_usd",
    "credit_card_revolving_balance_usd"
  ],
  "drivers": []
}
```

## Submit Survey Response

`POST /v1/assessments/{assessment_id}/survey-responses`

Use this after the user completes the post-result survey. The backend stores the
survey with the same experiment arm as the original assessment.

### Request Body

```json
{
  "survey_version": "survey_v1",
  "answers": {
    "understood_result": 4,
    "trusted_result": 3,
    "most_confusing_part": "Debt ratio wording"
  },
  "context": {
    "time_on_results_ms": 12000,
    "time_on_survey_ms": 8000
  }
}
```

### Response Shape

```json
{
  "survey_response_id": "uuid",
  "assessment_id": "uuid",
  "survey_version": "survey_v1",
  "experiment_name": "assessment_explanation",
  "experiment_version": "v1",
  "experiment_arm": "structured_explanation",
  "submitted_at": "2026-05-07T04:49:22.510876Z"
}
```

## Integration Notes

- `research.research_consent_accepted` must be `true`.
- `submission_source` is currently always `onboarding`.
- Use `assessment_id` from the create response for later fetch, simulation, and
  survey calls.
- Call `GET /v1/reference/onboarding-schema` if the frontend needs the live
  field contract.
- In production, make sure the Vercel origin is listed in
  `FINSIGHT_CORS_ORIGINS` on the backend.
- `FINSIGHT_CORS_ORIGINS` should contain the frontend origin, such as
  `https://your-vercel-app.vercel.app`, not the Heroku API origin by itself.
- For Vercel preview URLs, the backend can use
  `FINSIGHT_CORS_ORIGIN_REGEX=^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$|^https://.*\.vercel\.app$`.
- If the API returns `401`, check the Supabase session and `Authorization`
  header.
- If the API returns a CORS browser error, check the backend CORS env var and
  redeploy/restart the backend.
