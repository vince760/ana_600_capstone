# Phase 3: Core Assessment API

Phase 3 exposes the shared expenshilo predictor through FastAPI.

## Endpoints

- `GET /health`
  - reports API readiness and loaded artifact metadata
- `GET /v1/reference/onboarding-schema`
  - returns the current onboarding field contract for the frontend
- `POST /v1/assessments`
  - validates input, loads the saved model artifact, scores `expenshilo_probability`,
    computes top SHAP drivers, and returns a completed assessment response
- `GET /v1/assessments/{assessment_id}`
  - returns a previously created assessment from the Phase 3 in-memory store

## Important Phase 3 scope note

Persistence is still deferred to Phase 4.

For now, assessments are stored in memory only. That means:

- restarting the API clears prior assessments
- `GET /v1/assessments/{assessment_id}` only works for assessments created
  since the current process started

## Explanation behavior

Claude is not integrated in Phase 3 yet.

The API returns:

- deterministic probability output
- SHAP-ranked drivers
- an `explanation.status` of `not_generated`

That keeps the response shape forward-compatible while we defer the LLM step
to a later phase.

## Local run

Install backend dependencies, then run:

```bash
python backend/run_api.py
```

OpenAPI docs will be available at:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/openapi.json`
