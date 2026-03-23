'use client'

import Link from 'next/link'
import { ArrowRight, Target } from 'lucide-react'
import { mockGoal } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

export function GoalCard() {
  const { label, targetAmount, currentAmount, projectedDate, targetDate } = mockGoal
  const progress = (currentAmount / targetAmount) * 100

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
        Goal Progress
      </p>

      <div className="mt-4 flex items-start gap-3">
        <div className="rounded-lg bg-teal/10 p-2.5">
          <Target className="h-5 w-5 text-teal" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-navy">{label}</p>
          <p className="text-xs text-text-secondary">
            {formatCurrency(currentAmount)} of {formatCurrency(targetAmount)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-teal transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-text-muted">
          <span>{Math.round(progress)}% complete</span>
          <span>
            Projected:{' '}
            {new Date(projectedDate).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <Link
        href="/simulator"
        className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal hover:text-tealLight"
      >
        Run a scenario
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
