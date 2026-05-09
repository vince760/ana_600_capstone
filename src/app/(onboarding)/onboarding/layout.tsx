import { OnboardingSidebar } from '@/components/onboarding/onboarding-sidebar'
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress'

export const dynamic = 'force-dynamic'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <OnboardingSidebar />
      <div className="flex flex-1 flex-col">
        <OnboardingProgress />
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
