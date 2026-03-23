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
  ReferenceLine,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { WeeklyForecast } from '@/types'

interface ForecastDetailChartProps {
  data: WeeklyForecast[]
}

export function ForecastDetailChart({ data }: ForecastDetailChartProps) {
  const safetyThreshold = 3400

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <ResponsiveContainer width="100%" height={380}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="weekStart"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickFormatter={(val: string) => {
              const d = new Date(val)
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickFormatter={(val: number) => `$${(val / 1000).toFixed(1)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                projectedBalance: 'Projected Balance',
                projectedBalanceHigh: '90th Percentile',
                projectedBalanceLow: '10th Percentile',
              }
              return [formatCurrency(Number(value)), labels[String(name)] ?? name]
            }}
            labelFormatter={(label) => {
              const d = new Date(label)
              return `Week of ${d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}`
            }}
          />
          <Area
            type="monotone"
            dataKey="projectedBalanceHigh"
            stroke="none"
            fill="#C8A84B"
            fillOpacity={0.15}
          />
          <Area
            type="monotone"
            dataKey="projectedBalanceLow"
            stroke="none"
            fill="#C8A84B"
            fillOpacity={0.05}
          />
          <ReferenceLine
            y={safetyThreshold}
            stroke="#E05252"
            strokeDasharray="6 4"
            label={{
              value: 'Safety Threshold',
              position: 'insideTopRight',
              fill: '#E05252',
              fontSize: 11,
            }}
          />
          <Line
            type="monotone"
            dataKey="projectedBalance"
            stroke="#028090"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#028090' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
