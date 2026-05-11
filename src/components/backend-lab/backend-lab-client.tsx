'use client'

import { useState, useTransition } from 'react'

import {
  createAssessment,
  getAssessmentApiBaseUrl,
  getAssessment,
  simulateAssessment,
  submitSurveyResponse,
  type AssessmentPayload,
  type AssessmentRequestPayload,
  type SimulatedAssessmentPayload,
  type SimulateAssessmentRequestPayload,
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

const DEFAULT_SIMULATION_REQUEST: SimulateAssessmentRequestPayload = {
  input_overrides: {
    monthly_consumer_debt_payments_usd: 450,
    credit_card_revolving_balance_usd: 1800,
  },
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function driverAccentClass(effect: 'increases_probability' | 'decreases_probability') {
  return effect === 'increases_probability'
    ? 'border-red-200 bg-red-50/50'
    : 'border-emerald-200 bg-emerald-50/50'
}

const editorClassName =
  'min-h-[220px] max-h-[60vh] w-full min-w-0 resize-y overflow-auto rounded-md border border-slate-200 bg-white p-3 font-mono text-[11px] leading-5 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 sm:min-h-[280px] sm:text-xs'

export function BackendLabClient() {
  const { user, loading } = useAuth()
  const [isPending, startTransition] = useTransition()
  const [assessmentDraft, setAssessmentDraft] = useState(
    prettyJson(DEFAULT_ASSESSMENT_REQUEST)
  )
  const [surveyDraft, setSurveyDraft] = useState(prettyJson(DEFAULT_SURVEY_REQUEST))
  const [simulationDraft, setSimulationDraft] = useState(
    prettyJson(DEFAULT_SIMULATION_REQUEST)
  )
  const [assessmentIdInput, setAssessmentIdInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [assessment, setAssessment] = useState<AssessmentPayload | null>(null)
  const [simulation, setSimulation] = useState<SimulatedAssessmentPayload | null>(null)
  const [surveyReceipt, setSurveyReceipt] = useState<SurveyReceiptPayload | null>(null)

  const activeAssessmentId = assessment?.assessment_id || assessmentIdInput.trim()
  const factorExplanations = assessment?.explanation.factor_explanations ?? []
  const recommendationScenarios =
    assessment?.explanation.recommendation_scenarios ?? []
  const backendBaseUrl = getAssessmentApiBaseUrl()

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

  function parseSimulationDraft(): SimulateAssessmentRequestPayload {
    return JSON.parse(simulationDraft) as SimulateAssessmentRequestPayload
  }

  function handleCreateAssessment() {
    runTask(async () => {
      const payload = parseAssessmentDraft()
      const created = await createAssessment(payload)
      setAssessment(created)
      setAssessmentIdInput(created.assessment_id)
      setSimulation(null)
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
      setSimulation(null)
      setMessage(`Fetched assessment ${fetched.assessment_id}.`)
    })
  }

  function handleRunSimulation() {
    runTask(async () => {
      const assessmentId = activeAssessmentId
      if (!assessmentId) {
        throw new Error('Create or fetch an assessment before running a simulation.')
      }
      const payload = parseSimulationDraft()
      const simulated = await simulateAssessment(assessmentId, payload)
      setSimulation(simulated)
      setMessage(`Simulation returned for assessment ${simulated.assessment_id}.`)
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
    <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6 lg:p-8">
      <div className="min-w-0 space-y-2">
        <h1 className="text-xl font-bold text-navy">Backend Lab</h1>
        <p className="max-w-3xl text-sm text-text-secondary">
          Hidden proof-of-concept route for testing authenticated assessment and survey
          API calls without touching the main product pages.
        </p>
      </div>

      <Card className="min-w-0 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg text-navy">Session Status</CardTitle>
          <CardDescription>
            This page uses the active Supabase session token when one is available.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3 text-sm text-text-primary sm:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0">
            <p className="font-medium text-navy">Auth loading</p>
            <p>{loading ? 'Yes' : 'No'}</p>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-navy">Signed in user</p>
            <p className="break-all">{user?.email || 'No active user detected'}</p>
          </div>
          <div className="min-w-0 sm:col-span-2 xl:col-span-1">
            <p className="font-medium text-navy">Backend URL</p>
            <p className="break-all">{backendBaseUrl}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2 xl:gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg text-navy">Assessment Request</CardTitle>
            <CardDescription>
              Edit the sample payload if you want to test different scoring inputs.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <textarea
              value={assessmentDraft}
              onChange={(event) => setAssessmentDraft(event.target.value)}
              className={editorClassName}
              spellCheck={false}
            />
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <Button className="w-full sm:w-auto" onClick={handleCreateAssessment} disabled={isPending}>
                Create Assessment
              </Button>
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => setAssessmentDraft(prettyJson(DEFAULT_ASSESSMENT_REQUEST))}
                disabled={isPending}
              >
                Reset Payload
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg text-navy">Survey Request</CardTitle>
            <CardDescription>
              Submit a post-results survey tied to the active assessment id.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="assessment-id">Assessment ID</Label>
              <Input
                id="assessment-id"
                className="min-w-0"
                value={assessmentIdInput}
                onChange={(event) => setAssessmentIdInput(event.target.value)}
                placeholder="Create or paste an assessment id"
              />
            </div>
            <textarea
              value={surveyDraft}
              onChange={(event) => setSurveyDraft(event.target.value)}
              className={`${editorClassName} sm:min-h-[240px]`}
              spellCheck={false}
            />
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <Button className="w-full sm:w-auto" variant="outline" onClick={handleFetchAssessment} disabled={isPending}>
                Fetch Assessment
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleSubmitSurvey} disabled={isPending}>
                Submit Survey
              </Button>
              <Button
                className="w-full sm:w-auto"
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

      <Card className="min-w-0 border-teal/20">
        <CardHeader>
          <CardTitle className="text-lg text-navy">Calculator Simulation</CardTitle>
          <CardDescription>
            Test result-screen edits against the active assessment without creating a new
            persisted assessment.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
          <div className="min-w-0 space-y-3">
            <textarea
              value={simulationDraft}
              onChange={(event) => setSimulationDraft(event.target.value)}
              className={`${editorClassName} sm:min-h-[180px]`}
              spellCheck={false}
            />
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <Button className="w-full sm:w-auto" onClick={handleRunSimulation} disabled={isPending}>
                Run Simulation
              </Button>
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onClick={() => setSimulationDraft(prettyJson(DEFAULT_SIMULATION_REQUEST))}
                disabled={isPending}
              >
                Reset Simulation
              </Button>
            </div>
          </div>
          <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {simulation ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Base
                    </p>
                    <p className="text-lg font-semibold text-navy">
                      {formatPercent(simulation.base_probability)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Simulated
                    </p>
                    <p className="text-lg font-semibold text-navy">
                      {formatPercent(simulation.simulated_prediction.probability)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Change
                    </p>
                    <p
                      className={
                        simulation.probability_delta <= 0
                          ? 'text-lg font-semibold text-teal'
                          : 'text-lg font-semibold text-red-600'
                      }
                    >
                      {simulation.probability_delta > 0 ? '+' : ''}
                      {formatPercent(simulation.probability_delta)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Changed fields
                  </p>
                  <p className="mt-1 break-words text-sm text-text-primary">
                    {simulation.changed_fields.length > 0
                      ? simulation.changed_fields.join(', ')
                      : 'No values changed'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-text-secondary">
                Create or fetch an assessment, adjust the JSON overrides, then run a
                simulation to preview the recalculated probability.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {(message || error) && (
        <Card className={`min-w-0 ${error ? 'border-red-200' : 'border-teal/30'}`}>
          <CardContent className="pt-6">
            {message && <p className="break-words text-sm text-teal">{message}</p>}
            {error && <p className="break-words text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] xl:gap-6">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg text-navy">Assessment Result</CardTitle>
            <CardDescription>
              Most recent assessment response from the backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            {assessment ? (
              <>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Probability
                    </p>
                    <p className="text-lg font-semibold text-navy">
                      {formatPercent(assessment.prediction.probability)}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Experiment Arm
                    </p>
                    <p className="break-words text-base font-semibold capitalize text-navy sm:text-lg">
                      {assessment.experiment.arm.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3 sm:col-span-2 xl:col-span-1">
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
                        className="min-w-0 rounded-md border border-slate-200 px-3 py-2"
                      >
                        <span className="break-words font-medium text-navy">{driver.display_name}</span>
                        {' - '}
                        {driver.effect === 'increases_probability'
                          ? 'Increases probability'
                          : 'Decreases probability'}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-navy">Explanation summary</p>
                  <div className="min-w-0 break-words rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-text-primary">
                    {assessment.explanation.message}
                  </div>
                </div>
                {factorExplanations.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-navy">Factor cards</p>
                      <p className="text-xs text-text-secondary">
                        Card-style explanations that can map onto the results mockup.
                      </p>
                    </div>
                    <div className="grid min-w-0 gap-3 lg:grid-cols-2">
                      {factorExplanations.map((factor) => (
                        <div
                          key={factor.feature_key}
                          className={`min-w-0 rounded-lg border p-4 ${driverAccentClass(factor.effect)}`}
                        >
                          <p className="break-words text-sm font-semibold text-navy">{factor.title}</p>
                          <p className="mt-2 text-sm leading-6 text-text-primary">
                            {factor.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {recommendationScenarios.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-navy">What-if scenarios</p>
                      <p className="text-xs text-text-secondary">
                        Deterministic model re-scores based on a single input change.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {recommendationScenarios.map((scenario) => (
                        <div
                          key={`${scenario.feature_key}-${scenario.title}`}
                          className="min-w-0 rounded-lg border border-teal/20 bg-teal/5 p-4"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold text-navy">{scenario.title}</p>
                            <p className="break-words text-sm text-text-primary">
                              {scenario.suggested_change}
                            </p>
                          </div>
                          <div className="mt-3 grid min-w-0 gap-3 text-sm sm:grid-cols-3">
                            <div className="min-w-0 rounded-md bg-white/70 p-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                                Current
                              </p>
                              <p className="text-text-primary">
                                {formatPercent(scenario.current_probability)}
                              </p>
                            </div>
                            <div className="min-w-0 rounded-md bg-white/70 p-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                                Projected
                              </p>
                              <p className="text-text-primary">
                                {formatPercent(scenario.projected_probability)}
                              </p>
                            </div>
                            <div className="min-w-0 rounded-md bg-white/70 p-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                                Improvement
                              </p>
                              <p className="text-teal">
                                {formatPercent(scenario.absolute_improvement)} lower
                              </p>
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-text-primary">
                            {scenario.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-navy">
                    View full assessment JSON
                  </summary>
                  <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre text-[11px] leading-5 text-slate-700 sm:text-xs">
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

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg text-navy">Survey Receipt</CardTitle>
            <CardDescription>
              Most recent survey submission receipt from the backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {surveyReceipt ? (
              <details className="rounded-md border border-slate-200 bg-slate-50 p-3" open>
                <summary className="cursor-pointer text-sm font-medium text-navy">
                  View survey receipt JSON
                </summary>
                <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre text-[11px] leading-5 text-slate-700 sm:text-xs">
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
