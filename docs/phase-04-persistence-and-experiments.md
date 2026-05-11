# Phase 4: Persistence and Experiments

Phase 4 connects the assessment API to Supabase so the research project can
track inputs, model outputs, experiment assignment, explanations, and survey
responses for later analysis.

## What Changed

- Assessments can be stored in Supabase instead of memory.
- Each assessment is assigned to an experiment arm.
- Survey responses are linked back to the assessment and experiment arm.
- Backend auth can verify the frontend user's Supabase bearer token.
- Row-level security stays enabled while the backend uses the service-role key
  for server-side writes.

## Supabase Tables

The schema lives at:

```text
backend/supabase/phase_04_schema.sql
```

It creates:

- `assessments`: saved onboarding input, engineered features, prediction, SHAP
  drivers, experiment assignment, explanation payload, and full API response
- `survey_responses`: one survey response per assessment
- `llm_explanations`: LLM prompt metadata, status, request payload, and response
  text for explanation-generation auditing

## Apply the Schema

Recommended simple path:

1. Open the Supabase project dashboard.
2. Go to SQL Editor.
3. Paste `backend/supabase/phase_04_schema.sql`.
4. Run the script.

The script is idempotent for the current schema, so it can be re-run after Phase
5 additions.

The FastAPI backend does not require `DATABASE_URL`; it writes through the
Supabase HTTP API using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Backend Env

For Supabase-backed persistence:

```env
FINSIGHT_STORE_BACKEND=supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

For backend auth:

```env
FINSIGHT_AUTH_MODE=supabase
SUPABASE_ANON_KEY=your-supabase-anon-key
```

Local development can still disable auth:

```env
FINSIGHT_AUTH_MODE=disabled
```

Use `disabled` only for local testing. Deployed environments should use
`supabase`.

## Experiment Arms

Current default arms:

- `control`
- `structured_explanation`
- `llm_explanation`

Configure them with:

```env
FINSIGHT_EXPERIMENT_NAME=assessment_explanation
FINSIGHT_EXPERIMENT_VERSION=v1
FINSIGHT_EXPERIMENT_ARMS=control,structured_explanation,llm_explanation
```

The experiment arm is saved with both the assessment and survey response. This
lets analysis compare comprehension, trust, and behavioral intent across
explanation variants.

## Research Record

Each assessment stores:

- Raw onboarding input
- Research consent metadata
- Optional contextual fields
- Normalized input and engineered model features
- Prediction probability and model metadata
- Ranked SHAP drivers
- Explanation status/message and response payload
- Experiment assignment

Each survey response stores:

- Linked `assessment_id`
- Survey version
- Experiment name, version, and arm
- Answers JSON
- Optional timing/context metadata

## Important Security Notes

- The service-role key is backend-only.
- The frontend should only use the Supabase anon/publishable key.
- The backend verifies the user's Supabase access token when
  `FINSIGHT_AUTH_MODE=supabase`.
- RLS policies allow users to read their own records, while the service role can
  manage server-side inserts and updates.

## Verification

Run the API and check:

```shell
curl http://127.0.0.1:8000/health
```

Expected Supabase-backed local health fields:

```json
{
  "store_backend": "supabase",
  "auth_mode": "supabase"
}
```

Then create an assessment and confirm rows appear in Supabase:

- `assessments`
- `llm_explanations` when the user is assigned to `llm_explanation`
- `survey_responses` after the survey endpoint is submitted
