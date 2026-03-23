'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import type { WeeklyForecast } from '@/types'

interface WeeklyTableProps {
  data: WeeklyForecast[]
}

export function WeeklyTable({ data }: WeeklyTableProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
          Weekly Breakdown
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Week</TableHead>
              <TableHead className="text-right text-xs">Projected Income</TableHead>
              <TableHead className="text-right text-xs">Projected Expenses</TableHead>
              <TableHead className="text-right text-xs">Cash Flow</TableHead>
              <TableHead className="text-right text-xs">Projected Balance</TableHead>
              <TableHead className="text-right text-xs">Burn Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((week) => (
              <TableRow key={week.weekStart}>
                <TableCell className="text-xs text-text-secondary">
                  {new Date(week.weekStart).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-mint">
                  {formatCurrency(week.projectedIncome)}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-risk-high">
                  {formatCurrency(week.projectedExpenses)}
                </TableCell>
                <TableCell
                  className={`text-right text-sm font-semibold ${
                    week.cashFlow >= 0 ? 'text-mint' : 'text-risk-high'
                  }`}
                >
                  {week.cashFlow >= 0 ? '+' : ''}
                  {formatCurrency(week.cashFlow)}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-navy">
                  {formatCurrency(week.projectedBalance)}
                </TableCell>
                <TableCell className="text-right text-sm text-text-secondary">
                  {formatCurrency(week.burnRate)}/day
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
