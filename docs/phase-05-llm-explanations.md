# Phase 5: Claude Explanations

Phase 5 adds deterministic and Claude-backed explanation generation to the
assessment workflow.

## What changed

- `control` assessments still return no explanation text
- `structured_explanation` assessments now return a deterministic plain-language
  summary built from the probability and top drivers
- `llm_explanation` assessments now call Claude through the Anthropic Messages
  API
- LLM attempts are saved to `llm_explanations`
- assessment responses now include richer explanation metadata:
  - `status`
  - `source`
  - `message`
  - `prompt_version`
  - `llm_model_name`
  - `factor_explanations`
  - `recommendation_scenarios`

## Anthropic configuration

Set these in backend `.env` when you want real Claude generation:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_API_URL`
- `ANTHROPIC_API_VERSION`
- `ANTHROPIC_TIMEOUT_SECONDS`
- `FINSIGHT_LLM_PROMPT_VERSION`
- `FINSIGHT_LLM_MAX_TOKENS`

Default model:

- `claude-opus-4-7`

This is configurable because the Anthropic API expects an official model id,
not a marketing label.

Note:

- the backend intentionally does not send `temperature` for current Claude Opus
  models because Anthropic rejects that field for these model ids
- the default max token budget is intentionally high enough to avoid truncated
  participant-facing explanations

## Explanation style

Participant-facing explanation text should make the SCF reference population
clear. The summary should explain that the estimate reflects similarity to
Survey of Consumer Finances households that reported spending more than their
income, not a certainty that the participant will experience financial strain.

Factor cards use short, plain-language summaries and remove duplicate signals
where possible. For example, if both total debt and debt-to-income ratio appear
in the top drivers, the card layer keeps the clearest version rather than
showing both.

Recommendation scenarios are model sensitivity checks. They re-score the saved
model after changing one input while holding all other inputs constant. They are
not financial advice.

## Failure behavior

If Claude is unavailable or not configured:

- the assessment is still created
- prediction and drivers still return
- `explanation.status` becomes `failed`
- an LLM attempt record is still written when possible

## Supabase schema update

Re-run:

- `backend/supabase/phase_04_schema.sql`

Phase 5 adds assessment columns for:

- `explanation_source`
- `explanation_prompt_version`
- `explanation_llm_model_name`

## Health endpoint

`GET /health` now reports:

- `llm_enabled`
- `llm_model_name`
- `llm_prompt_version`
