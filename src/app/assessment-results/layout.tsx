export const dynamic = 'force-dynamic'

import { HelpCircle } from 'lucide-react'
import { OnboardingSidebar } from '@/components/onboarding/onboarding-sidebar'
import { AccountMenu } from '@/components/auth/account-menu'

export default function AssessmentResultsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <OnboardingSidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-6 border-b border-slate-200 bg-white px-8 py-5">
          <div className="flex flex-1 items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
              Step 09
            </span>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-navy"
                style={{ width: '100%' }}
              />
            </div>
            <span className="text-xs font-medium text-text-muted">9 of 9</span>
          </div>

          <div className="flex items-center gap-3 text-text-muted">
            <button
              type="button"
              aria-label="Help"
              className="rounded-full p-1 transition-colors hover:bg-slate-100 hover:text-navy"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <AccountMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-10 lg:px-16 lg:py-12">
          {children}
        </main>
        <footer className="border-t border-slate-200 px-8 py-4 text-center text-xs text-text-muted">
          &copy; 2026 FinSight AI &mdash; Research Division
        </footer>
      </div>
    </div>
  )
}
