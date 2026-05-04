'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getNextStep,
  getPrevStep,
  getStepByRoute,
} from '@/lib/onboarding/steps'

interface FieldConfig {
  id: string
  label: string
  helper: string
  placeholder: string
}

const FIELDS: FieldConfig[] = [
  {
    id: 'annual-income',
    label: 'Annual Household Income (USD)',
    helper: 'Includes all taxable revenue streams before deductions.',
    placeholder: '120,000',
  },
  {
    id: 'total-debt',
    label: 'Total Household Debt (USD)',
    helper: 'Aggregate sum of mortgages, loans, and credit balances.',
    placeholder: '240,000',
  },
  {
    id: 'monthly-debt',
    label: 'Monthly Consumer Debt Payments (USD)',
    helper: 'Recurring monthly liabilities excluding primary mortgage.',
    placeholder: '850',
  },
  {
    id: 'cc-balance',
    label: 'Current Revolving Credit Card Balance (USD)',
    helper: 'The outstanding balance across all active credit accounts.',
    placeholder: '4,200',
  },
]

export default function IncomeDebtPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const router = useRouter()

  const current = getStepByRoute('/onboarding/income-debt')
  const next = current ? getNextStep(current) : undefined
  const prev = current ? getPrevStep(current) : undefined

  const isValid = FIELDS.every((f) => values[f.id] && Number(values[f.id]) >= 0)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-bold tracking-tight text-navy">
        Income &amp; Debt Baseline
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
        Providing accurate data ensures higher-fidelity predictions. We use
        these metrics to calculate your long-term capital trajectory.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {FIELDS.map((field) => (
          <div
            key={field.id}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <label
              htmlFor={field.id}
              className="text-[11px] font-bold uppercase tracking-widest text-text-secondary"
            >
              {field.label}
            </label>
            <p className="mt-1 text-xs text-text-muted">{field.helper}</p>
            <div className="relative mt-3">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                $
              </span>
              <Input
                id={field.id}
                type="number"
                min={0}
                value={values[field.id] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.id]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="h-12 border-slate-200 bg-slate-100 pl-7 text-base text-navy placeholder:text-text-muted focus-visible:border-teal focus-visible:ring-teal/30"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 max-w-3xl rounded-xl border-l-4 border-mint bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
          <div>
            <p className="text-sm font-bold text-navy">Why this matters</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Your debt-to-income ratio is the primary driver behind our
              risk-adjusted projections. Accurate values let the model
              estimate your liquidity runway and surface explainable risk
              drivers.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {prev && (
            <button
              type="button"
              onClick={() => router.push(prev.route)}
              className="text-sm font-medium text-text-secondary hover:text-navy"
            >
              &larr; Back
            </button>
          )}
          <span className="text-xs text-text-muted">
            Auto-saves every 30 seconds
          </span>
        </div>

        <Button
          type="button"
          onClick={() => next && router.push(next.route)}
          disabled={!isValid || !next}
          className="h-12 gap-2 rounded-full bg-navy px-6 text-sm font-semibold text-white hover:bg-navyMid disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
