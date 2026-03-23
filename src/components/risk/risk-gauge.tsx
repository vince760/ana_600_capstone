'use client'

import type { RiskLevel } from '@/types'

interface RiskGaugeProps {
  score: number
  level: RiskLevel
}

function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return '#2ECC71'
    case 'medium':
      return '#C8A84B'
    case 'high':
      return '#E05252'
  }
}

export function RiskGauge({ score, level }: RiskGaugeProps) {
  const color = getRiskColor(level)
  const circumference = 2 * Math.PI * 80
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-48 w-48">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#F1F5F9"
            strokeWidth="14"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-navy">{score}</span>
          <span
            className="mt-1 text-xs font-bold uppercase tracking-widest"
            style={{ color }}
          >
            {level} risk
          </span>
        </div>
      </div>
    </div>
  )
}
