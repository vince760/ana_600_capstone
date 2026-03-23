import Link from 'next/link'
import { TrendingUp, ShieldCheck, BarChart3, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy">
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-teal" />
          <span className="text-xl font-bold text-white">FinSight AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-text-muted hover:text-white">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-teal font-semibold text-white hover:bg-tealLight">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-20 text-center md:py-32">
        <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl">
          Your finances,{' '}
          <span className="text-teal">clearly understood.</span>
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-lg text-text-muted">
          FinSight AI analyzes your spending, forecasts your cash flow, and
          provides personalized risk assessments — all powered by machine
          learning models you can trust.
        </p>

        <Link href="/signup">
          <Button
            size="lg"
            className="bg-teal px-8 py-6 text-lg font-semibold text-white hover:bg-tealLight"
          >
            Get Started — It&apos;s Free
          </Button>
        </Link>

        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl border border-navyMid2 bg-navyMid p-8 text-left transition-transform hover:-translate-y-1">
            <BarChart3 className="mb-4 h-10 w-10 text-teal" />
            <h3 className="mb-2 text-lg font-bold text-white">
              Smart Forecasting
            </h3>
            <p className="text-sm text-text-muted">
              30, 60, and 90-day cash flow projections using ensemble ML models
              with Monte Carlo confidence intervals.
            </p>
          </div>

          <div className="rounded-xl border border-navyMid2 bg-navyMid p-8 text-left transition-transform hover:-translate-y-1">
            <ShieldCheck className="mb-4 h-10 w-10 text-gold" />
            <h3 className="mb-2 text-lg font-bold text-white">
              Risk Assessment
            </h3>
            <p className="text-sm text-text-muted">
              Transparent risk scoring with SHAP explanations so you understand
              exactly what drives your financial risk.
            </p>
          </div>

          <div className="rounded-xl border border-navyMid2 bg-navyMid p-8 text-left transition-transform hover:-translate-y-1">
            <Brain className="mb-4 h-10 w-10 text-mint" />
            <h3 className="mb-2 text-lg font-bold text-white">
              AI Assistant
            </h3>
            <p className="text-sm text-text-muted">
              Ask questions about your finances in plain language and get
              data-grounded answers with actionable recommendations.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
