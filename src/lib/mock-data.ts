import type {
  Transaction,
  ForecastOutput,
  RiskOutput,
  UserProfile,
  WeeklyForecast,
} from '@/types'

export const mockUser: UserProfile = {
  id: '1',
  email: 'alex.morgan@email.com',
  name: 'Alex Morgan',
  goal: 'emergency_fund',
  goalAmount: 15000,
  goalTargetDate: '2026-09-01',
  safetyThresholdMonths: 1,
  createdAt: '2026-01-15',
}

export const mockTransactions: Transaction[] = [
  {
    id: 't1',
    date: '2026-03-21',
    description: 'WHOLE FOODS MARKET #10234',
    amount: -87.42,
    balance: 4312.58,
    category: 'Groceries',
    categoryConfidence: 0.95,
    merchantName: 'Whole Foods',
    userCorrected: false,
  },
  {
    id: 't2',
    date: '2026-03-20',
    description: 'DIRECT DEPOSIT - ACME CORP',
    amount: 2850.0,
    balance: 4400.0,
    category: 'Income',
    categoryConfidence: 0.99,
    merchantName: 'Acme Corp',
    userCorrected: false,
  },
  {
    id: 't3',
    date: '2026-03-19',
    description: 'NETFLIX.COM',
    amount: -15.99,
    balance: 1550.0,
    category: 'Entertainment',
    categoryConfidence: 0.97,
    merchantName: 'Netflix',
    userCorrected: false,
  },
  {
    id: 't4',
    date: '2026-03-18',
    description: 'SHELL OIL 57442',
    amount: -48.32,
    balance: 1565.99,
    category: 'Transportation',
    categoryConfidence: 0.92,
    merchantName: 'Shell',
    userCorrected: false,
  },
  {
    id: 't5',
    date: '2026-03-17',
    description: 'VERIZON WIRELESS',
    amount: -85.0,
    balance: 1614.31,
    category: 'Utilities',
    categoryConfidence: 0.96,
    merchantName: 'Verizon',
    userCorrected: false,
  },
  {
    id: 't6',
    date: '2026-03-16',
    description: 'TARGET #1892',
    amount: -124.56,
    balance: 1699.31,
    category: 'Shopping',
    categoryConfidence: 0.88,
    merchantName: 'Target',
    userCorrected: false,
  },
  {
    id: 't7',
    date: '2026-03-15',
    description: 'RENT PAYMENT - APT 4B',
    amount: -1450.0,
    balance: 1823.87,
    category: 'Housing',
    categoryConfidence: 0.99,
    merchantName: 'Landlord',
    userCorrected: false,
  },
  {
    id: 't8',
    date: '2026-03-14',
    description: 'STARBUCKS #4521',
    amount: -6.75,
    balance: 3273.87,
    category: 'Dining',
    categoryConfidence: 0.94,
    merchantName: 'Starbucks',
    userCorrected: false,
  },
  {
    id: 't9',
    date: '2026-03-13',
    description: 'AMAZON.COM AMZN.COM/BILL',
    amount: -43.21,
    balance: 3280.62,
    category: 'Shopping',
    categoryConfidence: 0.85,
    merchantName: 'Amazon',
    userCorrected: false,
  },
  {
    id: 't10',
    date: '2026-03-12',
    description: 'PLANET FITNESS',
    amount: -24.99,
    balance: 3323.83,
    category: 'Health',
    categoryConfidence: 0.93,
    merchantName: 'Planet Fitness',
    userCorrected: false,
  },
]

function generateWeeklyForecasts(weeks: number): WeeklyForecast[] {
  const forecasts: WeeklyForecast[] = []
  let balance = 4312
  const baseDate = new Date('2026-03-23')

  for (let i = 0; i < weeks; i++) {
    const weekDate = new Date(baseDate)
    weekDate.setDate(weekDate.getDate() + i * 7)

    const income = 1425 + Math.random() * 200 - 100
    const expenses = 1100 + Math.random() * 300 - 150
    const cashFlow = income - expenses
    balance += cashFlow

    forecasts.push({
      weekStart: weekDate.toISOString().split('T')[0],
      projectedBalance: Math.round(balance),
      projectedBalanceLow: Math.round(balance * 0.85),
      projectedBalanceHigh: Math.round(balance * 1.15),
      projectedIncome: Math.round(income),
      projectedExpenses: Math.round(expenses),
      cashFlow: Math.round(cashFlow),
      burnRate: Math.round(expenses / 7),
    })
  }
  return forecasts
}

export const mockForecast30: ForecastOutput = {
  window: 30,
  generatedAt: '2026-03-22T12:00:00Z',
  modelUsed: 'xgboost',
  savingsBufferMonths: 2.4,
  weekly: generateWeeklyForecasts(5),
}

export const mockForecast60: ForecastOutput = {
  window: 60,
  generatedAt: '2026-03-22T12:00:00Z',
  modelUsed: 'xgboost',
  savingsBufferMonths: 2.4,
  weekly: generateWeeklyForecasts(9),
}

export const mockForecast90: ForecastOutput = {
  window: 90,
  generatedAt: '2026-03-22T12:00:00Z',
  modelUsed: 'xgboost',
  savingsBufferMonths: 2.4,
  weekly: generateWeeklyForecasts(13),
}

export const mockRisk: RiskOutput = {
  score: 62,
  level: 'medium',
  modelScores: {
    xgboost: 64,
    randomForest: 58,
    logisticRegression: 61,
  },
  shapDrivers: [
    {
      feature: 'discretionary_spend_ratio',
      value: 0.18,
      plainLabel: 'Discretionary Spending',
      plainDescription:
        'Your discretionary spending is 34% of total expenses, which is above the recommended 30% threshold.',
    },
    {
      feature: 'savings_rate',
      value: -0.12,
      plainLabel: 'Savings Rate',
      plainDescription:
        'Your current savings rate of 12% is helping reduce your overall financial risk.',
    },
    {
      feature: 'income_volatility',
      value: 0.09,
      plainLabel: 'Income Consistency',
      plainDescription:
        'Your income has shown some variability over the past 8 weeks, contributing modestly to risk.',
    },
    {
      feature: 'debt_to_income',
      value: 0.07,
      plainLabel: 'Debt-to-Income Ratio',
      plainDescription:
        'Your debt obligations consume 28% of your monthly income.',
    },
    {
      feature: 'emergency_buffer',
      value: -0.15,
      plainLabel: 'Emergency Buffer',
      plainDescription:
        'Having 2.4 months of expenses saved provides a meaningful safety net that reduces your risk.',
    },
  ],
  trend: [
    { week: '2026-01-27', score: 55 },
    { week: '2026-02-03', score: 58 },
    { week: '2026-02-10', score: 54 },
    { week: '2026-02-17', score: 60 },
    { week: '2026-02-24', score: 63 },
    { week: '2026-03-03', score: 59 },
    { week: '2026-03-10', score: 65 },
    { week: '2026-03-17', score: 62 },
  ],
  explanation:
    'Your financial risk score is currently at 62 out of 100 (medium risk). The primary driver is your discretionary spending ratio, which at 34% exceeds the recommended 30% threshold. However, your emergency buffer of 2.4 months and consistent savings rate of 12% are working in your favor. Your income has shown some variability recently, which is a factor worth monitoring.',
  recommendations: [
    'Consider reducing discretionary spending by $150/month to bring the ratio below 30% - this could lower your risk score by an estimated 8-10 points.',
    'Continue building your emergency fund toward 3 months of expenses to further strengthen your safety net.',
    'Review recurring subscriptions for potential savings - the data suggests $45/month in underutilized services.',
  ],
}

export const mockDashboardMetrics = {
  weeklyProjectedBalance: { value: 4580, trend: 3.2 },
  monthlyCashFlow: { value: 1240, isPositive: true },
  savingsBuffer: { value: 2.4, unit: 'months' },
  burnRate: { value: 340, unit: '/week' },
}

export const mockGoal = {
  label: 'Emergency Fund',
  targetAmount: 15000,
  currentAmount: 8400,
  projectedDate: '2026-08-15',
  targetDate: '2026-09-01',
}

export function generateSimulationResult(params: {
  lumpSumPayment: number
  debtTarget: string | null
  monthlySavingsChange: number
  housingCostChange: number
  primaryGoal: string
}): {
  scenarioName: string
  type: string
  goal: string
  summary: string
  debtFreeDate: string
  debtFreeMonths: number
  monthlySurplus: number
  monthlySurplusChange: number
  erFundMonths: number
  erFundChange: number
  goalProbability: number
  goalProbabilityChange: number
  baseline: { date: string; balance: number }[]
  trajectory: { date: string; balanceMedian: number; balanceLow: number; balanceHigh: number }[]
  milestones: { date: string; label: string }[]
} {
  const goalLabels: Record<string, string> = {
    down_payment: 'Reach house down payment',
    emergency_fund: 'Build emergency fund',
    debt_payoff: 'Pay off all debt',
    car_affordability: 'Afford new car',
    retirement: 'Retirement savings target',
  }

  const types: string[] = []
  if (params.lumpSumPayment > 0) types.push('Debt Payoff')
  if (params.monthlySavingsChange !== 0) types.push('Savings')
  if (params.housingCostChange !== 0) types.push('Housing')
  if (types.length === 0) types.push('Baseline')

  const baseBalance = 4312
  const baseline: { date: string; balance: number }[] = []
  const trajectory: { date: string; balanceMedian: number; balanceLow: number; balanceHigh: number }[] = []

  for (let month = 0; month <= 24; month++) {
    const date = new Date('2026-04-01')
    date.setMonth(date.getMonth() + month)
    const dateStr = date.toISOString().split('T')[0]

    const baseGrowth = baseBalance + month * 180
    baseline.push({ date: dateStr, balance: baseGrowth })

    const scenarioGrowth = baseBalance +
      month * (180 + params.monthlySavingsChange - params.housingCostChange) +
      (month === 0 ? -params.lumpSumPayment : 0) +
      (params.lumpSumPayment > 0 ? month * (params.lumpSumPayment * 0.068 / 12) : 0)

    trajectory.push({
      date: dateStr,
      balanceMedian: Math.round(scenarioGrowth),
      balanceLow: Math.round(scenarioGrowth * 0.82),
      balanceHigh: Math.round(scenarioGrowth * 1.18),
    })
  }

  const surplusBase = 1100
  const surplusChange = params.monthlySavingsChange - params.housingCostChange
  const surplus = surplusBase + surplusChange

  const erBase = 5.8
  const erChange = params.monthlySavingsChange > 0 ? params.monthlySavingsChange / 500 : params.monthlySavingsChange / 800
  const erMonths = Math.max(0, erBase + erChange)

  const baseProbability = 42
  const probBoost = (params.lumpSumPayment / 1000) * 8 + (params.monthlySavingsChange / 100) * 6 - (params.housingCostChange / 100) * 4
  const goalProb = Math.min(99, Math.max(5, baseProbability + probBoost))

  const debtMonths = params.lumpSumPayment > 0 ? Math.max(6, 18 - Math.floor(params.lumpSumPayment / 500)) : 24
  const debtDate = new Date('2026-04-01')
  debtDate.setMonth(debtDate.getMonth() + debtMonths)

  const debtTargetLabels: Record<string, string> = {
    student_loan: 'student loans',
    car_loan: 'car loan',
    credit_card: 'credit card debt',
    mortgage: 'mortgage',
  }

  const debtLabel = params.debtTarget ? debtTargetLabels[params.debtTarget] ?? 'debt' : 'debt'
  const lumpFormatted = params.lumpSumPayment.toLocaleString()

  let summaryParts = ''
  if (params.lumpSumPayment > 0) {
    summaryParts += `Apply a $${lumpFormatted} lump-sum payment to ${debtLabel}`
  }
  if (params.monthlySavingsChange !== 0) {
    const dir = params.monthlySavingsChange > 0 ? 'increase' : 'decrease'
    summaryParts += `${summaryParts ? ', ' : ''}${dir} monthly savings by $${Math.abs(params.monthlySavingsChange)}`
  }
  if (params.housingCostChange !== 0) {
    const dir = params.housingCostChange > 0 ? 'increase' : 'decrease'
    summaryParts += `${summaryParts ? ', and model a ' : ''}$${Math.abs(params.housingCostChange)} ${dir} in housing cost`
  }
  summaryParts += '.'

  const aiSummary = params.lumpSumPayment > 0
    ? `This scenario is **Highly Recommended**. The $${lumpFormatted} lump sum payment saves you an estimated $${Math.round(params.lumpSumPayment * 0.068 * 5).toLocaleString()} in interest over 5 years. While your monthly surplus slightly decreases, the reduction in debt drag significantly accelerates your ${goalLabels[params.primaryGoal]?.toLowerCase() ?? 'financial goal'} by an estimated **${(params.lumpSumPayment / 3500).toFixed(1)} years**.`
    : `This scenario shows a moderate adjustment to your financial plan. ${params.monthlySavingsChange > 0 ? 'Increasing your savings rate strengthens your safety net and improves goal probability.' : 'Review the trade-offs carefully before committing to this plan.'}`

  return {
    scenarioName: params.lumpSumPayment > 0
      ? `Accelerated ${params.debtTarget === 'student_loan' ? 'Student Loan' : params.debtTarget === 'car_loan' ? 'Car Loan' : params.debtTarget === 'credit_card' ? 'Credit Card' : 'Debt'} Payoff`
      : 'Custom Scenario',
    type: types.join(' + '),
    goal: goalLabels[params.primaryGoal] ?? 'Financial goal',
    summary: summaryParts,
    debtFreeDate: debtDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    debtFreeMonths: -debtMonths,
    monthlySurplus: surplus,
    monthlySurplusChange: surplusChange,
    erFundMonths: Math.round(erMonths * 10) / 10,
    erFundChange: Math.round(erChange * 10) / 10,
    goalProbability: Math.round(goalProb),
    goalProbabilityChange: Math.round(probBoost),
    baseline,
    trajectory,
    milestones: [
      { date: debtDate.toISOString().split('T')[0], label: 'Debt Free' },
    ],
    aiTakeaway: aiSummary,
  } as ReturnType<typeof generateSimulationResult> & { aiTakeaway: string }
}
