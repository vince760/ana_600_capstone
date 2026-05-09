'use client'

import { usePathname } from 'next/navigation'
import { HelpCircle, UserCircle2 } from 'lucide-react'
import { ONBOARDING_STEPS, TOTAL_STEPS } from '@/lib/onboarding/steps'

export function OnboardingProgress() {
  const pathname = usePathname()
  const currentStep = ONBOARDING_STEPS.find((s) => s.route === pathname)
  const stepIndex = currentStep?.index ?? 1
  const percent = Math.round((stepIndex / TOTAL_STEPS) * 100)
  const stepLabel = `Step ${String(stepIndex).padStart(2, '0')}`

  return (
    <header className="flex items-center gap-6 border-b border-slate-200 bg-white px-8 py-5">
      <div className="flex flex-1 items-center gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          {stepLabel}
        </span>
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-navy transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs font-medium text-text-muted">
          {stepIndex} of {TOTAL_STEPS}
        </span>
      </div>

      <div className="flex items-center gap-3 text-text-muted">
        <button
          type="button"
          aria-label="Help"
          className="rounded-full p-1 transition-colors hover:bg-slate-100 hover:text-navy"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Account"
          className="rounded-full p-1 transition-colors hover:bg-slate-100 hover:text-navy"
        >
          <UserCircle2 className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
