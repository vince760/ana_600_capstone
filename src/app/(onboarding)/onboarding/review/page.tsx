'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Pencil,
  ShieldAlert,
  Sparkles,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getPrevStep,
  getStepByRoute,
} from '@/lib/onboarding/steps'

interface SummaryRow {
  label: string
  value: string
}

interface SummaryCardProps {
  title: string
  icon: typeof Coins
  rows: SummaryRow[]
  onEdit: () => void
}

function SummaryCard({ title, icon: Icon, rows, onEdit }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-navy" />
          <h3 className="text-sm font-bold text-navy">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-navy"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
              {row.label}
            </dt>
            <dd className="mt-1 text-lg font-bold text-navy">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

interface ExpenseColumnProps {
  label: string
  items: SummaryRow[]
}

function ExpenseColumn({ label, items }: ExpenseColumnProps) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
        {label}
      </p>
      <ul className="mt-3 space-y-2.5 text-sm">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between"
          >
            <span className="text-text-secondary">{item.label}</span>
            <span className="font-semibold text-navy">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function ReviewPage() {
  const router = useRouter()
  const current = getStepByRoute('/onboarding/review')
  const prev = current ? getPrevStep(current) : undefined

  const handleSubmit = () => {
    router.push('/assessment-results')
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
          onEdit={() => router.push('/onboarding/income-debt')}
          rows={[
            { label: 'Annual Gross Income', value: '$185,000.00' },
            { label: 'Liquid Liquidity', value: '$42,300.00' },
            { label: 'Retirement Assets', value: '$298,500.00' },
            { label: 'Secondary Income', value: '$12,000.00' },
          ]}
        />

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
          onEdit={() => router.push('/onboarding/income-debt')}
          rows={[
            { label: 'Mortgage Balance', value: '$420,000.00' },
            { label: 'Active Debt Services', value: '$4,200.00/mo' },
          ]}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-navy" />
              <h3 className="text-sm font-bold text-navy">Capital Outflow</h3>
            </div>
            <button
              type="button"
              onClick={() => router.push('/onboarding/savings-spending')}
              className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-navy"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <ExpenseColumn
              label="Core Expenses"
              items={[
                { label: 'Housing & Utils', value: '$3,100' },
                { label: 'Transportation', value: '$850' },
                { label: 'Insurance Prem.', value: '$420' },
              ]}
            />
            <ExpenseColumn
              label="Discretionary"
              items={[
                { label: 'Leisure & Dining', value: '$1,200' },
                { label: 'Professional Growth', value: '$300' },
                { label: 'Subscription Matrix', value: '$180' },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 max-w-3xl rounded-xl border-l-4 border-gold bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <div>
            <p className="text-sm font-bold text-navy">Snapshot</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Debt-to-Income is currently{' '}
              <span className="font-semibold text-navy">31%</span>, which is
              within a healthy institutional range.
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
          className="h-12 gap-2 rounded-full bg-navy px-6 text-sm font-semibold text-white hover:bg-navyMid"
        >
          Submit Assessment
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
