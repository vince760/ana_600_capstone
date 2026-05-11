'use client'

import { useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  Gauge,
  PieChart as PieChartIcon,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
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

const MOCK_PROBABILITY = 0.16
const QUOTIENT_SCORE = Math.round((1 - MOCK_PROBABILITY) * 10 * 10) / 10
const RISK_BAND_LABEL = 'Moderate-Low Risk Band'

type ExplanationStatus = 'not_generated' | 'complete'
const MOCK_EXPLANATION_STATUS: ExplanationStatus = 'not_generated'

const MOCK_ANNUAL_INCOME = 185_000
const MOCK_MONTHLY_DEBT_PAYMENTS = 4_200
const DTI_RATIO = Math.round(
  ((MOCK_MONTHLY_DEBT_PAYMENTS * 12) / MOCK_ANNUAL_INCOME) * 100
)
const DTI_HEALTHY_MAX = 36

const DRIVER_RESULTS = [
  { label: 'Stable Income', value: -0.18 },
  { label: 'Low Debt Burden', value: -0.14 },
  { label: 'Grocery Inflation', value: 0.11 },
  { label: 'Retirement Reserves', value: -0.09 },
  { label: 'Low Emergency Buffer', value: 0.07 },
]

const DRIVERS = [
  {
    icon: TrendingUp,
    title: 'Stable Income',
    description:
      'Diversified revenue streams contribute to consistent cash flow stability across cycles.',
    accent: 'mint',
  },
  {
    icon: ShieldCheck,
    title: 'Low Debt Burden',
    description:
      'Liability management is optimized, keeping debt service ratios well below industry danger zones.',
    accent: 'mint',
  },
  {
    icon: TrendingDown,
    title: 'Grocery Inflation',
    description:
      'High sensitivity to non-discretionary price hikes is eroding month-over-month surplus.',
    accent: 'gold',
  },
  {
    icon: Wallet,
    title: 'Low Emergency Buffer',
    description:
      'Liquid reserves currently cover less than 3 months of essential operating costs.',
    accent: 'gold',
  },
] as const

const LIKERT_QUESTIONS = [
  { id: 'understood', label: 'I understood what contributed most to my result.' },
  { id: 'clarity', label: 'The explanation was clear and easy to follow.' },
  { id: 'trust', label: 'This result felt trustworthy.' },
] as const

function currency(value: number) {
  return `$${value.toLocaleString('en-US')}`
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

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

const DRIVER_POSITIVE = '#E05252'
const DRIVER_NEGATIVE = '#02C39A'

function DriversChart() {
  const sorted = [...DRIVER_RESULTS].sort(
    (a, b) => Math.abs(b.value) - Math.abs(a.value)
  )
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} stroke="#F1F5F9" />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748B' }}
          domain={[-0.25, 0.25]}
          tickFormatter={(v) => v.toFixed(2)}
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
            const n = toNumber(value)
            const sign = n > 0 ? '+' : ''
            const direction = n > 0 ? 'increases risk' : 'reduces risk'
            return [`${sign}${n.toFixed(2)} (${direction})`, 'Impact']
          }}
          contentStyle={{
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[3, 3, 3, 3]}>
          {sorted.map((d) => (
            <Cell
              key={d.label}
              fill={d.value > 0 ? DRIVER_POSITIVE : DRIVER_NEGATIVE}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function NetEffectPie() {
  const reducing = DRIVER_RESULTS.filter((d) => d.value < 0).reduce(
    (sum, d) => sum + Math.abs(d.value),
    0
  )
  const increasing = DRIVER_RESULTS.filter((d) => d.value > 0).reduce(
    (sum, d) => sum + d.value,
    0
  )
  const total = reducing + increasing
  const reducingPct = total > 0 ? Math.round((reducing / total) * 100) : 0
  const dominant = reducing >= increasing ? 'reducing' : 'increasing'

  const slices = [
    { label: 'Reducing risk', contribution: reducing, fill: DRIVER_NEGATIVE },
    { label: 'Increasing risk', contribution: increasing, fill: DRIVER_POSITIVE },
  ]

  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="contribution"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {slices.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const n = toNumber(value)
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
        <p
          className={
            dominant === 'reducing'
              ? 'text-2xl font-bold text-mint'
              : 'text-2xl font-bold text-[#E05252]'
          }
        >
          {dominant === 'reducing' ? reducingPct : 100 - reducingPct}%
        </p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
          {dominant === 'reducing' ? 'reducing' : 'increasing'}
        </p>
      </div>
    </div>
  )
}

function DebtRatioGauge() {
  const isHealthy = DTI_RATIO <= DTI_HEALTHY_MAX
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="flex items-end justify-between">
        <p className="text-5xl font-bold text-navy">{DTI_RATIO}%</p>
        <div
          className={
            isHealthy
              ? 'flex items-center gap-1.5 rounded-full bg-mint/10 px-3 py-1'
              : 'flex items-center gap-1.5 rounded-full bg-[#E05252]/10 px-3 py-1'
          }
        >
          <CheckCircle2
            className={isHealthy ? 'h-3.5 w-3.5 text-mint' : 'h-3.5 w-3.5 text-[#E05252]'}
          />
          <span
            className={
              isHealthy
                ? 'text-[11px] font-semibold text-mint'
                : 'text-[11px] font-semibold text-[#E05252]'
            }
          >
            {isHealthy ? 'Healthy' : 'Elevated'}
          </span>
        </div>
      </div>

      <div className="mt-6">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-mint via-gold to-[#E05252]" />
          <div
            className="absolute -top-1 h-4 w-1 rounded-full bg-navy shadow"
            style={{ left: `calc(${DTI_RATIO}% - 2px)` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-medium text-text-muted">
          <span>0%</span>
          <span>20%</span>
          <span>36%</span>
          <span>50%+</span>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-text-secondary">
        Debt-to-income sits below the{' '}
        <span className="font-semibold text-navy">{DTI_HEALTHY_MAX}%</span>{' '}
        institutional threshold, indicating sustainable leverage relative to
        gross income.
      </p>
    </div>
  )
}

interface DriverCardProps {
  driver: (typeof DRIVERS)[number]
}

function DriverCard({ driver }: DriverCardProps) {
  const Icon = driver.icon
  const accent = driver.accent === 'mint' ? 'text-mint' : 'text-gold'
  const accentBg = driver.accent === 'mint' ? 'bg-mint/10' : 'bg-gold/10'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentBg}`}
      >
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-navy">{driver.title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">
        {driver.description}
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
  const scoreOutOf10 = QUOTIENT_SCORE.toFixed(1)

  const [surveyOpen, setSurveyOpen] = useState(false)
  const [likertAnswers, setLikertAnswers] = useState<Record<string, number | null>>({
    understood: null,
    clarity: null,
    trust: null,
  })
  const [feedback, setFeedback] = useState('')
  const [surveySubmitted, setSurveySubmitted] = useState(false)

  const answeredCount = Object.values(likertAnswers).filter((v) => v !== null).length
  const surveyProgress = Math.round((answeredCount / LIKERT_QUESTIONS.length) * 100)
  const canSubmitSurvey = LIKERT_QUESTIONS.every((q) => likertAnswers[q.id] !== null)

  const handleSurveySubmit = () => {
    setSurveySubmitted(true)
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal" />
            <span className="text-sm font-bold text-navy">FinSight AI</span>
          </div>
          <span className="text-xs font-medium text-text-muted">
            Research Division
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 lg:px-8 lg:py-14">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-navy">
            Your Intelligence Profile
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Based on your recent assessment data.
          </p>
        </div>

        <div
          className={
            MOCK_EXPLANATION_STATUS === 'complete'
              ? 'mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]'
              : 'mt-10'
          }
        >
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
              Overall Financial Quotient
            </p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-6xl font-bold text-navy">
                {scoreOutOf10}
              </span>
              <span className="mb-2 text-lg font-medium text-text-muted">
                / 10
              </span>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-mint/10 px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-mint" />
              <span className="text-xs font-semibold text-mint">
                {RISK_BAND_LABEL}
              </span>
            </div>

            <div className="mt-6">
              <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-mint via-gold to-[#E05252]" />
                <div
                  className="absolute -top-1 h-5 w-1 rounded-full bg-navy shadow"
                  style={{ left: `calc(${QUOTIENT_SCORE * 10}% - 2px)` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-medium text-text-muted">
                <span>Conservative</span>
                <span>Aggressive</span>
              </div>
            </div>

            <p className="mt-8 max-w-xl text-base leading-relaxed text-text-primary">
              Your profile indicates a strong foundation with potential for
              growth in liquidity management.
            </p>
          </div>

          {MOCK_EXPLANATION_STATUS === 'complete' && (
            <aside className="rounded-xl border-l-4 border-teal bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-teal">
                <Brain className="h-4 w-4" />
                <p className="text-[11px] font-bold uppercase tracking-widest">
                  Detailed Analysis
                </p>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                <span className="font-semibold text-navy">AI Synthesis:</span>{' '}
                Our models detected high efficiency in recurring expense
                management, though inflation sensitivity remains a key variable.
              </p>
              <ul className="mt-4 space-y-3 text-xs text-text-secondary">
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal" />
                  <span>
                    Capital allocation is prioritized toward low-yield security.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal" />
                  <span>
                    Debt-to-income ratio remains in the top 15th percentile.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal" />
                  <span>
                    Market volatility buffer requires a 12% upward adjustment.
                  </span>
                </li>
              </ul>
            </aside>
          )}
        </div>

        <section className="mt-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">
              Financial Snapshot
            </h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Visual breakdown of the inputs powering your intelligence profile.
          </p>

          <div className="mt-5 grid gap-6 lg:grid-cols-4">
            <ChartCard
              title="Risk Drivers"
              subtitle="Features pushing your score up (red) or down (green)"
              icon={BarChart3}
              className="lg:col-span-2"
              heightClass="h-72"
            >
              <DriversChart />
            </ChartCard>

            <ChartCard
              title="Net Driver Effect"
              subtitle="Combined effect of helpful vs concerning factors"
              icon={PieChartIcon}
              heightClass="h-72"
            >
              <NetEffectPie />
            </ChartCard>

            <ChartCard
              title="Debt-to-Income Ratio"
              subtitle="Monthly debt service against gross income"
              icon={Gauge}
              heightClass="h-72"
            >
              <DebtRatioGauge />
            </ChartCard>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-bold text-navy">
            What&apos;s driving this result
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DRIVERS.map((driver) => (
              <DriverCard key={driver.title} driver={driver} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <Collapsible open={surveyOpen} onOpenChange={setSurveyOpen}>
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

                  <div className="mt-6">
                    <h3 className="text-xl font-bold tracking-tight text-navy">
                      A few quick questions
                    </h3>
                    <p className="mt-1 text-xs text-text-secondary">
                      Help us improve how we communicate financial insights.
                    </p>
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
                      {surveySubmitted ? 'Update Response' : 'Submit Survey'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </section>

        <p className="mt-10 text-center text-xs italic text-text-muted">
          This result is intended for research and educational use based on
          provided data.
        </p>
      </main>
    </div>
  )
}
