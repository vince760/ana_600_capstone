'use client'

import { useState } from 'react'
import { ForecastDetailChart } from '@/components/forecast/forecast-detail-chart'
import { WeeklyTable } from '@/components/forecast/weekly-table'
import { ModelBadges } from '@/components/forecast/model-badges'
import { mockForecast30, mockForecast60, mockForecast90 } from '@/lib/mock-data'
import type { ForecastOutput } from '@/types'

const forecasts: Record<string, ForecastOutput> = {
  '30': mockForecast30,
  '60': mockForecast60,
  '90': mockForecast90,
}

export default function ForecastPage() {
  const [window, setWindow] = useState<'30' | '60' | '90'>('30')
  const forecast = forecasts[window]

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Forecast</h1>
          <p className="text-xs text-text-muted">
            Projected cash flow based on current data
          </p>
        </div>

        <div className="flex gap-1 rounded-lg border border-gray-100 bg-white p-1 shadow-sm">
          {(['30', '60', '90'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                window === w
                  ? 'bg-teal text-white shadow-sm'
                  : 'text-text-secondary hover:text-navy'
              }`}
            >
              {w} Days
            </button>
          ))}
        </div>
      </div>

      <ForecastDetailChart data={forecast.weekly} />

      <WeeklyTable data={forecast.weekly} />

      <ModelBadges
        modelUsed={forecast.modelUsed}
        savingsBufferMonths={forecast.savingsBufferMonths}
      />
    </div>
  )
}
