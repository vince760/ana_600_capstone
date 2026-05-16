import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChartLine,
  CircleDot,
  FlaskConical,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const coreOutcomes = [
  {
    title: 'A risk snapshot you can actually read',
    copy:
      'See a clear estimate of your financial strain, paired with a plain-language interpretation. No raw scores left for you to puzzle over.',
    icon: ShieldCheck,
    accent: 'text-teal',
    bg: 'bg-teal/10',
  },
  {
    title: 'The story behind the number',
    copy:
      'Every result is broken down into the factors that pushed it up or down, ranked by impact, so you can focus on what actually moves the needle.',
    icon: Sparkles,
    accent: 'text-gold',
    bg: 'bg-gold/10',
  },
  {
    title: 'Try the decision before you make it',
    copy:
      'Simulate paying down debt, changing savings, or absorbing a new expense, and see the projected effect on your outlook side by side.',
    icon: FlaskConical,
    accent: 'text-mint',
    bg: 'bg-mint/10',
  },
] as const

const processSteps = [
  {
    title: 'Share a quick financial baseline',
    description:
      'Walk through a guided onboarding covering household, income, debt, savings, and spending. Takes a few minutes, not an evening.',
  },
  {
    title: 'Get a model-backed assessment',
    description:
      'FinSight AI generates your projected risk estimate and pairs it with explanation layers built for non-technical readers.',
  },
  {
    title: 'Explore changes you might make',
    description:
      'Run scenarios, compare outcomes, and see how realistic adjustments could shift your projected trajectory.',
  },
] as const

const trustPoints = [
  {
    title: 'Explanation-first by design',
    copy: 'Every estimate is grounded in the factors driving it, so you never have to take a black-box result on faith.',
    icon: Lock,
  },
  {
    title: 'Educational decision support',
    copy: 'A learning and planning tool, not personalized investment or legal advice.',
    icon: BadgeCheck,
  },
  {
    title: 'Research-grounded methodology',
    copy: 'Built around a capstone study on whether explainable outputs improve user trust and comprehension.',
    icon: ChartLine,
  },
] as const

const sparkPoints = [22, 28, 26, 33, 31, 38, 42, 40, 45, 48, 52, 55] as const

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream text-text-primary">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-navy">FinSight AI</span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#what" className="text-sm font-medium text-text-secondary transition-colors hover:text-navy">
              What you get
            </a>
            <a href="#how" className="text-sm font-medium text-text-secondary transition-colors hover:text-navy">
              How it works
            </a>
            <a href="#trust" className="text-sm font-medium text-text-secondary transition-colors hover:text-navy">
              Why trust it
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="text-sm text-text-secondary hover:text-navy">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-teal text-sm font-semibold text-white hover:bg-tealLight">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navyMid to-[#0f2a45]">
        <div className="pointer-events-none absolute -right-32 -top-24 h-96 w-96 rounded-full bg-teal/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-mint/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 md:grid-cols-[1.05fr_1fr] md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-mint">
              <Sparkles className="h-3.5 w-3.5" />
              Explainable financial AI
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] text-white md:text-6xl">
              See your financial risk.{' '}
              <span className="bg-gradient-to-r from-mint to-[#6FFBBE] bg-clip-text text-transparent">
                Understand why.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
              FinSight AI turns your everyday financial picture into a clear assessment, ranks the
              factors driving it, and lets you test the changes you are actually considering - before
              you commit to any of them.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button className="h-12 bg-[#6FFBBE] px-6 text-sm font-semibold text-navy shadow-lg shadow-mint/20 hover:bg-[#5EEAAD]">
                  Start your assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 transition-colors hover:text-white"
              >
                See how it works
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-medium text-slate-400">
              <span className="inline-flex items-center gap-2">
                <CircleDot className="h-3 w-3 text-mint" />
                Free to use
              </span>
              <span className="inline-flex items-center gap-2">
                <CircleDot className="h-3 w-3 text-mint" />
                Educational decision support
              </span>
              <span className="inline-flex items-center gap-2">
                <CircleDot className="h-3 w-3 text-mint" />
                Built on explainable models
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-teal/30 via-mint/10 to-transparent blur-2xl" />
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section id="what" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-teal">What you get</p>
          <h2 className="mt-3 text-3xl font-bold text-navy md:text-4xl">
            Clarity at every step, not just a final score
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            Most tools hand you a number and walk away. FinSight AI is built to make the result
            understandable, the drivers visible, and the next step explorable.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {coreOutcomes.map((item) => (
            <article
              key={item.title}
              className="group relative rounded-2xl border border-border bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className={`inline-flex rounded-xl p-3 ${item.bg}`}>
                <item.icon className={`h-6 w-6 ${item.accent}`} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-navy">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="bg-navy py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-mint">How it works</p>
              <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                From a few inputs to a result you can act on
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                Three steps. Each one designed to keep you in the loop on what the model is doing
                and why.
              </p>
            </div>

            <ol className="relative space-y-5">
              {processSteps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-navyMid2 bg-navyMid p-6 transition-colors hover:border-teal/60"
                >
                  <div className="flex items-start gap-5">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal/15 text-base font-bold text-mint">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center">
          <div className="order-2 md:order-1">
            <p className="text-xs font-bold uppercase tracking-widest text-teal">
              Built for everyday decisions
            </p>
            <h2 className="mt-3 text-3xl font-bold text-navy md:text-4xl">
              Financial clarity for the choices you are weighing right now
            </h2>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              Whether you are thinking about a car, paying down a card, building a cushion, or just
              trying to picture the next few months, FinSight AI gives you a grounded view of the
              tradeoffs - in language you do not need a finance degree to read.
            </p>

            <ul className="mt-7 space-y-4">
              <ClarityPoint
                title="Plain-language explanations"
                copy="Every result comes with a written interpretation of what is driving it."
              />
              <ClarityPoint
                title="Side-by-side scenarios"
                copy="Compare two or three realistic versions of the same decision before committing."
              />
              <ClarityPoint
                title="No data on display you didn't share"
                copy="Your inputs power your assessment. You stay in control of what is included."
              />
            </ul>
          </div>

          <div className="order-1 md:order-2">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-border shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80&auto=format&fit=crop"
                alt="Person reviewing notes alongside a laptop while planning finances"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/10 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-widest text-mint">In your hands</p>
                <p className="mt-2 text-base font-semibold leading-snug text-white">
                  Numbers translated into decisions you can actually act on.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="trust" className="bg-cream py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-teal">Why trust it</p>
            <h2 className="mt-3 text-3xl font-bold text-navy md:text-4xl">
              Transparent by design, honest about scope
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {trustPoints.map((point) => (
              <article
                key={point.title}
                className="rounded-2xl border-l-4 border-teal bg-white p-6 shadow-sm"
              >
                <point.icon className="h-5 w-5 text-teal" />
                <h3 className="mt-3 text-base font-bold text-navy">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{point.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-navy py-20">
        <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-teal/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-mint/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Ready to see your financial snapshot?
            </h2>
            <p className="mt-3 max-w-xl text-base text-slate-300">
              Create an account and run your first explainable assessment in minutes.
            </p>
          </div>
          <Link href="/signup">
            <Button className="h-12 bg-[#6FFBBE] px-7 text-sm font-semibold text-navy shadow-lg shadow-mint/20 hover:bg-[#5EEAAD]">
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 text-xs text-text-muted md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-navy">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-teal">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold">FinSight AI</span>
          </div>
          <p>Educational decision-support prototype. Not investment or legal advice.</p>
        </div>
      </footer>
    </div>
  )
}

function ClarityPoint({ title, copy }: { title: string; copy: string }) {
  return (
    <li className="flex gap-4">
      <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal/10">
        <span className="h-2 w-2 rounded-full bg-teal" />
      </span>
      <div>
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{copy}</p>
      </div>
    </li>
  )
}

function DashboardPreview() {
  const score = 47
  const circumference = 2 * Math.PI * 42
  const offset = circumference - (score / 100) * circumference
  const maxSpark = Math.max(...sparkPoints)
  const minSpark = Math.min(...sparkPoints)
  const sparkPath = sparkPoints
    .map((v, i) => {
      const x = (i / (sparkPoints.length - 1)) * 100
      const y = 100 - ((v - minSpark) / (maxSpark - minSpark)) * 100
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
  const sparkArea = `${sparkPath} L 100 100 L 0 100 Z`

  return (
    <div className="relative rounded-3xl border border-white/15 bg-white/95 p-5 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Live preview
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-cream p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gold">Risk score</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="9" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#C8A84B"
                  strokeWidth="9"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-navy">{score}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-gold">
                  Medium
                </span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full w-[78%] rounded-full bg-teal" />
              </div>
              <p className="text-[10px] text-text-secondary">XGBoost · 0.78</p>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full w-[64%] rounded-full bg-mint" />
              </div>
              <p className="text-[10px] text-text-secondary">Random Forest · 0.64</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-cream p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal">
            Projected balance
          </p>
          <div className="mt-2">
            <p className="text-xl font-bold text-navy">$4,820</p>
            <p className="text-[10px] font-medium text-mint">+ $640 vs. last month</p>
          </div>
          <div className="mt-3 h-14 w-full">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#02C39A" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#02C39A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={sparkArea} fill="url(#sparkFill)" />
              <path d={sparkPath} fill="none" stroke="#028090" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border-l-4 border-gold bg-cream p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gold">Top drivers</p>
        <ul className="mt-2 space-y-2 text-xs text-text-primary">
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-risk-high" />
              Discretionary spending
            </span>
            <span className="font-semibold text-risk-high">+0.18</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-risk-high" />
              Debt-to-income ratio
            </span>
            <span className="font-semibold text-risk-high">+0.12</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-mint" />
              Emergency savings
            </span>
            <span className="font-semibold text-mint">-0.09</span>
          </li>
        </ul>
      </div>

      <p className="mt-4 text-[10px] italic text-text-muted">
        Sample preview. Your assessment uses your own inputs.
      </p>
    </div>
  )
}
