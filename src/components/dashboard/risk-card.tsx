'use client'

import Link from 'next/link'
import { mockRisk } from '@/lib/mock-data'
import { ArrowRight } from 'lucide-react'

function getRiskColor(level: string): string {
  switch (level) {
    case 'low':
      return '#2ECC71'
    case 'medium':
      return '#C8A84B'
    case 'high':
      return '#E05252'
    default:
      return '#C8A84B'
  }
}

export function RiskCard() {
  const { score, level, shapDrivers } = mockRisk
  const color = getRiskColor(level)
  const topDriver = shapDrivers[0]

  const circumference = 2 * Math.PI * 45
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
        Risk Score
      </p>

      <div className="mt-4 flex items-center gap-6">
        <div className="relative h-28 w-28 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-navy">{score}</span>
            <span
              className="text-xs font-bold uppercase"
              style={{ color }}
            >
              {level}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm leading-relaxed text-text-primary">
            {topDriver.plainDescription}
          </p>
        </div>
      </div>

      <Link
        href="/risk"
        className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal hover:text-tealLight"
      >
        View full breakdown
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
