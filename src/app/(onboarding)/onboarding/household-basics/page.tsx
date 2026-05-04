'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, Home, Baby } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getNextStep,
  getPrevStep,
  getStepByRoute,
} from '@/lib/onboarding/steps'

export default function HouseholdBasicsPage() {
  const [primaryAge, setPrimaryAge] = useState('')
  const [childrenCount, setChildrenCount] = useState('')
  const router = useRouter()

  const current = getStepByRoute('/onboarding/household-basics')
  const next = current ? getNextStep(current) : undefined
  const prev = current ? getPrevStep(current) : undefined

  const isValid =
    primaryAge !== '' &&
    Number(primaryAge) >= 18 &&
    Number(primaryAge) <= 100 &&
    childrenCount !== '' &&
    Number(childrenCount) >= 0 &&
    Number(childrenCount) <= 20

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-bold tracking-tight text-navy">
        Household Basics
      </h1>
      <p className="mt-3 text-sm text-text-secondary">
        Tell us a bit about your current living situation.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <label
              htmlFor="primary-age"
              className="text-[11px] font-bold uppercase tracking-widest text-text-secondary"
            >
              Primary User Age
            </label>
            <Home className="h-4 w-4 text-text-muted" />
          </div>
          <Input
            id="primary-age"
            type="number"
            min={18}
            max={100}
            value={primaryAge}
            onChange={(e) => setPrimaryAge(e.target.value)}
            placeholder="18-100"
            className="mt-3 h-12 border-slate-200 bg-slate-100 text-base text-navy placeholder:text-text-muted focus-visible:border-teal focus-visible:ring-teal/30"
          />
          <p className="mt-3 text-xs text-text-muted">
            Enter the age of the primary account holder for risk assessment.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <label
              htmlFor="children-count"
              className="text-[11px] font-bold uppercase tracking-widest text-text-secondary"
            >
              Children Under 18
            </label>
            <Baby className="h-4 w-4 text-text-muted" />
          </div>
          <Input
            id="children-count"
            type="number"
            min={0}
            max={20}
            value={childrenCount}
            onChange={(e) => setChildrenCount(e.target.value)}
            placeholder="0-20"
            className="mt-3 h-12 border-slate-200 bg-slate-100 text-base text-navy placeholder:text-text-muted focus-visible:border-teal focus-visible:ring-teal/30"
          />
          <p className="mt-3 text-xs text-text-muted">
            Include all legal dependents currently living in your household.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-start gap-3 rounded-xl border-l-4 border-mint bg-white p-4 shadow-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
          <div>
            <p className="text-sm font-bold text-navy">Why we ask</p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Household composition helps us refine your fiscal safety net and
              education-related savings projections.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {prev && (
            <button
              type="button"
              onClick={() => router.push(prev.route)}
              className="text-sm font-medium text-text-secondary hover:text-navy"
            >
              &larr; Back
            </button>
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
    </div>
  )
}
