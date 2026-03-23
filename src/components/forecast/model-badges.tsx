'use client'

import { Badge } from '@/components/ui/badge'
import type { ForecastModel } from '@/types'

interface ModelBadgesProps {
  modelUsed: ForecastModel
  savingsBufferMonths: number
}

const modelLabels: Record<ForecastModel, string> = {
  prophet: 'Prophet',
  arima: 'ARIMA',
  xgboost: 'XGBoost',
  lstm_rnn: 'LSTM-RNN',
}

export function ModelBadges({ modelUsed, savingsBufferMonths }: ModelBadgesProps) {
  const badges = [
    { label: `Model: ${modelLabels[modelUsed]}`, variant: 'teal' },
    { label: 'Monte Carlo: 10,000 runs', variant: 'default' },
    { label: 'Confidence: 95%', variant: 'default' },
    { label: 'Inflation Adjusted: Yes (3%)', variant: 'default' },
    { label: `Savings Buffer: ${savingsBufferMonths} months`, variant: 'gold' },
  ]

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-text-secondary">
        Model & Assumptions
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <Badge
            key={badge.label}
            variant="secondary"
            className={
              badge.variant === 'teal'
                ? 'bg-teal/10 text-teal border-0'
                : badge.variant === 'gold'
                ? 'bg-gold/10 text-gold border-0'
                : 'bg-gray-50 text-text-secondary border-0'
            }
          >
            {badge.label}
          </Badge>
        ))}
      </div>
    </div>
  )
}
