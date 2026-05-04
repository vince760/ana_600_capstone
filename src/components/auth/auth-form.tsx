'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FIRST_ONBOARDING_ROUTE } from '@/lib/onboarding/steps'

type AuthMode = 'login' | 'signup'

interface AuthFormProps {
  mode: AuthMode
}

export function AuthForm({ mode }: AuthFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isSignup = mode === 'signup'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) {
        setError('Could not create account. Please try again.')
        setLoading(false)
        return
      }
      setSignupSuccess(true)
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }
    router.push(FIRST_ONBOARDING_ROUTE)
    router.refresh()
  }

  if (signupSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
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
            <Button className="mt-2 h-11 w-full rounded-full bg-navy font-semibold text-white hover:bg-navyMid">
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col bg-navy p-12 lg:flex">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-teal" />
          <span className="text-xl font-bold text-white">FinSight AI</span>
        </div>

        <div className="flex flex-1 items-center">
          <h2 className="text-5xl font-bold leading-[1.1] tracking-tight text-white">
            Redefining the<br />
            <span className="text-mint">standard</span> of personal<br />
            finance.
          </h2>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm space-y-6">
          <div className="mb-2 flex items-center justify-center gap-2 lg:hidden">
            <TrendingUp className="h-7 w-7 text-teal" />
            <span className="text-xl font-bold text-navy">FinSight AI</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-navy">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              {isSignup
                ? 'Start your journey toward clearer financial decisions.'
                : 'Sign in to continue your onboarding.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="block text-[11px] font-bold uppercase tracking-widest text-text-secondary"
                >
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                  className="h-11 border-slate-200 bg-slate-100 text-navy placeholder:text-text-muted focus-visible:border-teal focus-visible:ring-teal/30"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-widest text-text-secondary"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="h-11 border-slate-200 bg-slate-100 text-navy placeholder:text-text-muted focus-visible:border-teal focus-visible:ring-teal/30"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-widest text-text-secondary"
                >
                  Password
                </label>
                {isSignup && (
                  <span className="text-[11px] font-medium text-text-secondary">
                    Strong Requirement
                  </span>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
                minLength={isSignup ? 6 : undefined}
                required
                className="h-11 border-slate-200 bg-slate-100 text-navy placeholder:text-text-muted focus-visible:border-teal focus-visible:ring-teal/30"
              />
            </div>

            {error && <p className="text-sm text-risk-high">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-navy text-sm font-semibold text-white hover:bg-navyMid"
            >
              {loading
                ? isSignup
                  ? 'Creating account...'
                  : 'Signing in...'
                : isSignup
                ? 'Create account'
                : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link
              href={isSignup ? '/login' : '/signup'}
              className="font-semibold text-navy hover:underline"
            >
              {isSignup ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

