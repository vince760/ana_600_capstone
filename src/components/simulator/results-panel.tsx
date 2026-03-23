'use client'

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lightbulb, FlaskConical, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'

interface SimulationResult {
  scenarioName: string
  type: string
  goal: string
  summary: string
  debtFreeDate: string
  debtFreeMonths: number
  monthlySurplus: number
  monthlySurplusChange: number
  erFundMonths: number
  erFundChange: number
  goalProbability: number
  goalProbabilityChange: number
  baseline: { date: string; balance: number }[]
  trajectory: { date: string; balanceMedian: number; balanceLow: number; balanceHigh: number }[]
  milestones: { date: string; label: string }[]
  aiTakeaway?: string
}

interface ResultsPanelProps {
  result: SimulationResult | null
}

function StatCard({
  label,
  value,
  subValue,
  change,
  changeLabel,
  highlight,
}: {
  label: string
  value: string
  subValue?: string
  change?: number
  changeLabel?: string
  highlight?: boolean
}) {
  const isPositive = change !== undefined && change >= 0
  const isNegative = change !== undefined && change < 0

  return (
    <div className={`rounded-xl border p-4 ${
      highlight
        ? 'border-teal bg-teal/5'
        : 'border-gray-100 bg-white'
    } shadow-sm`}>
      <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${highlight ? 'text-teal' : 'text-navy'}`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-text-muted">{subValue}</p>
      )}
      {change !== undefined && (
        <div className="mt-1 flex items-center gap-1">
          {isPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-mint" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-risk-high" />
          )}
          <span className={`text-xs font-semibold ${isPositive ? 'text-mint' : 'text-risk-high'}`}>
            {isPositive ? '+' : ''}{changeLabel ?? change}
          </span>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4">
        <FlaskConical className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="text-lg font-bold text-navy">Run a Simulation</h3>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Adjust the variables on the left and click &quot;Run Simulation&quot; to see
        how your financial decisions could impact your goals over time.
      </p>
    </div>
  )
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  const [scenarioName, setScenarioName] = useState('')

  if (!result) {
    return <EmptyState />
  }

  if (scenarioName === '') {
    setScenarioName(result.scenarioName)
  }

  const chartData = result.trajectory.map((t, i) => ({
    date: t.date,
    balanceMedian: t.balanceMedian,
    balanceLow: t.balanceLow,
    balanceHigh: t.balanceHigh,
    baseline: result.baseline[i]?.balance ?? 0,
  }))

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="space-y-6">
        {/* Scenario Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
              Scenario Name
            </p>
            <Input
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="mt-1 h-auto border-0 bg-transparent p-0 text-xl font-bold text-navy shadow-none focus-visible:ring-0"
            />
            <div className="mt-1 flex items-center gap-3">
              <span className="text-xs text-text-muted">
                Type: <span className="font-medium text-navy">{result.type}</span>
              </span>
              <span className="text-xs text-text-muted">
                Goal: <span className="font-medium text-navy">{result.goal}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            Simulation Summary
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-primary">{result.summary}</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Debt-Free Date"
            value={result.debtFreeDate}
            change={result.debtFreeMonths}
            changeLabel={`${result.debtFreeMonths} Months`}
          />
          <StatCard
            label="Monthly Surplus"
            value={formatCurrency(result.monthlySurplus)}
            change={result.monthlySurplusChange}
            changeLabel={formatCurrency(result.monthlySurplusChange)}
          />
          <StatCard
            label="ER Fund Run"
            value={`${result.erFundMonths} mo`}
            change={result.erFundChange}
            changeLabel={`${result.erFundChange > 0 ? '+' : ''}${result.erFundChange} mo`}
          />
          <StatCard
            label="Goal Probability"
            value={`${result.goalProbability}%`}
            change={result.goalProbabilityChange}
            changeLabel={`${result.goalProbabilityChange > 0 ? '+' : ''}${result.goalProbabilityChange} Pts`}
            highlight
          />
        </div>

        {/* Chart */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-text-secondary">
            Projected Outcome
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickFormatter={(val: string) => {
                  const d = new Date(val)
                  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                }}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748B' }}
                tickFormatter={(val: number) => `$${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#334155',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
                formatter={(value) => [formatCurrency(Number(value)), '']}
                labelFormatter={(label) => {
                  const d = new Date(label)
                  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                }}
              />
              <Area
                type="monotone"
                dataKey="balanceHigh"
                stroke="none"
                fill="#C8A84B"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="balanceLow"
                stroke="none"
                fill="#C8A84B"
                fillOpacity={0.05}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#94A3B8"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="balanceMedian"
                stroke="#028090"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#028090', stroke: '#fff', strokeWidth: 2 }}
              />
              {result.milestones.map((ms) => (
                <ReferenceDot
                  key={ms.date}
                  x={ms.date}
                  y={chartData.find((d) => d.date === ms.date)?.balanceMedian ?? 0}
                  r={6}
                  fill="#028090"
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 bg-teal" />
              <span>Scenario</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-0.5 w-4 border-b border-dashed border-gray-400" />
              <span>Baseline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-4 rounded-sm bg-gold/20" />
              <span>Confidence Band</span>
            </div>
          </div>
        </div>

        {/* AI Takeaway */}
        {result.aiTakeaway && (
          <div className="rounded-xl border border-gray-100 border-l-4 border-l-gold bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-gold" />
              <p className="text-xs font-bold uppercase tracking-widest text-gold">
                AI Takeaway
              </p>
            </div>
            <p className="text-sm leading-relaxed text-text-primary">
              {result.aiTakeaway.split('**').map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}
            </p>
            <p className="mt-3 text-xs italic text-text-muted">
              AI-generated - not financial advice.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11 border-gray-200 text-sm font-semibold text-navy hover:bg-gray-50"
          >
            Apply to Financial Plan
          </Button>
          <Button className="flex-1 h-11 bg-teal text-sm font-semibold text-white hover:bg-tealLight">
            Run Another Scenario
          </Button>
        </div>
      </div>
    </div>
  )
}
