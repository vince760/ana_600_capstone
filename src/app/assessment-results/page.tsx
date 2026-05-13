'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Gauge,
  PieChart as PieChartIcon,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  getAssessment,
  submitSurveyResponse,
  type AssessmentPayload,
} from '@/lib/api/finsight-backend'
import {
  cacheAssessmentResult,
  getAssessmentSession,
  getCachedAssessmentResult,
  getSurveySubmissionState,
  markSurveySubmitted,
} from '@/lib/onboarding/session'

const LIKERT_QUESTIONS = [
  { id: 'understood', label: 'I understood what contributed most to my result.' },
  { id: 'clarity', label: 'The explanation was clear and easy to follow.' },
  { id: 'trust', label: 'This result felt trustworthy.' },
] as const

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function getRiskBand(probability: number): {
  label: string
  tone: 'low' | 'moderate' | 'high'
  plainSummary: string
} {
  if (probability < 0.35) {
    return {
      label: 'Lower Risk',
      tone: 'low',
      plainSummary:
        'Your answers look closer to households that usually keep spending within income.',
    }
  }
  if (probability < 0.65) {
    return {
      label: 'Moderate Risk',
      tone: 'moderate',
      plainSummary:
        'Your answers show some warning signs that may make spending exceed income in tougher months.',
    }
  }
  return {
    label: 'Higher Risk',
    tone: 'high',
    plainSummary:
      'Your answers look closer to households that are more likely to spend above income.',
  }
}

function formatChanceOutOfTen(probability: number): string {
  const outOfTen = Math.round(probability * 10)
  return `${outOfTen} out of 10`
}

function formatArmLabel(arm: AssessmentPayload['experiment']['arm']) {
  return arm.replaceAll('_', ' ')
}

function getExplanationBadgeLabel(assessment: AssessmentPayload): string {
  if (assessment.explanation.status === 'failed') {
    return 'LLM fallback'
  }
  if (assessment.explanation.status === 'not_generated') {
    return 'No explanation'
  }
  return formatArmLabel(assessment.experiment.arm)
}

const DRIVER_POSITIVE = '#E05252'
const DRIVER_NEGATIVE = '#02C39A'

interface ChartCardProps {
  title: string
  subtitle: string
  icon: typeof BarChart3
  children: React.ReactNode
  className?: string
  heightClass?: string
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  heightClass = 'h-64',
}: ChartCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
          {title}
        </p>
      </div>
      <p className="mt-1 text-xs text-text-muted">{subtitle}</p>
      <div className={`mt-5 ${heightClass}`}>{children}</div>
    </div>
  )
}

interface DriverImpactDatum {
  label: string
  shap: number
}

function DriverImpactChart({ data }: { data: DriverImpactDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 20, left: 8, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} stroke="#F1F5F9" />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748B' }}
          tickFormatter={(v) => Number(v).toFixed(2)}
        />
        <YAxis
          type="category"
          dataKey="label"
          axisLine={false}
          tickLine={false}
          width={160}
          tick={{ fontSize: 12, fill: '#334155' }}
        />
        <ReferenceLine x={0} stroke="#94A3B8" strokeWidth={1} />
        <Tooltip
          formatter={(value) => {
            const n = Number(value)
            const sign = n > 0 ? '+' : ''
            const direction = n > 0 ? 'raised your estimate' : 'lowered your estimate'
            return [`${sign}${n.toFixed(3)} (${direction})`, 'Impact score']
          }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            fontSize: 12,
          }}
        />
        <Bar dataKey="shap" radius={[4, 4, 4, 4]}>
          {data.map((d) => (
            <Cell
              key={d.label}
              fill={d.shap > 0 ? DRIVER_POSITIVE : DRIVER_NEGATIVE}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DriverNetEffectPie({
  increase,
  decrease,
}: {
  increase: number
  decrease: number
}) {
  const total = increase + decrease
  const slices = [
    { label: 'Reducing risk', contribution: decrease, fill: DRIVER_NEGATIVE },
    { label: 'Increasing risk', contribution: increase, fill: DRIVER_POSITIVE },
  ]
  const reducingPct = total > 0 ? Math.round((decrease / total) * 100) : 0

  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="contribution"
            nameKey="label"
            innerRadius={50}
            outerRadius={78}
            paddingAngle={2}
            stroke="none"
          >
            {slices.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const n = Number(value)
              const pct = total > 0 ? Math.round((n / total) * 100) : 0
              return [`${pct}%`, String(name)]
            }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              fontSize: 12,
            }}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[34%] flex flex-col items-center">
        <p className="text-2xl font-bold text-navy">{reducingPct}%</p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
          reducing
        </p>
      </div>
    </div>
  )
}

function ProbabilityGauge({ probability }: { probability: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(probability * 100)))
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex items-end justify-between">
        <p className="text-5xl font-bold text-navy">{pct}%</p>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-navy">
          Model Output
        </span>
      </div>
      <div className="mt-6">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-mint via-gold to-[#E05252]" />
          <div
            className="absolute -top-1 h-4 w-1 rounded-full bg-navy shadow"
            style={{ left: `calc(${pct}% - 2px)` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-medium text-text-muted">
          <span>Low</span>
          <span>Moderate</span>
          <span>High</span>
        </div>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-text-secondary">
        This estimate is based on patterns in past survey data and your
        submitted numbers. It is not a diagnosis or guarantee.
      </p>
    </div>
  )
}

interface LikertScaleProps {
  id: string
  question: string
  value: number | null
  onChange: (value: number) => void
}

function LikertScale({ id, question, value, onChange }: LikertScaleProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-navy">{question}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Disagree
        </span>
        <div className="flex flex-1 justify-center gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((n) => {
            const selected = value === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-label={`${question} - rating ${n}`}
                aria-pressed={selected}
                className={
                  selected
                    ? 'h-9 w-9 rounded-full border border-navy bg-navy text-xs font-semibold text-white'
                    : 'h-9 w-9 rounded-full border border-slate-200 bg-white text-xs font-semibold text-text-secondary transition-colors hover:border-navy hover:text-navy'
                }
              >
                {n}
              </button>
            )
          })}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Agree
        </span>
      </div>
      <input type="hidden" name={id} value={value ?? ''} readOnly />
    </div>
  )
}

export default function AssessmentResultsPage() {
  const [assessment, setAssessment] = useState<AssessmentPayload | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [surveyOpen, setSurveyOpen] = useState(false)
  const [likertAnswers, setLikertAnswers] = useState<Record<string, number | null>>({
    understood: null,
    clarity: null,
    trust: null,
  })
  const [feedback, setFeedback] = useState('')
  const [surveySubmitting, setSurveySubmitting] = useState(false)
  const [surveySubmitted, setSurveySubmitted] = useState(false)

  const [resultsViewedAt, setResultsViewedAt] = useState<Date | null>(null)
  const [surveyStartedAt, setSurveyStartedAt] = useState<Date | null>(null)

  const inputSnapshot = getAssessmentSession()?.input
  const dtiRatio = useMemo(() => {
    if (!inputSnapshot || inputSnapshot.annual_household_income_usd <= 0) {
      return null
    }
    return Math.round(
      ((inputSnapshot.monthly_consumer_debt_payments_usd * 12) /
        inputSnapshot.annual_household_income_usd) *
        100
    )
  }, [inputSnapshot])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const assessmentIdFromQuery = params.get('assessmentId')
    const fallbackSession = getAssessmentSession()
    const assessmentId = assessmentIdFromQuery ?? fallbackSession?.assessment_id ?? null

    if (!assessmentId) {
      setErrorMessage('Missing assessment id. Please resubmit onboarding.')
      setLoading(false)
      return
    }

    const cachedAssessment = getCachedAssessmentResult(assessmentId)
    if (cachedAssessment) {
      setAssessment(cachedAssessment)
      setLoading(false)
    }

    const surveyState = getSurveySubmissionState(assessmentId)
    if (surveyState?.submitted) {
      setSurveySubmitted(true)
    }

    const loadAssessment = async () => {
      if (!cachedAssessment) {
        setLoading(true)
      }
      setErrorMessage(null)
      try {
        const fetched = await getAssessment(assessmentId)
        cacheAssessmentResult(fetched)
        setAssessment(fetched)
        setResultsViewedAt(new Date())
      } catch (error) {
        if (cachedAssessment) {
          setErrorMessage(
            'Live refresh failed. Showing your last saved result from this device.'
          )
        } else {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to fetch assessment results right now.'
          )
        }
      } finally {
        setLoading(false)
      }
    }

    loadAssessment()
  }, [])

  const answeredCount = Object.values(likertAnswers).filter((v) => v !== null).length
  const surveyProgress = Math.round((answeredCount / LIKERT_QUESTIONS.length) * 100)
  const canSubmitSurvey =
    assessment !== null &&
    LIKERT_QUESTIONS.every((q) => likertAnswers[q.id] !== null) &&
    !surveySubmitting

  const handleSurveyOpen = (open: boolean) => {
    setSurveyOpen(open)
    if (open && surveyStartedAt === null) {
      setSurveyStartedAt(new Date())
    }
  }

  const handleSurveySubmit = async () => {
    if (!assessment) return

    setSurveySubmitting(true)
    setErrorMessage(null)
    try {
      const now = new Date()
      const timeOnResultsMs =
        resultsViewedAt === null ? undefined : now.getTime() - resultsViewedAt.getTime()
      const timeOnSurveyMs =
        surveyStartedAt === null ? undefined : now.getTime() - surveyStartedAt.getTime()

      await submitSurveyResponse(assessment.assessment_id, {
        survey_version: 'survey_v1',
        answers: {
          understood_result: likertAnswers.understood as number,
          explanation_clarity: likertAnswers.clarity as number,
          trusted_result: likertAnswers.trust as number,
          most_confusing_part: feedback.trim() || 'none',
        },
        context: {
          time_on_results_ms: timeOnResultsMs,
          time_on_survey_ms: timeOnSurveyMs,
        },
      })
      markSurveySubmitted(assessment.assessment_id)
      setSurveySubmitted(true)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to submit survey right now.'
      )
    } finally {
      setSurveySubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-text-secondary">Loading assessment results...</p>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-sm text-red-600">{errorMessage ?? 'No assessment found.'}</p>
      </div>
    )
  }

  const topDrivers = assessment.drivers.slice(0, 5)
  const riskBand = getRiskBand(assessment.prediction.probability)
  const chartDrivers = [...assessment.drivers]
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 5)
    .map((driver) => ({
      label: driver.display_name,
      shap: driver.shap_value,
    }))

  const netIncrease = assessment.drivers
    .filter((d) => d.shap_value > 0)
    .reduce((sum, d) => sum + d.shap_value, 0)
  const netDecrease = assessment.drivers
    .filter((d) => d.shap_value < 0)
    .reduce((sum, d) => sum + Math.abs(d.shap_value), 0)

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-navy">
            Your Financial Risk Snapshot
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Based on the information you entered.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Assessment ID: {assessment.assessment_id}
          </p>
        </div>

        {errorMessage && (
          <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
        )}

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
            Chance Of Spending Above Income
          </p>
          <p className="mt-2 text-6xl font-bold text-navy">
            {formatPercent(assessment.prediction.probability)}
          </p>
          <p className="mt-2 text-sm font-semibold text-navy">
            About {formatChanceOutOfTen(assessment.prediction.probability)} chance
            based on similar profiles.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs font-semibold capitalize text-navy">
              {getExplanationBadgeLabel(assessment)}
            </span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <span
              className={
                riskBand.tone === 'low'
                  ? 'h-2 w-2 rounded-full bg-mint'
                  : riskBand.tone === 'moderate'
                    ? 'h-2 w-2 rounded-full bg-gold'
                    : 'h-2 w-2 rounded-full bg-[#E05252]'
              }
            />
            <span className="text-xs font-semibold text-navy">{riskBand.label}</span>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-text-secondary">
            {riskBand.plainSummary}
          </p>
          {dtiRatio !== null && (
            <p className="mt-4 text-xs text-text-secondary">
              Debt-to-income ratio from your submission: <span className="font-semibold text-navy">{dtiRatio}%</span>
            </p>
          )}
        </div>

        <section className="mt-10">
          <div className="grid gap-6 lg:grid-cols-4">
            <ChartCard
              title="What Raised Or Lowered Your Estimate"
              subtitle="Red bars pushed your estimate higher. Green bars pushed it lower."
              icon={BarChart3}
              className="lg:col-span-2"
              heightClass="h-72"
            >
              <DriverImpactChart data={chartDrivers} />
            </ChartCard>

            <ChartCard
              title="Overall Push"
              subtitle="How much your factors leaned higher vs lower overall."
              icon={PieChartIcon}
              heightClass="h-72"
            >
              <DriverNetEffectPie
                increase={netIncrease}
                decrease={netDecrease}
              />
            </ChartCard>

            <ChartCard
              title="Risk Meter"
              subtitle="Where your estimate falls on a low-to-high range."
              icon={Gauge}
              heightClass="h-72"
            >
              <ProbabilityGauge probability={assessment.prediction.probability} />
            </ChartCard>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-navy">Main Reasons</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topDrivers.map((driver) => {
              const increasesRisk = driver.effect === 'increases_probability'
              return (
                <div
                  key={driver.feature_key}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-navy">{driver.display_name}</p>
                    {increasesRisk ? (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-mint" />
                    )}
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">{driver.plain_description}</p>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-text-muted">
                    {increasesRisk ? 'Raised estimate' : 'Lowered estimate'} (impact score {Math.abs(
                      driver.shap_value
                    ).toFixed(3)})
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {assessment.explanation.status !== 'not_generated' && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-navy">Plain-Language Breakdown</h2>
            <p className="mt-2 text-sm text-text-secondary">{assessment.explanation.message}</p>
            {!!assessment.explanation.factor_explanations.length && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {assessment.explanation.factor_explanations.map((factor) => (
                  <div
                    key={factor.feature_key}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <p className="text-sm font-bold text-navy">{factor.title}</p>
                    <p className="mt-2 text-xs text-text-secondary">{factor.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <Collapsible open={surveyOpen} onOpenChange={handleSurveyOpen}>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-slate-50"
                >
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gold">
                      Research Survey
                    </p>
                    <p className="mt-1 text-base font-bold text-navy">
                      Help us improve - a few quick questions
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {surveySubmitted
                        ? 'Thanks for your feedback. You can reopen to revise.'
                        : 'Your responses shape how we communicate financial insights.'}
                    </p>
                  </div>
                  <ChevronDown
                    className={
                      surveyOpen
                        ? 'h-5 w-5 shrink-0 text-text-muted transition-transform rotate-180'
                        : 'h-5 w-5 shrink-0 text-text-muted transition-transform'
                    }
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-slate-200 px-6 py-7">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                      Survey Progress
                    </p>
                    <span className="text-xs font-semibold text-navy">
                      {surveyProgress}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-navy transition-all"
                      style={{ width: `${surveyProgress}%` }}
                    />
                  </div>

                  <div className="mt-6 space-y-4">
                    {LIKERT_QUESTIONS.map((q) => (
                      <LikertScale
                        key={q.id}
                        id={q.id}
                        question={q.label}
                        value={likertAnswers[q.id]}
                        onChange={(v) =>
                          setLikertAnswers((prev) => ({ ...prev, [q.id]: v }))
                        }
                      />
                    ))}

                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <label
                        htmlFor="survey-feedback"
                        className="text-sm font-medium text-navy"
                      >
                        What was confusing, if anything?
                      </label>
                      <textarea
                        id="survey-feedback"
                        rows={4}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Your feedback helps us provide more clarity..."
                        className="mt-3 w-full resize-none rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-navy placeholder:text-text-muted focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                    {surveySubmitted ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-mint">
                        <CheckCircle2 className="h-4 w-4" />
                        Survey submitted - thank you.
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">
                        All rating questions are required.
                      </p>
                    )}
                    <Button
                      type="button"
                      onClick={handleSurveySubmit}
                      disabled={!canSubmitSurvey}
                      className="h-11 gap-2 rounded-full bg-navy px-6 text-sm font-semibold text-white hover:bg-navyMid disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {surveySubmitting
                        ? 'Submitting...'
                        : surveySubmitted
                          ? 'Update Response'
                          : 'Submit Survey'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>
      </main>
    </div>
  )
}
