'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Sparkles, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNextStep, getStepByRoute } from '@/lib/onboarding/steps'

const RESEARCH_GOALS = [
  'Clearer cash-flow explanations',
  'Trust calibration for AI guidance',
  'Plain-language risk reasoning',
]

export default function ResearchConsentPage() {
  const [agreed, setAgreed] = useState(false)
  const router = useRouter()

  const handleAccept = () => {
    if (!agreed) return
    const current = getStepByRoute('/onboarding/research-consent')
    const next = current ? getNextStep(current) : undefined
    if (next) router.push(next.route)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-bold tracking-tight text-navy">
        Research Participation &amp; Consent
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
        Your participation helps us study how AI-generated explanations affect
        understanding and trust in financial guidance. Anonymized responses
        improve how we communicate model outputs to future users.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
              Document: Research_Consent_V1
            </p>
            <p className="text-xs text-text-muted">Updated: May 2026</p>
          </div>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-text-primary">
            <section>
              <h2 className="mb-2 font-bold text-navy">
                1. Introduction to Participant Research
              </h2>
              <p>
                FinSight AI is conducting research on how SHAP-attributed and
                LLM-generated explanations influence user comprehension of, and
                trust in, algorithmic financial guidance. By participating, you
                agree that your assessment inputs, the model outputs you
                receive, and your reactions to those outputs may be used for
                this research.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-navy">
                2. Data Privacy &amp; Anonymization
              </h2>
              <p>
                All research data is stripped of personally identifiable
                information before it enters our analytical environment.
                Responses are linked to a research ID, not to your name or
                email. Aggregate findings may be reported in academic
                publications; individual responses will not be.
              </p>
            </section>

            <section>
              <h2 className="mb-2 font-bold text-navy">
                3. Voluntariness &amp; Withdrawal
              </h2>
              <p>
                Your participation is voluntary. You may opt out of the
                research at any time without affecting your access to the
                tool. To withdraw, contact the research team and your data
                will be removed from future analysis.
              </p>
            </section>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-xl border-l-4 border-mint bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-navy">
              <Sparkles className="h-4 w-4 text-mint" />
              <p className="text-sm font-bold">Privacy Insight</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Responses are tied to a research ID, never to your identity. PII
              is removed before any model or report sees the data.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-mint">
                Verified Secure
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
              Research Goals
            </p>
            <ul className="mt-3 space-y-2">
              {RESEARCH_GOALS.map((goal) => (
                <li key={goal} className="flex items-start gap-2 text-sm text-text-primary">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mint/20">
                    <Check className="h-3 w-3 text-mint" />
                  </span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="mt-10 max-w-2xl">
        <label className="flex items-start gap-3 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy"
          />
          I have read and agree to the research participation terms.
        </label>

        <div className="mt-6 flex items-center gap-6">
          <Button
            type="button"
            onClick={handleAccept}
            disabled={!agreed}
            className="h-12 gap-2 rounded-full bg-navy px-6 text-sm font-semibold text-white hover:bg-navyMid disabled:cursor-not-allowed disabled:opacity-40"
          >
            Accept &amp; Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Link
            href="/login"
            className="text-sm font-medium text-text-secondary hover:text-navy"
          >
            Decline
          </Link>
        </div>

        <p className="mt-6 text-xs text-text-muted">
          By continuing, you confirm that you have read our{' '}
          <span className="underline">Data Protection Policy</span> and{' '}
          <span className="underline">Cookie Usage Disclosure</span>.
        </p>
      </div>
    </div>
  )
}
