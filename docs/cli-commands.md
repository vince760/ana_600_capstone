# CLI Commands

Simple command reference for the backend workflow.

Run all commands from the repo root of your local clone:

- `ana_600_capstone/`

## Install backend dependencies

```shell
python -m pip install -r backend/requirements.txt
```

## Export the model artifact

This trains the current expenshilo pipeline and writes the saved artifact.

```shell
python backend/train_expenshilo_artifact.py
```

Outputs:

- `backend/artifacts/expenshilo_artifact.pkl`
- `backend/artifacts/expenshilo_artifact.summary.json`

## Run the research pipeline directly

This runs the full analysis script and writes charts and summary files to
`backend/outputs`.

```shell
cd backend
python scf_spending_pipeline.py
```

## Run tests

Run all current backend tests:

```shell
python -m unittest backend.tests.test_inference_features backend.tests.test_api_app -v
```

Run only inference tests:

```shell
python -m unittest backend.tests.test_inference_features -v
```

Run only API tests:

```shell
python -m unittest backend.tests.test_api_app -v
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

## Open API docs

Once the API is running:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/openapi.json`

## Main API endpoints

PowerShell examples:

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

Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:8000/v1/assessments `
  -ContentType "application/json" `
  -Body ($body | ConvertTo-Json -Depth 5)
```

Fetch an assessment by id:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/v1/assessments/<assessment_id>
```

`curl` examples:

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

Fetch an assessment by id:

```bash
curl http://127.0.0.1:8000/v1/assessments/<assessment_id>
```

## Use a custom artifact path

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

## Quick notes

- The current Phase 3 API stores assessments in memory only.
- Restarting the API clears previous assessment ids.
- If the API fails because the artifact is missing, run:

```shell
python backend/train_expenshilo_artifact.py
```
