'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TrendingUp, BarChart3, ShieldCheck, Brain } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
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
            <h1 className="text-2xl font-bold text-navy">Welcome back</h1>
            <p className="mt-1 text-sm text-text-secondary">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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
                placeholder="Enter your password"
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
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-teal hover:text-tealLight">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
