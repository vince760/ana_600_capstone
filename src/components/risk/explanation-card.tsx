'use client'

import { Lightbulb } from 'lucide-react'

interface ExplanationCardProps {
  explanation: string
  recommendations: string[]
}

export function ExplanationCard({
  explanation,
  recommendations,
}: ExplanationCardProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 border-l-4 border-l-gold bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-gold" />
          <p className="text-xs font-bold uppercase tracking-widest text-gold">
            AI Takeaway
          </p>
        </div>
        <p className="text-sm leading-relaxed text-text-primary">{explanation}</p>
        <p className="mt-3 text-xs italic text-text-muted">
          AI-generated — not financial advice.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">
          Recommended Actions
        </p>
        <ul className="space-y-3">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex gap-3 text-sm text-text-primary">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
                {i + 1}
              </span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
