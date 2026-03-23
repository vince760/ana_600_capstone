'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface RiskTrendProps {
  trend: { week: string; score: number }[]
}

export function RiskTrend({ trend }: RiskTrendProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-teal">
        Risk Trend (8 Weeks)
      </p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={trend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: '#64748B' }}
            tickFormatter={(val: string) => {
              const d = new Date(val)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[40, 80]}
            tick={{ fontSize: 10, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
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
            formatter={(value) => [Number(value), 'Risk Score']}
            labelFormatter={(label) => {
              const d = new Date(label)
              return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#028090"
            strokeWidth={2}
            dot={{ r: 3, fill: '#028090' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
