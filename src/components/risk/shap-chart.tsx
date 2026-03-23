'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ShapDriver } from '@/types'

interface ShapChartProps {
  drivers: ShapDriver[]
}

export function ShapChart({ drivers }: ShapChartProps) {
  const data = drivers.map((d) => ({
    label: d.plainLabel,
    value: d.value,
    description: d.plainDescription,
  }))

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-teal">
        Risk Drivers (SHAP)
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 30, left: 120, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: '#334155' }}
            axisLine={false}
            tickLine={false}
            width={110}
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
            formatter={(value) => {
              const v = Number(value)
              return [v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2), 'SHAP Value']
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.value > 0 ? '#E05252' : '#2ECC71'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex items-center gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-risk-high" />
          <span>Increases risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-risk-low" />
          <span>Reduces risk</span>
        </div>
      </div>
    </div>
  )
}
