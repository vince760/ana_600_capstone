'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Info, ShoppingCart, UtensilsCrossed, Sparkles } from 'lucide-react'
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
  icon: typeof Info
  placeholder: string
}

const FIELDS: FieldConfig[] = [
  {
    id: 'liquid-assets',
    label: 'Liquid Assets (Cash, Savings, etc.)',
    icon: Info,
    placeholder: '0.00',
  },
  {
    id: 'grocery',
    label: 'Average Monthly Grocery Spend',
    icon: ShoppingCart,
    placeholder: '0.00',
  },
  {
    id: 'dining',
    label: 'Average Monthly Dining & Takeout Spend',
    icon: UtensilsCrossed,
    placeholder: '0.00',
  },
]

export default function SavingsSpendingPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const router = useRouter()

  const current = getStepByRoute('/onboarding/savings-spending')
  const next = current ? getNextStep(current) : undefined
  const prev = current ? getPrevStep(current) : undefined

  const isValid = FIELDS.every((f) => values[f.id] && Number(values[f.id]) >= 0)

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-bold tracking-tight text-navy">
        Savings &amp; Spending
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
        Understanding your cash flow and liquidity lets us calibrate your risk
        profile and surface the spending categories that move your forecast
        the most.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          {FIELDS.map((field) => {
            const Icon = field.icon
            return (
              <div
                key={field.id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={field.id}
                    className="text-sm font-semibold text-navy"
                  >
                    {field.label}
                  </label>
                  <Icon className="h-4 w-4 text-text-muted" />
                </div>
                <div className="relative mt-3">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                    $
                  </span>
                  <Input
                    id={field.id}
                    type="number"
                    min={0}
                    step="0.01"
                    value={values[field.id] ?? ''}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [field.id]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="h-12 border-slate-200 bg-slate-100 pl-7 text-base text-navy placeholder:text-text-muted focus-visible:border-teal focus-visible:ring-teal/30"
                  />
                </div>
              </div>
            )
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border-l-4 border-mint bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-mint">
              <Sparkles className="h-4 w-4" />
              <p className="text-[11px] font-bold uppercase tracking-widest">
                Smart Insight
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Households similar to yours typically maintain{' '}
              <span className="font-semibold text-navy">3-6 months</span> of
              expenses in liquid assets to stay stable through income gaps.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-sm font-bold text-navy">Why this matters</p>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Accurate cash-flow data lets us identify surplus capital that
              could be working harder for you, and helps the model explain
              which discretionary categories are driving your risk score.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex items-center justify-between">
        {prev ? (
          <button
            type="button"
            onClick={() => router.push(prev.route)}
            className="text-sm font-medium text-text-secondary hover:text-navy"
          >
            &larr; Back
          </button>
        ) : (
          <span />
        )}

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
