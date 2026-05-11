# Backend Deployment: Heroku

Use this guide when deploying the FastAPI assessment backend separately from the
Next.js frontend. The expected production split is:

- Frontend: Vercel
- Backend API: Heroku
- Research persistence and auth: Supabase
- LLM explanations: Anthropic Claude

## Recommended Setup

Deploy the backend as its own Heroku app, for example:

- `finsight-assessment-api`

Use Supabase for all durable data. Heroku app filesystems are not durable, so
do not rely on Heroku for research outputs, uploaded data, or logs that must be
analyzed later.

For pilot/research testing, avoid sleeping dynos if participants need a smooth
experience. A small always-on dyno is usually a better fit than a sleeping free
or eco-style process.

## Required Backend Files

Before the first Heroku deploy, confirm these repo-readiness files exist:

- root `Procfile`
- root `requirements.txt`
- root `.python-version`
- `backend/artifacts/expenshilo_artifact.pkl`
- `backend/artifacts/expenshilo_artifact.summary.json`

Current root `Procfile`:

```Procfile
web: gunicorn backend.api.main:app -k uvicorn_worker.UvicornWorker --bind 0.0.0.0:$PORT --workers 1 --timeout 120
```

Current root `requirements.txt`:

```text
-r backend/requirements.txt
```

Current `.python-version`:

```text
3.12
```

Python 3.12 is intentionally pinned for deployment stability with the ML
dependency stack. Heroku supports newer Python versions too, but relying on the
platform default can change build behavior later.

The model artifact must be present at deploy time:

```shell
python backend/train_expenshilo_artifact.py
```

Expected artifact path:

```text
backend/artifacts/expenshilo_artifact.pkl
```

For the pilot, the exported `.pkl` and summary JSON are intentionally allowed
through `.gitignore` so Heroku receives the same artifact we tested locally.

## Create the Heroku App

Run from the repo root:

```shell
heroku login
heroku create finsight-assessment-api
heroku buildpacks:set heroku/python --app finsight-assessment-api
```

If the app already exists, attach the remote instead:

```shell
heroku git:remote --app finsight-assessment-api
```

## Configure Environment Variables

Set backend-only values on Heroku. Do not put service-role keys in Vercel or in
client-side frontend env vars.

```shell
heroku config:set "EXPENSHILO_ARTIFACT_PATH=backend/artifacts/expenshilo_artifact.pkl" --app finsight-assessment-api
heroku config:set "FINSIGHT_STORE_BACKEND=supabase" --app finsight-assessment-api
heroku config:set "FINSIGHT_AUTH_MODE=supabase" --app finsight-assessment-api
heroku config:set "SUPABASE_URL=https://your-project-id.supabase.co" --app finsight-assessment-api
heroku config:set "SUPABASE_ANON_KEY=your-supabase-anon-key" --app finsight-assessment-api
heroku config:set "SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key" --app finsight-assessment-api
heroku config:set "ANTHROPIC_API_KEY=your-anthropic-api-key" --app finsight-assessment-api
heroku config:set "ANTHROPIC_MODEL=claude-opus-4-7" --app finsight-assessment-api
heroku config:set "FINSIGHT_LLM_MAX_TOKENS=360" --app finsight-assessment-api
heroku config:set "FINSIGHT_EXPERIMENT_ARMS=control,structured_explanation,llm_explanation" --app finsight-assessment-api
```

Configure CORS with the deployed Vercel origin. Do not include a trailing slash.

```shell
heroku config:set "FINSIGHT_CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000,http://127.0.0.1:3000" --app finsight-assessment-api
```

## Deploy

Manual deploy from the current branch:

```shell
git push heroku HEAD:main
```

Start one web dyno:

```shell
heroku ps:scale web=1 --app finsight-assessment-api
```

Watch startup logs:

```shell
heroku logs --tail --app finsight-assessment-api
```

## GitHub Actions CI/CD

The workflow lives at:

```text
.github/workflows/backend-ci-cd.yml
```

It runs on pull requests and pushes to `main` when backend/API-contract files
change. The deploy job only runs after tests pass on a push to `main`.

Jobs:

- Backend tests with Python from `.python-version`
- Frontend typecheck for the API client/contract
- Heroku deploy by pushing the tested commit to Heroku Git
- Health check against `/health`

Add these GitHub repository secrets:

- `HEROKU_API_KEY`: Heroku account API key
- `HEROKU_APP_NAME`: Heroku app name only, for example `finsight-assessment-api`

After those secrets exist, merging to `main` will deploy automatically.

You can also trigger the workflow manually from GitHub Actions using
`workflow_dispatch`.

## Verify the API

Health check:

```shell
curl https://finsight-assessment-api.herokuapp.com/health
```

OpenAPI docs:

```text
https://finsight-assessment-api.herokuapp.com/docs
```

The health response should show:

- `store_backend: "supabase"`
- `auth_mode: "supabase"`
- `llm_enabled: true` when Anthropic is configured

## Point Vercel at Heroku

In Vercel, set:

```env
NEXT_PUBLIC_ASSESSMENT_API_URL=https://finsight-assessment-api.herokuapp.com
```

Redeploy the frontend after changing the env var.

The frontend API client sends the logged-in Supabase access token as:

```http
Authorization: Bearer <supabase-access-token>
```

That is why the backend can safely use the Supabase service-role key for writes
while still enforcing user ownership at the API boundary.

## Deployment Troubleshooting

- If startup fails with a missing artifact error, run the artifact export and
  confirm the artifact path is included in the deployed repo.
- If requests fail with `Authorization header is required`, the frontend is not
  sending a Supabase session token or `FINSIGHT_AUTH_MODE` is set to `supabase`
  during unauthenticated testing.
- If browser requests fail before reaching the endpoint, check
  `FINSIGHT_CORS_ORIGINS` and make sure it exactly matches the Vercel origin.
- If Supabase writes fail with row-level security errors, verify the backend is
  using `SUPABASE_SERVICE_ROLE_KEY`, not the publishable/anon key.
- If Claude explanations fail but predictions work, check `ANTHROPIC_API_KEY`,
  `ANTHROPIC_MODEL`, and the Heroku logs for the Anthropic error response.
