'use client'

import { useState } from 'react'
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts'
import { mockForecast30, mockForecast60, mockForecast90 } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'
import type { ForecastOutput } from '@/types'

const forecasts: Record<string, ForecastOutput> = {
  '30': mockForecast30,
  '60': mockForecast60,
  '90': mockForecast90,
}

export function ForecastChart() {
  const [window, setWindow] = useState<'30' | '60' | '90'>('30')
  const data = forecasts[window].weekly

  const safetyThreshold = 3400

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
          Balance Forecast
        </p>
        <div className="flex gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
          {(['30', '60', '90'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                window === w
                  ? 'bg-teal text-white shadow-sm'
                  : 'text-text-secondary hover:text-navy'
              }`}
            >
              {w}D
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="weekStart"
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickFormatter={(val: string) => {
              const d = new Date(val)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748B' }}
            tickFormatter={(val: number) => `$${(val / 1000).toFixed(1)}k`}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), '']}
            labelFormatter={(label) => {
              const d = new Date(label)
              return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}
          />
          <Area
            type="monotone"
            dataKey="projectedBalanceHigh"
            stackId="band"
            stroke="none"
            fill="#C8A84B"
            fillOpacity={0}
          />
          <Area
            type="monotone"
            dataKey="projectedBalanceLow"
            stackId="band"
            stroke="none"
            fill="#C8A84B"
            fillOpacity={0.1}
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
            dot={{ r: 4, fill: '#028090', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
