'use client'

import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { SlidersHorizontal, ChevronDown, Calendar, DollarSign, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
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

interface ControlPanelProps {
  params: SimulatorParams
  onParamsChange: (params: SimulatorParams) => void
  onRunSimulation: () => void
  onReset: () => void
  isRunning: boolean
}

const debtTargets: { value: DebtTarget; label: string; apr: string }[] = [
  { value: 'student_loan', label: 'Student Loan', apr: '6.8%' },
  { value: 'car_loan', label: 'Car Loan', apr: '7.1%' },
  { value: 'credit_card', label: 'Credit Card', apr: '22.9%' },
  { value: 'mortgage', label: 'Mortgage', apr: '6.5%' },
]

const goalOptions: { value: GoalType; label: string }[] = [
  { value: 'down_payment', label: 'Down Payment' },
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'debt_payoff', label: 'Debt Payoff' },
  { value: 'car_affordability', label: 'Car Affordability' },
  { value: 'retirement', label: 'Retirement' },
]

export function ControlPanel({
  params,
  onParamsChange,
  onRunSimulation,
  onReset,
  isRunning,
}: ControlPanelProps) {
  const update = (partial: Partial<SimulatorParams>) => {
    onParamsChange({ ...params, ...partial })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-teal" />
          <h2 className="text-sm font-bold text-navy">Adjust Variables</h2>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-medium text-text-muted hover:text-teal"
        >
          Reset All
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {/* Lump-Sum Payment */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Lump-Sum Payment
              </p>
              <p className="text-xs text-text-muted">One-time additional principal</p>
            </div>
            <span className={`text-sm font-bold ${params.lumpSumPayment > 0 ? 'text-mint' : 'text-navy'}`}>
              {formatCurrency(params.lumpSumPayment)}
            </span>
          </div>
          <Slider
            value={[params.lumpSumPayment]}
            onValueChange={([v]) => update({ lumpSumPayment: v })}
            min={0}
            max={50000}
            step={500}
            className="py-2"
          />
        </div>

        {/* Debt Target */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
            Debt Target
          </p>
          <Select
            value={params.debtTarget ?? ''}
            onValueChange={(v) => update({ debtTarget: v as DebtTarget })}
          >
            <SelectTrigger className="h-10 border-gray-200 bg-gray-50 text-sm">
              <SelectValue placeholder="Select debt type" />
            </SelectTrigger>
            <SelectContent>
              {debtTargets.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>
                  <span className="flex items-center gap-2">
                    {dt.label}
                    <span className="text-xs text-text-muted">({dt.apr} APR)</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Monthly Savings Change */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Monthly Savings Change
              </p>
              <p className="text-xs text-text-muted">Recurring impact</p>
            </div>
            <span className={`text-sm font-bold ${
              params.monthlySavingsChange > 0 ? 'text-mint' : params.monthlySavingsChange < 0 ? 'text-risk-high' : 'text-navy'
            }`}>
              {params.monthlySavingsChange >= 0 ? '+' : ''}{formatCurrency(params.monthlySavingsChange)}
            </span>
          </div>
          <Slider
            value={[params.monthlySavingsChange]}
            onValueChange={([v]) => update({ monthlySavingsChange: v })}
            min={-500}
            max={500}
            step={25}
            className="py-2"
          />
        </div>

        {/* Housing Cost Change */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                Housing Cost Change
              </p>
              <p className="text-xs text-text-muted">New rent or mortgage</p>
            </div>
            <span className={`text-sm font-bold ${
              params.housingCostChange > 0 ? 'text-risk-high' : params.housingCostChange < 0 ? 'text-mint' : 'text-navy'
            }`}>
              {params.housingCostChange >= 0 ? '+' : ''}{formatCurrency(params.housingCostChange)}
            </span>
          </div>
          <Slider
            value={[params.housingCostChange]}
            onValueChange={([v]) => update({ housingCostChange: v })}
            min={-500}
            max={500}
            step={25}
            className="py-2"
          />
        </div>

        {/* One-Time Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-xs font-semibold text-text-secondary">One-Time Expense</p>
            </div>
            <Input
              type="number"
              placeholder="$0"
              value={params.oneTimeExpenseAmount || ''}
              onChange={(e) => update({ oneTimeExpenseAmount: Number(e.target.value) })}
              className="h-8 border-gray-200 bg-white text-xs"
            />
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-text-muted" />
              <p className="text-xs font-semibold text-text-secondary">One-Time Windfall</p>
            </div>
            <Input
              type="number"
              placeholder="$0"
              value={params.oneTimeWindfallAmount || ''}
              onChange={(e) => update({ oneTimeWindfallAmount: Number(e.target.value) })}
              className="h-8 border-gray-200 bg-white text-xs"
            />
          </div>
        </div>

        {/* Start Date */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
            Start Date
          </p>
          <Input
            type="month"
            value={params.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            className="h-10 border-gray-200 bg-gray-50 text-sm"
          />
        </div>

        {/* Primary Goal */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">
            Primary Goal
          </p>
          <Select
            value={params.primaryGoal}
            onValueChange={(v) => update({ primaryGoal: v as GoalType })}
          >
            <SelectTrigger className="h-10 border-gray-200 bg-gray-50 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {goalOptions.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Assumptions */}
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-text-secondary hover:bg-gray-100">
            Model Assumptions
            <ChevronDown className="h-3.5 w-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Monte Carlo Runs</span>
              <span className="font-medium text-navy">10,000</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Confidence Interval</span>
              <span className="font-medium text-navy">95%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Market Return</span>
              <span className="font-medium text-navy">7.2%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Inflation Adjusted</span>
              <span className="font-medium text-navy">Yes (3.0%)</span>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Run Button */}
      <div className="border-t border-gray-100 p-5">
        <Button
          onClick={onRunSimulation}
          disabled={isRunning}
          className="h-11 w-full bg-teal text-sm font-semibold text-white hover:bg-tealLight"
        >
          {isRunning ? 'Running Simulation...' : 'Run Simulation'}
        </Button>
      </div>
    </div>
  )
}
