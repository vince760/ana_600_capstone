'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrendingUp, BarChart3, ShieldCheck, Brain } from 'lucide-react'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    })

    if (error) {
      setError('Could not create account. Please try again.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-sm space-y-6 px-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-7 w-7 text-teal" />
            <span className="text-xl font-bold text-navy">FinSight AI</span>
          </div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint/10">
            <svg className="h-8 w-8 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-navy">Check your email</h2>
          <p className="text-sm text-text-secondary">
            We&apos;ve sent you a confirmation link. Click it to activate your account.
          </p>
          <Link href="/login">
            <Button className="mt-2 h-11 w-full bg-teal font-semibold text-white hover:bg-tealLight">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-navy p-12 lg:flex">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-teal" />
          <span className="text-xl font-bold text-white">FinSight AI</span>
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-bold leading-tight text-white">
            Understand your finances.<br />
            Make better decisions.
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-teal/10 p-2">
                <BarChart3 className="h-5 w-5 text-teal" />
              </div>
              <div>
                <p className="font-semibold text-white">Cash Flow Forecasting</p>
                <p className="text-sm text-text-muted">Weekly projected balances, savings buffer, burn rate</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-teal/10 p-2">
                <ShieldCheck className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="font-semibold text-white">Risk Prediction</p>
                <p className="text-sm text-text-muted">Financial distress probability with SHAP-attributed drivers</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-teal/10 p-2">
                <Brain className="h-5 w-5 text-mint" />
              </div>
              <div>
                <p className="font-semibold text-white">Explainable AI Guidance</p>
                <p className="text-sm text-text-muted">Plain-language recommendations you can act on</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          An explainable AI financial assistant for consumer decision-making.
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden mb-8 flex items-center justify-center gap-2">
            <TrendingUp className="h-7 w-7 text-teal" />
            <span className="text-xl font-bold text-navy">FinSight AI</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-navy">Create your account</h1>
            <p className="mt-1 text-sm text-text-secondary">Get started with AI-powered financial guidance</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-navy">
                Full Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                required
                className="h-11 border-gray-200 bg-gray-50 text-navy placeholder:text-text-muted focus:border-teal focus:ring-teal"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-navy">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-11 border-gray-200 bg-gray-50 text-navy placeholder:text-text-muted focus:border-teal focus:ring-teal"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-navy">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
                className="h-11 border-gray-200 bg-gray-50 text-navy placeholder:text-text-muted focus:border-teal focus:ring-teal"
              />
            </div>

            {error && (
              <p className="text-sm text-risk-high">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-teal text-sm font-semibold text-white hover:bg-tealLight"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-teal hover:text-tealLight">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
