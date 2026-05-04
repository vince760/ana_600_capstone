'use client'

import { usePathname } from 'next/navigation'
import {
  TrendingUp,
  ShieldCheck,
  Microscope,
  Users,
  Wallet,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react'
import {
  ONBOARDING_SECTIONS,
  ONBOARDING_STEPS,
  type OnboardingSection,
} from '@/lib/onboarding/steps'
import { cn } from '@/lib/utils'

const SECTION_ICONS: Record<OnboardingSection, LucideIcon> = {
  Identity: ShieldCheck,
  Research: Microscope,
  Profile: Users,
  Finances: Wallet,
  Review: ClipboardCheck,
}

export function OnboardingSidebar() {
  const pathname = usePathname()
  const currentStep = ONBOARDING_STEPS.find((s) => s.route === pathname)
  const activeSection = currentStep?.section

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-6 lg:flex">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-teal" />
        <span className="text-lg font-bold text-navy">FinSight AI</span>
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/20 text-sm font-semibold text-mint">
          U
        </div>
        <div>
          <p className="text-sm font-semibold text-navy">Onboarding</p>
          <p className="text-xs text-text-muted">Verification Phase</p>
        </div>
      </div>

      <nav className="mt-8">
        <ul className="space-y-1">
          {ONBOARDING_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section]
            const isActive = activeSection === section
            return (
              <li key={section}>
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'border-l-2 border-navy bg-slate-50 font-semibold text-navy'
                      : 'text-text-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{section}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
