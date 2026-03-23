import Link from 'next/link'
import {
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Brain,
  Lock,
  Upload,
  LineChart,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-teal" />
            <span className="text-lg font-bold text-navy">FinSight AI</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#intelligence" className="text-sm font-medium text-text-secondary hover:text-navy">
              Intelligence
            </a>
            <a href="#features" className="text-sm font-medium text-text-secondary hover:text-navy">
              Features
            </a>
            <a href="#security" className="text-sm font-medium text-text-secondary hover:text-navy">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-sm text-text-secondary hover:text-navy">
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-teal text-sm font-semibold text-white hover:bg-tealLight">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-navy md:text-5xl lg:text-6xl">
                Quietly Intelligent.{' '}
                <span className="text-teal">Personally Powerful.</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-text-secondary">
                The platform for smarter financial clarity. Not a robo-advisor.
                Just AI that&apos;s built to actually help you make confident,
                informed decisions with personalized clarity.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup">
                  <Button className="h-12 bg-[#6FFBBE] px-6 text-sm font-semibold text-navy hover:bg-[#5EEAAD]">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    className="h-12 border border-gray-300 bg-white px-6 text-sm font-semibold text-navy shadow-sm hover:bg-gray-50"
                  >
                    View Demo
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="relative rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
                        Portfolio Rebalancing Opportunity
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-mint/10 p-1.5">
                        <TrendingUp className="h-4 w-4 text-mint" />
                      </div>
                      <div className="rounded-lg bg-gray-100 p-1.5">
                        <BarChart3 className="h-4 w-4 text-text-muted" />
                      </div>
                    </div>
                  </div>

                  {/* Chart area with SVG line */}
                  <div className="relative h-36 overflow-hidden rounded-lg bg-gray-50">
                    <svg viewBox="0 0 400 120" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#028090" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#028090" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,80 C30,75 60,60 100,55 C140,50 170,65 200,45 C230,25 260,35 300,20 C340,10 370,15 400,8 L400,120 L0,120 Z" fill="url(#chartGrad)" />
                      <path d="M0,80 C30,75 60,60 100,55 C140,50 170,65 200,45 C230,25 260,35 300,20 C340,10 370,15 400,8" fill="none" stroke="#028090" strokeWidth="2.5" />
                      <circle cx="300" cy="20" r="4" fill="#028090" stroke="#fff" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Description */}
                  <p className="text-xs leading-relaxed text-text-secondary">
                    Based on your current spending of <span className="font-semibold text-navy">$3,200/mo</span>,
                    your projected savings trajectory shows a <span className="font-semibold text-mint">+12%</span> improvement
                    with the recommended adjustments.
                  </p>

                  {/* Stats row */}
                  <div className="flex gap-2">
                    <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-text-muted">Projected Balance</p>
                      <p className="text-lg font-bold text-navy">$4,580</p>
                      <p className="text-xs font-semibold text-mint">+3.2%</p>
                    </div>
                    <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs text-text-muted">Risk Score</p>
                      <p className="text-lg font-bold text-navy">62</p>
                      <p className="text-xs text-gold">Medium</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating card - top right */}
              <div className="absolute -right-6 -top-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-full bg-mint/10 p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-mint" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-navy">Smart Allocation</p>
                    <p className="text-xs text-text-muted">Confidence: <span className="font-semibold text-mint">94%</span></p>
                  </div>
                </div>
              </div>

              {/* Floating card - bottom left */}
              <div className="absolute -bottom-3 -left-6 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-full bg-teal/10 p-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-navy">Goal On Track</p>
                    <p className="text-xs text-text-muted">Emergency Fund: <span className="font-semibold text-teal">56%</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence Hub */}
      <section id="intelligence" className="border-t border-gray-100 bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy md:text-4xl">The Intelligence Hub</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-text-secondary">
              A single platform that connects your financial data to machine learning models,
              so every decision you make is grounded in data.
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-14 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-gray-200" />
                <div className="h-3 w-3 rounded-full bg-gray-200" />
                <div className="h-3 w-3 rounded-full bg-gray-200" />
              </div>
            </div>
            <div className="p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-text-muted">Projected Balance</p>
                  <p className="mt-1 text-xl font-bold text-navy">$4,580</p>
                  <p className="mt-1 text-xs font-semibold text-mint">+3.2%</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-text-muted">Monthly Cash Flow</p>
                  <p className="mt-1 text-xl font-bold text-navy">$1,240</p>
                  <p className="mt-1 text-xs font-semibold text-mint">Surplus</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-text-muted">Savings Buffer</p>
                  <p className="mt-1 text-xl font-bold text-navy">2.4</p>
                  <p className="mt-1 text-xs text-text-muted">months</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-text-muted">Risk Score</p>
                  <p className="mt-1 text-xl font-bold text-gold">62</p>
                  <p className="mt-1 text-xs text-text-muted">Medium</p>
                </div>
              </div>
              {/* Chart header */}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
                  Portfolio Rebalancing Opportunity
                </p>
                <div className="flex gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
                  <span className="rounded-md bg-teal px-2.5 py-1 text-xs font-semibold text-white">30D</span>
                  <span className="rounded-md px-2.5 py-1 text-xs font-medium text-text-muted">60D</span>
                  <span className="rounded-md px-2.5 py-1 text-xs font-medium text-text-muted">90D</span>
                </div>
              </div>

              {/* SVG Chart */}
              <div className="relative mt-3 h-48 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                <svg viewBox="0 0 800 180" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="hubChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#028090" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#028090" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line x1="0" y1="45" x2="800" y2="45" stroke="#E2E8F0" strokeWidth="0.5" />
                  <line x1="0" y1="90" x2="800" y2="90" stroke="#E2E8F0" strokeWidth="0.5" />
                  <line x1="0" y1="135" x2="800" y2="135" stroke="#E2E8F0" strokeWidth="0.5" />
                  {/* Confidence band */}
                  <path d="M0,100 C80,95 160,80 240,75 C320,70 400,85 480,60 C560,40 640,50 720,30 C760,22 800,25 800,20 L800,60 C760,52 720,60 640,80 C560,70 480,90 400,110 C320,100 240,105 160,110 C80,120 0,130 0,130 Z" fill="#C8A84B" fillOpacity="0.08" />
                  {/* Area fill */}
                  <path d="M0,110 C80,105 160,90 240,85 C320,80 400,95 480,70 C560,50 640,58 720,40 C760,32 800,35 800,30 L800,180 L0,180 Z" fill="url(#hubChartGrad)" />
                  {/* Main line */}
                  <path d="M0,110 C80,105 160,90 240,85 C320,80 400,95 480,70 C560,50 640,58 720,40 C760,32 800,35 800,30" fill="none" stroke="#028090" strokeWidth="2.5" />
                  {/* Safety threshold */}
                  <line x1="0" y1="135" x2="800" y2="135" stroke="#E05252" strokeWidth="1" strokeDasharray="8 4" />
                  {/* Data points */}
                  <circle cx="0" cy="110" r="3" fill="#028090" stroke="#fff" strokeWidth="2" />
                  <circle cx="160" cy="90" r="3" fill="#028090" stroke="#fff" strokeWidth="2" />
                  <circle cx="320" cy="80" r="3" fill="#028090" stroke="#fff" strokeWidth="2" />
                  <circle cx="480" cy="70" r="3" fill="#028090" stroke="#fff" strokeWidth="2" />
                  <circle cx="640" cy="58" r="3" fill="#028090" stroke="#fff" strokeWidth="2" />
                  <circle cx="800" cy="30" r="4" fill="#028090" stroke="#fff" strokeWidth="2" />
                </svg>
                {/* Y-axis labels */}
                <div className="absolute left-3 top-0 flex h-full flex-col justify-between py-3 text-[10px] text-text-muted">
                  <span>$6k</span>
                  <span>$5k</span>
                  <span>$4k</span>
                  <span>$3k</span>
                </div>
              </div>

              {/* Description below chart */}
              <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                Based on your current spending of <span className="font-semibold text-navy">$3,200/mo</span> and an income trajectory of
                <span className="font-semibold text-navy"> $5,700/mo</span>, your projected balance shows a steady upward trend. The
                <span className="font-semibold text-teal"> teal line</span> represents median projections across
                <span className="font-semibold text-navy"> 10,000 Monte Carlo simulations</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <ShieldCheck className="h-6 w-6 text-teal" />
              </div>
              <h3 className="text-lg font-bold text-navy">Risk Prediction</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Understand your financial risk through transparent scoring with
                SHAP-attributed drivers. See exactly what factors increase or
                decrease your risk.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
                <BarChart3 className="h-6 w-6 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-navy">Smart Transactions</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                AI-powered transaction categorization using NLP models.
                Your spending is automatically organized and analyzed for
                patterns and insights.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10">
                <Brain className="h-6 w-6 text-mint" />
              </div>
              <h3 className="text-lg font-bold text-navy">Guided Intelligence</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Plain-language AI explanations that translate complex model
                outputs into actionable recommendations you can understand
                and act on.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-t border-gray-100 bg-gray-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal">
                Security & Privacy
              </p>
              <h2 className="mt-3 text-3xl font-bold text-navy md:text-4xl">
                Bank-Grade Security.{' '}
                <span className="text-text-secondary">Institutional Trust.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-secondary">
                Your financial data is encrypted at rest and in transit. We use
                privacy-safe synthetic profiles for model validation, and no
                real user data is ever shared with third parties.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'End-to-end encryption for all data',
                  'No real user data used in model training',
                  'SOC 2 compliant infrastructure',
                  'You control your data - export or delete anytime',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-text-primary">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
                  <Lock className="mx-auto h-16 w-16 text-navy/20" />
                </div>
                <div className="absolute -bottom-3 -right-3 rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-mint" />
                    <span className="text-xs font-semibold text-navy">256-bit encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Steps */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy md:text-4xl">Three Steps to Clarity</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-text-secondary">
              From raw data to actionable insight in minutes.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
                1
              </div>
              <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10">
                <Upload className="h-6 w-6 text-teal" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-navy">Prepare</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Upload your bank statement (CSV or Excel).
                Our AI categorizes every transaction automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
                2
              </div>
              <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
                <LineChart className="h-6 w-6 text-gold" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-navy">Analyze</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Machine learning models forecast your cash flow,
                assess risk, and run Monte Carlo simulations.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-lg font-bold text-white">
                3
              </div>
              <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-mint/10">
                <Lightbulb className="h-6 w-6 text-mint" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-navy">Act</h3>
              <p className="mt-2 text-sm text-text-secondary">
                Get plain-language guidance, test scenarios,
                and make financial decisions with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-navy py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Ready for true financial intelligence?
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup">
              <Button className="h-12 bg-[#6FFBBE] px-8 text-sm font-semibold text-navy hover:bg-[#5EEAAD]">
                Start Your Free Trial
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                className="h-12 border-navyMid2 px-8 text-sm font-semibold text-white hover:bg-navyMid"
              >
                Log In Instead
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal" />
            <span className="text-sm font-bold text-navy">FinSight AI</span>
          </div>
          <p className="text-xs text-text-muted">
            For informational purposes only. Not a licensed financial advisor.
          </p>
        </div>
      </footer>
    </div>
  )
}
