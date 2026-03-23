import { MetricsRow } from '@/components/dashboard/metrics-row'
import { ForecastChart } from '@/components/dashboard/forecast-chart'
import { RiskCard } from '@/components/dashboard/risk-card'
import { GoalCard } from '@/components/dashboard/goal-card'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Dashboard</h1>
          <p className="text-xs text-text-muted">March 2026</p>
        </div>
      </div>

      <MetricsRow />

      <ForecastChart />

      <div className="grid gap-6 md:grid-cols-2">
        <RiskCard />
        <GoalCard />
      </div>

      <RecentTransactions />
    </div>
  )
}
