'use client'

import { useState, useTransition } from 'react'

import {
  createAssessment,
  getAssessment,
  submitSurveyResponse,
  type AssessmentPayload,
  type AssessmentRequestPayload,
  type SurveyReceiptPayload,
  type SurveyRequestPayload,
} from '@/lib/api/finsight-backend'
import { useAuth } from '@/contexts/auth-context'
import { formatPercent } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEFAULT_ASSESSMENT_REQUEST: AssessmentRequestPayload = {
  submission_source: 'onboarding',
  input: {
    primary_user_age_years: 34,
    num_children_under_18: 1,
    annual_household_income_usd: 72000,
    total_household_debt_usd: 18500,
    monthly_consumer_debt_payments_usd: 650,
    liquid_assets_usd: 9000,
    credit_card_revolving_balance_usd: 3200,
    monthly_grocery_spend_usd: 650,
    monthly_dining_spend_usd: 280,
  },
  research: {
    research_consent_accepted: true,
    research_consent_version: 'consent_v1',
    flow_version: 'onboarding_v1',
  },
}

const DEFAULT_SURVEY_REQUEST: SurveyRequestPayload = {
  survey_version: 'survey_v1',
  answers: {
    understood_result: 4,
    trusted_result: 3,
    most_confusing_part: 'Debt ratio wording',
  },
  context: {
    time_on_results_ms: 12000,
    time_on_survey_ms: 8000,
  },
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function BackendLabClient() {
  const { user, loading } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [assessmentDraft, setAssessmentDraft] = useState(
    prettyJson(DEFAULT_ASSESSMENT_REQUEST)
  )
  const [surveyDraft, setSurveyDraft] = useState(prettyJson(DEFAULT_SURVEY_REQUEST))
  const [assessmentIdInput, setAssessmentIdInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<AssessmentPayload | null>(null)
  const [surveyReceipt, setSurveyReceipt] = useState<SurveyReceiptPayload | null>(null)

  const activeAssessmentId = assessment?.assessment_id || assessmentIdInput.trim()
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_ASSESSMENT_API_URL || 'http://127.0.0.1:8000'

  function resetStatus() {
    setMessage(null)
    setError(null)
  }

  function runTask(task: () => Promise<void>) {
    startTransition(() => {
      void (async () => {
        resetStatus()
        try {
          await task()
        } catch (taskError) {
          setError(
            taskError instanceof Error ? taskError.message : 'Request failed unexpectedly.'
          )
        }
      })()
    })
  }

  function parseAssessmentDraft(): AssessmentRequestPayload {
    return JSON.parse(assessmentDraft) as AssessmentRequestPayload
  }

  function parseSurveyDraft(): SurveyRequestPayload {
    return JSON.parse(surveyDraft) as SurveyRequestPayload
  }

  function handleCreateAssessment() {
    runTask(async () => {
      const payload = parseAssessmentDraft()
      const created = await createAssessment(payload)
      setAssessment(created)
      setAssessmentIdInput(created.assessment_id)
      setSurveyReceipt(null)
      setMessage(`Assessment created and persisted as ${created.assessment_id}.`)
    })
  }

  function handleFetchAssessment() {
    runTask(async () => {
      const assessmentId = activeAssessmentId
      if (!assessmentId) {
        throw new Error('Enter an assessment id or create an assessment first.')
      }
      const fetched = await getAssessment(assessmentId)
      setAssessment(fetched)
      setAssessmentIdInput(fetched.assessment_id)
      setMessage(`Fetched assessment ${fetched.assessment_id}.`)
    })
  }

  function handleSubmitSurvey() {
    runTask(async () => {
      const assessmentId = activeAssessmentId
      if (!assessmentId) {
        throw new Error('Create or fetch an assessment before submitting the survey.')
      }
      const payload = parseSurveyDraft()
      const receipt = await submitSurveyResponse(assessmentId, payload)
      setSurveyReceipt(receipt)
      setMessage(`Survey submitted for assessment ${receipt.assessment_id}.`)
    })
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-navy">Backend Lab</h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          Hidden proof-of-concept route for testing authenticated assessment and survey
          API calls without touching the main product pages.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg text-navy">Session Status</CardTitle>
          <CardDescription>
            This page uses the active Supabase session token when one is available.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-text-primary md:grid-cols-3">
          <div>
            <p className="font-medium text-navy">Auth loading</p>
            <p>{loading ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="font-medium text-navy">Signed in user</p>
            <p className="break-all">{user?.email || 'No active user detected'}</p>
          </div>
          <div>
            <p className="font-medium text-navy">Backend URL</p>
            <p className="break-all">{backendBaseUrl}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-navy">Assessment Request</CardTitle>
            <CardDescription>
              Edit the sample payload if you want to test different scoring inputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={assessmentDraft}
              onChange={(event) => setAssessmentDraft(event.target.value)}
              className="min-h-[320px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCreateAssessment} disabled={isPending}>
                Create Assessment
              </Button>
              <Button
                variant="outline"
                onClick={() => setAssessmentDraft(prettyJson(DEFAULT_ASSESSMENT_REQUEST))}
                disabled={isPending}
              >
                Reset Payload
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-navy">Survey Request</CardTitle>
            <CardDescription>
              Submit a post-results survey tied to the active assessment id.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assessment-id">Assessment ID</Label>
              <Input
                id="assessment-id"
                value={assessmentIdInput}
                onChange={(event) => setAssessmentIdInput(event.target.value)}
                placeholder="Create or paste an assessment id"
              />
            </div>
            <textarea
              value={surveyDraft}
              onChange={(event) => setSurveyDraft(event.target.value)}
              className="min-h-[240px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleFetchAssessment} disabled={isPending}>
                Fetch Assessment
              </Button>
              <Button onClick={handleSubmitSurvey} disabled={isPending}>
                Submit Survey
              </Button>
              <Button
                variant="outline"
                onClick={() => setSurveyDraft(prettyJson(DEFAULT_SURVEY_REQUEST))}
                disabled={isPending}
              >
                Reset Survey
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {(message || error) && (
        <Card className={error ? 'border-red-200' : 'border-teal/30'}>
          <CardContent className="pt-6">
            {message && <p className="text-sm text-teal">{message}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-navy">Assessment Result</CardTitle>
            <CardDescription>
              Most recent assessment response from the backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assessment ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Probability
                    </p>
                    <p className="text-lg font-semibold text-navy">
                      {formatPercent(assessment.prediction.probability)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Experiment Arm
                    </p>
                    <p className="text-lg font-semibold capitalize text-navy">
                      {assessment.experiment.arm.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Assessment ID
                    </p>
                    <p className="break-all text-sm text-text-primary">
                      {assessment.assessment_id}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-navy">Top drivers</p>
                  <ul className="space-y-2 text-sm text-text-primary">
                    {assessment.drivers.slice(0, 5).map((driver) => (
                      <li
                        key={driver.feature_key}
                        className="rounded-md border border-slate-200 px-3 py-2"
                      >
                        <span className="font-medium text-navy">{driver.display_name}</span>
                        {' - '}
                        {driver.effect === 'increases_probability'
                          ? 'Increases probability'
                          : 'Decreases probability'}
                      </li>
                    ))}
                  </ul>
                </div>
                <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-navy">
                    View full assessment JSON
                  </summary>
                  <pre className="mt-3 overflow-x-auto text-xs text-slate-700">
                    {prettyJson(assessment)}
                  </pre>
                </details>
              </>
            ) : (
              <p className="text-sm text-text-secondary">
                No assessment loaded yet. Create one or fetch by id.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-navy">Survey Receipt</CardTitle>
            <CardDescription>
              Most recent survey submission receipt from the backend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {surveyReceipt ? (
              <details className="rounded-md border border-slate-200 bg-slate-50 p-3" open>
                <summary className="cursor-pointer text-sm font-medium text-navy">
                  View survey receipt JSON
                </summary>
                <pre className="mt-3 overflow-x-auto text-xs text-slate-700">
                  {prettyJson(surveyReceipt)}
                </pre>
              </details>
            ) : (
              <p className="text-sm text-text-secondary">
                No survey submitted yet for this session.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
