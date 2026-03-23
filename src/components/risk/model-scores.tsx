'use client'

interface ModelScoresProps {
  scores: {
    xgboost: number
    randomForest: number
    logisticRegression: number
  }
}

const models = [
  { key: 'xgboost' as const, label: 'XGBoost', primary: true },
  { key: 'randomForest' as const, label: 'Random Forest', primary: false },
  { key: 'logisticRegression' as const, label: 'Logistic Regression', primary: false },
]

export function ModelScores({ scores }: ModelScoresProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="mb-4 text-xs font-bold uppercase tracking-widest text-teal">
        Model Scores
      </p>
      <div className="space-y-4">
        {models.map((model) => (
          <div key={model.key}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-navy">
                {model.label}
                {model.primary && (
                  <span className="ml-2 rounded-full bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal">
                    Primary
                  </span>
                )}
              </span>
              <span className="text-sm font-bold text-navy">
                {scores[model.key]}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-teal transition-all"
                style={{ width: `${scores[model.key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
