# CLI Commands

Simple command reference for the backend workflow.

Run commands from the repo root of your local clone:

```text
ana_600_capstone/
```

## Environment Setup

Copy `.env.example` to `.env` if you want the Python API to load backend
settings automatically.

The backend auto-loads:

- repo root `.env`
- `backend/.env`

Process environment variables still take precedence.

Optional virtual environment:

```shell
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

## Install Backend Dependencies

```shell
python -m pip install -r backend/requirements.txt
```

## Export the Model Artifact

This trains the current expenshilo pipeline and writes the saved artifact.

```shell
python backend/train_expenshilo_artifact.py
```

Outputs:

- `backend/artifacts/expenshilo_artifact.pkl`
- `backend/artifacts/expenshilo_artifact.summary.json`

## Run the Research Pipeline Directly

This runs the full analysis script and writes charts and summary files to
`backend/outputs`.

```shell
cd backend
python scf_spending_pipeline.py
```

## Run Tests

Run all current backend tests:

```shell
python -m unittest backend.tests.test_inference_features backend.tests.test_api_app backend.tests.test_explanations -v
```

Run only inference tests:

```shell
python -m unittest backend.tests.test_inference_features -v
```

Run only API tests:

```shell
python -m unittest backend.tests.test_api_app -v
```

Run only explanation tests:

```shell
python -m unittest backend.tests.test_explanations -v
```

Run the frontend type check:

```shell
npx tsc --noEmit
```

## Heroku Deployment Helpers

Create or attach the Heroku app:

```shell
heroku login
heroku create finsight-assessment-api
heroku buildpacks:set heroku/python --app finsight-assessment-api
```

If the Heroku app already exists:

```shell
heroku git:remote --app finsight-assessment-api
```

Manual deploy:

```shell
git push heroku HEAD:main
```

Tail logs:

```shell
heroku logs --tail --app finsight-assessment-api
```

## Run the API

Recommended:

```shell
python backend/run_api.py
```

Alternative:

```shell
python -m backend.run_api
```

Direct Uvicorn:

```shell
python -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8000
```

If port `8000` is already in use:

```shell
python -m uvicorn backend.api.main:app --host 127.0.0.1 --port 8001
```

## Open API Docs

Once the API is running:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/openapi.json`

## Local Frontend Test Page

Run the Next.js app:

```shell
npm run dev
```

Open:

```text
http://localhost:3000/backend-lab
```

If the frontend uses a different backend port, set:

```env
NEXT_PUBLIC_ASSESSMENT_API_URL=http://127.0.0.1:8001
```

## API Examples: PowerShell

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Onboarding schema:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/v1/reference/onboarding-schema
```

Create an assessment:

```powershell
$body = @{
  submission_source = "onboarding"
  input = @{
    primary_user_age_years = 34
    num_children_under_18 = 1
    annual_household_income_usd = 72000
    total_household_debt_usd = 18500
    monthly_consumer_debt_payments_usd = 650
    liquid_assets_usd = 9000
    credit_card_revolving_balance_usd = 3200
    monthly_grocery_spend_usd = 650
    monthly_dining_spend_usd = 280
  }
  research = @{
    research_consent_accepted = $true
    research_consent_version = "consent_v1"
    flow_version = "onboarding_v1"
  }
}

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/v1/assessments -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 5)
```

Create an assessment when backend auth is enabled:

```powershell
$headers = @{ Authorization = "Bearer <supabase-access-token>" }
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/v1/assessments -Headers $headers -ContentType "application/json" -Body ($body | ConvertTo-Json -Depth 5)
```

Fetch an assessment:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/v1/assessments/<assessment_id>
```

Simulate result-screen calculator changes:

```powershell
$simulation = @{
  input_overrides = @{
    monthly_consumer_debt_payments_usd = 450
    credit_card_revolving_balance_usd = 1800
  }
}

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/v1/assessments/<assessment_id>/simulations -ContentType "application/json" -Body ($simulation | ConvertTo-Json -Depth 5)
```

Submit a survey response:

```powershell
$survey = @{
  survey_version = "survey_v1"
  answers = @{
    understood_result = 4
    trusted_result = 3
    most_confusing_part = "Debt ratio wording"
  }
  context = @{
    time_on_results_ms = 12000
    time_on_survey_ms = 8000
  }
}

Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/v1/assessments/<assessment_id>/survey-responses -ContentType "application/json" -Body ($survey | ConvertTo-Json -Depth 5)
```

## API Examples: curl

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Onboarding schema:

```bash
curl http://127.0.0.1:8000/v1/reference/onboarding-schema
```

Create an assessment:

```bash
curl -X POST http://127.0.0.1:8000/v1/assessments \
  -H "Content-Type: application/json" \
  -d '{
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
    }
  }'
```

Create an assessment when backend auth is enabled:

```bash
curl -X POST http://127.0.0.1:8000/v1/assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supabase-access-token>" \
  -d '{"submission_source":"onboarding","input":{"primary_user_age_years":34,"num_children_under_18":1,"annual_household_income_usd":72000,"total_household_debt_usd":18500,"monthly_consumer_debt_payments_usd":650,"liquid_assets_usd":9000,"credit_card_revolving_balance_usd":3200,"monthly_grocery_spend_usd":650,"monthly_dining_spend_usd":280},"research":{"research_consent_accepted":true,"research_consent_version":"consent_v1","flow_version":"onboarding_v1"}}'
```

Fetch an assessment:

```bash
curl http://127.0.0.1:8000/v1/assessments/<assessment_id>
```

Simulate result-screen calculator changes:

```bash
curl -X POST http://127.0.0.1:8000/v1/assessments/<assessment_id>/simulations \
  -H "Content-Type: application/json" \
  -d '{"input_overrides":{"monthly_consumer_debt_payments_usd":450,"credit_card_revolving_balance_usd":1800}}'
```

Submit a survey response:

```bash
curl -X POST http://127.0.0.1:8000/v1/assessments/<assessment_id>/survey-responses \
  -H "Content-Type: application/json" \
  -d '{"survey_version":"survey_v1","answers":{"understood_result":4,"trusted_result":3,"most_confusing_part":"Debt ratio wording"},"context":{"time_on_results_ms":12000,"time_on_survey_ms":8000}}'
```

## Use a Custom Artifact Path

PowerShell:

```powershell
$env:EXPENSHILO_ARTIFACT_PATH = (Resolve-Path "backend/artifacts/expenshilo_artifact.pkl")
python backend/run_api.py
```

Bash or zsh:

```bash
export EXPENSHILO_ARTIFACT_PATH="$(pwd)/backend/artifacts/expenshilo_artifact.pkl"
python backend/run_api.py
```

## Quick Notes

- `FINSIGHT_STORE_BACKEND=memory` is useful for local testing but clears data on
  API restart.
- `FINSIGHT_STORE_BACKEND=supabase` writes assessments, explanations, and survey
  responses to Supabase.
- `FINSIGHT_AUTH_MODE=supabase` requires an `Authorization: Bearer <token>`
  header.
- If the API fails because the artifact is missing, run:

```shell
python backend/train_expenshilo_artifact.py
```
