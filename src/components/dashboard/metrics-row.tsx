'use client'

import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Shield, Flame } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { mockDashboardMetrics } from '@/lib/mock-data'

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  trend?: number
  icon: React.ReactNode
  positive?: boolean
  accentColor: string
}

function MetricCard({ label, value, subtext, trend, icon, positive, accentColor }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
          {label}
        </p>
        <div className={`rounded-lg p-2 ${accentColor}`}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold text-navy">{value}</p>
      <div className="mt-1.5 flex items-center gap-1">
        {trend !== undefined && (
          <>
            {trend >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-mint" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-risk-high" />
            )}
            <span
              className={`text-xs font-semibold ${
                trend >= 0 ? 'text-mint' : 'text-risk-high'
              }`}
            >
              {trend >= 0 ? '+' : ''}{Math.abs(trend)}%
            </span>
          </>
        )}
        {positive !== undefined && trend === undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              positive ? 'bg-mint/10 text-mint' : 'bg-risk-high/10 text-risk-high'
            }`}
          >
            {positive ? 'Surplus' : 'Deficit'}
          </span>
        )}
        {subtext && (
          <span className="text-xs text-text-muted">{subtext}</span>
        )}
      </div>
    </div>
  )
}

export function MetricsRow() {
  const m = mockDashboardMetrics

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard
        label="Projected Balance"
        value={formatCurrency(m.weeklyProjectedBalance.value)}
        trend={m.weeklyProjectedBalance.trend}
        icon={<Wallet className="h-4 w-4 text-teal" />}
        accentColor="bg-teal/10"
      />
      <MetricCard
        label="Monthly Cash Flow"
        value={formatCurrency(m.monthlyCashFlow.value)}
        positive={m.monthlyCashFlow.isPositive}
        icon={<TrendingUp className="h-4 w-4 text-mint" />}
        accentColor="bg-mint/10"
      />
      <MetricCard
        label="Savings Buffer"
        value={`${m.savingsBuffer.value}`}
        subtext={m.savingsBuffer.unit}
        icon={<Shield className="h-4 w-4 text-gold" />}
        accentColor="bg-gold/10"
      />
      <MetricCard
        label="Burn Rate"
        value={formatCurrency(m.burnRate.value)}
        subtext={m.burnRate.unit}
        icon={<Flame className="h-4 w-4 text-risk-high" />}
        accentColor="bg-risk-high/10"
      />
    </div>
  )
}
