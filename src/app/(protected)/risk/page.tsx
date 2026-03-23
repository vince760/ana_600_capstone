import { RiskGauge } from '@/components/risk/risk-gauge'
import { ModelScores } from '@/components/risk/model-scores'
import { ShapChart } from '@/components/risk/shap-chart'
import { ExplanationCard } from '@/components/risk/explanation-card'
import { RiskTrend } from '@/components/risk/risk-trend'
import { mockRisk } from '@/lib/mock-data'

export default function RiskPage() {
  const { score, level, modelScores, shapDrivers, trend, explanation, recommendations } =
    mockRisk

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-bold text-navy">Risk Assessment</h1>
        <p className="text-xs text-text-secondary">
          Based on current data and forecasting model outputs
        </p>
      </div>

      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
          <RiskGauge score={score} level={level} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ModelScores scores={modelScores} />
          <RiskTrend trend={trend} />
        </div>

        <ShapChart drivers={shapDrivers} />

        <ExplanationCard
          explanation={explanation}
          recommendations={recommendations}
        />
      </div>
    </div>
  )
}
