export type GoalType =
  | 'down_payment'
  | 'emergency_fund'
  | 'debt_payoff'
  | 'car_affordability'
  | 'retirement'

export type RiskLevel = 'low' | 'medium' | 'high'

export type ForecastModel = 'prophet' | 'arima' | 'xgboost' | 'lstm_rnn'

export type DebtTarget =
  | 'student_loan'
  | 'car_loan'
  | 'credit_card'
  | 'mortgage'

export interface UserProfile {
  id: string
  email: string
  name: string
  goal: GoalType
  goalAmount: number
  goalTargetDate: string
  safetyThresholdMonths: number
  createdAt: string
}

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  balance: number
  category: string
  categoryConfidence: number
  merchantName?: string
  userCorrected: boolean
}

export interface WeeklyForecast {
  weekStart: string
  projectedBalance: number
  projectedBalanceLow: number
  projectedBalanceHigh: number
  projectedIncome: number
  projectedExpenses: number
  cashFlow: number
  burnRate: number
}

export interface ForecastOutput {
  window: 30 | 60 | 90
  generatedAt: string
  modelUsed: ForecastModel
  savingsBufferMonths: number
  weekly: WeeklyForecast[]
}

export interface ShapDriver {
  feature: string
  value: number
  plainLabel: string
  plainDescription: string
}

export interface RiskOutput {
  score: number
  level: RiskLevel
  modelScores: {
    xgboost: number
    randomForest: number
    logisticRegression: number
  }
  shapDrivers: ShapDriver[]
  trend: { week: string; score: number }[]
  explanation: string
  recommendations: string[]
}

export interface SimulationParams {
  lumpSumPayment: number
  debtTarget: DebtTarget | null
  monthlySavingsChange: number
  housingCostChange: number
  oneTimeExpense?: { amount: number; date: string }
  oneTimeWindfall?: { amount: number; date: string }
  startDate: string
  primaryGoal: GoalType
}

export interface SimulationResult {
  scenarioId: string
  scenarioName: string
  params: SimulationParams
  summary: string
  baseline: { date: string; balance: number }[]
  trajectory: {
    date: string
    balanceMedian: number
    balanceLow: number
    balanceHigh: number
  }[]
  probabilities: {
    positiveBalance: number
    reachGoalOnTime: number
    belowSafetyThreshold: number
  }
  milestones: { date: string; label: string }[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  groundedOn?: string[]
  suggestedFollowUps?: string[]
  createdAt: string
}
