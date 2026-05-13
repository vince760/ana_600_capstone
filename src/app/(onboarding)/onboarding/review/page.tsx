'use client'

import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  ShieldAlert,
  Sparkles,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createAssessment } from '@/lib/api/finsight-backend'
import {
  getPrevStep,
  getStepByRoute,
} from '@/lib/onboarding/steps'
import {
  type OnboardingDraft,
  buildAssessmentRequestFromDraft,
  cacheAssessmentResult,
  getOnboardingDraft,
  saveOnboardingDraft,
  setAssessmentSession,
} from '@/lib/onboarding/session'

const EMPLOYMENT_OPTIONS = [
  'Employed full-time',
  'Employed part-time',
  'Self-employed',
  'Unemployed',
  'Retired',
  'Student',
]

const MARITAL_OPTIONS = [
  'Single',
  'Married',
  'Domestic partnership',
  'Divorced',
  'Widowed',
]

const HOUSING_OPTIONS = [
  'Own (mortgaged)',
  'Own (outright)',
  'Rent',
  'Live with family',
  'Other',
]

interface SummaryCardProps {
  title: string
  icon: typeof Coins
  children: ReactNode
}

function SummaryCard({ title, icon: Icon, children }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-navy" />
        <h3 className="text-sm font-bold text-navy">{title}</h3>
      </div>
      {children}
      <p className="mt-4 text-[11px] text-text-muted">
        Changes save immediately.
      </p>
    </div>
  )
}

interface EditableFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'number' | 'text'
  min?: number
  max?: number
  step?: number
  prefix?: string
  placeholder?: string
}

function EditableField({
  id,
  label,
  value,
  onChange,
  type = 'number',
  min,
  max,
  step,
  prefix,
  placeholder,
}: EditableFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-widest text-text-muted"
      >
        {label}
      </label>
      <div className="relative mt-2">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type={type}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-11 border-slate-200 bg-slate-100 text-base text-navy placeholder:text-text-muted focus-visible:border-teal focus-visible:ring-teal/30 ${
            prefix ? 'pl-7' : ''
          }`}
        />
      </div>
    </div>
  )
}

interface EditableSelectProps {
  id: string
  label: string
  placeholder: string
  options: string[]
  value: string
  onChange: (value: string) => void
}

function EditableSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
}: EditableSelectProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-widest text-text-muted"
      >
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="mt-2 h-11 border-slate-200 bg-slate-100 text-base text-navy data-[placeholder]:text-text-muted focus:ring-teal/30"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function ReviewPage() {
  const router = useRouter()
  const current = getStepByRoute('/onboarding/review')
  const prev = current ? getPrevStep(current) : undefined
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => getOnboardingDraft())

  useEffect(() => {
    setDraft(getOnboardingDraft())
  }, [])

  const updateDraft = (patch: Partial<OnboardingDraft>) => {
    const next = saveOnboardingDraft(patch)
    setDraft(next)
  }

  const toInputValue = (value: number | null) =>
    typeof value === 'number' ? String(value) : ''

  const parseNumberInput = (value: string): number | null => {
    if (!value.trim()) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const setNumericField = (
    key: keyof OnboardingDraft,
    value: string,
    integer = false
  ) => {
    const parsed = parseNumberInput(value)
    updateDraft({
      [key]:
        parsed === null ? null : integer ? Math.round(parsed) : parsed,
    } as Partial<OnboardingDraft>)
  }

  const dtiPercent = useMemo(() => {
    if (
      typeof draft.monthly_consumer_debt_payments_usd !== 'number' ||
      typeof draft.annual_household_income_usd !== 'number' ||
      draft.annual_household_income_usd <= 0
    ) {
      return null
    }
    return Math.round(
      ((draft.monthly_consumer_debt_payments_usd * 12) /
        draft.annual_household_income_usd) *
        100
    )
  }, [draft])

  const canSubmit = useMemo(() => {
    const requiredFields = [
      draft.primary_user_age_years,
      draft.num_children_under_18,
      draft.annual_household_income_usd,
      draft.total_household_debt_usd,
      draft.monthly_consumer_debt_payments_usd,
      draft.liquid_assets_usd,
      draft.credit_card_revolving_balance_usd,
      draft.monthly_grocery_spend_usd,
      draft.monthly_dining_spend_usd,
    ]
    return (
      draft.research_consent_accepted &&
      requiredFields.every((value) => typeof value === 'number' && !Number.isNaN(value))
    )
  }, [draft])

  const handleSubmit = async () => {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const nextDraft = getOnboardingDraft()
      if (!nextDraft.research_consent_accepted) {
        throw new Error('Research consent is required before submission.')
      }
      const payload = buildAssessmentRequestFromDraft(nextDraft)
      const created = await createAssessment(payload)
      cacheAssessmentResult(created)
      setAssessmentSession({
        assessment_id: created.assessment_id,
        input: payload.input,
      })
      router.push(`/assessment-results?assessmentId=${created.assessment_id}`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to submit assessment right now.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-bold tracking-tight text-navy">
        Review Your Assessment
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
        Please verify your information before we generate your intelligence
        profile.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <SummaryCard
          title="Income & Assets"
          icon={Coins}
        >
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <EditableField
              id="annual-income"
              label="Annual Household Income"
              value={toInputValue(draft.annual_household_income_usd)}
              onChange={(value) => setNumericField('annual_household_income_usd', value)}
              min={0}
              step={0.01}
              prefix="$"
              placeholder="120000"
            />
            <EditableField
              id="liquid-assets"
              label="Liquid Assets"
              value={toInputValue(draft.liquid_assets_usd)}
              onChange={(value) => setNumericField('liquid_assets_usd', value)}
              min={0}
              step={0.01}
              prefix="$"
              placeholder="10000"
            />
            <EditableField
              id="primary-age"
              label="Primary User Age"
              value={toInputValue(draft.primary_user_age_years)}
              onChange={(value) => setNumericField('primary_user_age_years', value, true)}
              min={18}
              max={100}
              step={1}
              placeholder="18-100"
            />
            <EditableField
              id="children-count"
              label="Children Under 18"
              value={toInputValue(draft.num_children_under_18)}
              onChange={(value) => setNumericField('num_children_under_18', value, true)}
              min={0}
              max={20}
              step={1}
              placeholder="0-20"
            />
          </div>
        </SummaryCard>

        <aside className="rounded-xl border-l-4 border-mint bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-mint">
            <Sparkles className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest">
              Pro Insight
            </p>
          </div>
          <p className="mt-2 text-sm font-semibold text-navy">
            Liquidity is in the top 15th percentile.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-text-secondary">
            Your current cash position suggests high readiness for
            opportunistic reinvestment.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-mint" />
            <span className="text-[11px] text-text-secondary">
              Validated by Global Aperture Ltd.
            </span>
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <SummaryCard
          title="Liability Depth"
          icon={ShieldAlert}
        >
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <EditableField
              id="total-debt"
              label="Total Household Debt"
              value={toInputValue(draft.total_household_debt_usd)}
              onChange={(value) => setNumericField('total_household_debt_usd', value)}
              min={0}
              step={0.01}
              prefix="$"
              placeholder="50000"
            />
            <EditableField
              id="monthly-debt"
              label="Consumer Debt Payments (Monthly)"
              value={toInputValue(draft.monthly_consumer_debt_payments_usd)}
              onChange={(value) =>
                setNumericField('monthly_consumer_debt_payments_usd', value)
              }
              min={0}
              step={0.01}
              prefix="$"
              placeholder="850"
            />
            <EditableField
              id="credit-balance"
              label="Credit Card Balance"
              value={toInputValue(draft.credit_card_revolving_balance_usd)}
              onChange={(value) =>
                setNumericField('credit_card_revolving_balance_usd', value)
              }
              min={0}
              step={0.01}
              prefix="$"
              placeholder="4200"
            />
          </div>
        </SummaryCard>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-navy" />
            <h3 className="text-sm font-bold text-navy">Capital Outflow</h3>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Core Expenses
              </p>
              <EditableField
                id="monthly-grocery"
                label="Monthly Grocery"
                value={toInputValue(draft.monthly_grocery_spend_usd)}
                onChange={(value) => setNumericField('monthly_grocery_spend_usd', value)}
                min={0}
                step={0.01}
                prefix="$"
                placeholder="800"
              />
              <EditableField
                id="monthly-dining"
                label="Monthly Dining"
                value={toInputValue(draft.monthly_dining_spend_usd)}
                onChange={(value) => setNumericField('monthly_dining_spend_usd', value)}
                min={0}
                step={0.01}
                prefix="$"
                placeholder="500"
              />
            </div>
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Additional Context
              </p>
              <EditableSelect
                id="employment-status"
                label="Employment"
                placeholder="Select status..."
                options={EMPLOYMENT_OPTIONS}
                value={draft.employment_status}
                onChange={(value) => updateDraft({ employment_status: value })}
              />
              <EditableSelect
                id="housing-status"
                label="Housing"
                placeholder="Select status..."
                options={HOUSING_OPTIONS}
                value={draft.housing_status}
                onChange={(value) => updateDraft({ housing_status: value })}
              />
              <EditableSelect
                id="marital-status"
                label="Marital"
                placeholder="Select status..."
                options={MARITAL_OPTIONS}
                value={draft.marital_status}
                onChange={(value) => updateDraft({ marital_status: value })}
              />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-text-muted">
            Changes save immediately.
          </p>
        </div>
      </div>

      <div className="mt-6 max-w-3xl rounded-xl border-l-4 border-gold bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-bold text-navy">Snapshot</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Debt-to-Income is currently{' '}
              <span className="font-semibold text-navy">
                {dtiPercent === null ? '--' : `${dtiPercent}%`}
              </span>
              {dtiPercent === null
                ? '.'
                : dtiPercent <= 36
                  ? ', which is within a healthy institutional range.'
                  : ', which is above the recommended range.'}
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm font-medium text-red-600">{errorMessage}</p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {prev && (
            <button
              type="button"
              onClick={() => router.push(prev.route)}
              className="text-sm font-medium text-text-secondary hover:text-navy"
            >
              &larr; Back to Finances
            </button>
          )}
          <span className="hidden text-xs text-text-muted sm:inline">
            By clicking submit, you confirm that all financial data provided is
            accurate as of today.
          </span>
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="h-12 gap-2 rounded-full bg-navy px-6 text-sm font-semibold text-white hover:bg-navyMid"
        >
          {submitting ? 'Submitting...' : 'Submit Assessment'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
