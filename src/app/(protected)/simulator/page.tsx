'use client'

import { useState } from 'react'
import { ControlPanel } from '@/components/simulator/control-panel'
import { ResultsPanel } from '@/components/simulator/results-panel'
import { generateSimulationResult } from '@/lib/mock-data'
import type { GoalType, DebtTarget } from '@/types'

interface SimulatorParams {
  lumpSumPayment: number
  debtTarget: DebtTarget | null
  monthlySavingsChange: number
  housingCostChange: number
  oneTimeExpenseAmount: number
  oneTimeExpenseDate: string
  oneTimeWindfallAmount: number
  oneTimeWindfallDate: string
  startDate: string
  primaryGoal: GoalType
}

const defaultParams: SimulatorParams = {
  lumpSumPayment: 0,
  debtTarget: null,
  monthlySavingsChange: 0,
  housingCostChange: 0,
  oneTimeExpenseAmount: 0,
  oneTimeExpenseDate: '',
  oneTimeWindfallAmount: 0,
  oneTimeWindfallDate: '',
  startDate: '2026-04',
  primaryGoal: 'down_payment',
}

type SimulationResultType = ReturnType<typeof generateSimulationResult> & { aiTakeaway?: string }

export default function SimulatorPage() {
  const [params, setParams] = useState<SimulatorParams>(defaultParams)
  const [result, setResult] = useState<SimulationResultType | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const handleRunSimulation = () => {
    setIsRunning(true)

    // Simulate a brief delay for realism
    setTimeout(() => {
      const simResult = generateSimulationResult({
        lumpSumPayment: params.lumpSumPayment,
        debtTarget: params.debtTarget,
        monthlySavingsChange: params.monthlySavingsChange,
        housingCostChange: params.housingCostChange,
        primaryGoal: params.primaryGoal,
      })
      setResult(simResult as SimulationResultType)
      setIsRunning(false)
    }, 800)
  }

  const handleReset = () => {
    setParams(defaultParams)
    setResult(null)
  }

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-80 flex-shrink-0 border-r border-gray-100 bg-white lg:w-[340px]">
        <ControlPanel
          params={params}
          onParamsChange={setParams}
          onRunSimulation={handleRunSimulation}
          onReset={handleReset}
          isRunning={isRunning}
        />
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-gray-50">
        <ResultsPanel result={result} />
      </div>
    </div>
  )
}
