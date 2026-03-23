'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { mockTransactions } from '@/lib/mock-data'
import { formatCurrency } from '@/lib/utils'

const categoryColors: Record<string, string> = {
  Groceries: 'bg-teal/10 text-teal border-0',
  Income: 'bg-mint/10 text-mint border-0',
  Entertainment: 'bg-gold/10 text-gold border-0',
  Transportation: 'bg-navy/5 text-navy border-0',
  Utilities: 'bg-gray-100 text-text-secondary border-0',
  Shopping: 'bg-risk-high/10 text-risk-high border-0',
  Housing: 'bg-navy/10 text-navy border-0',
  Dining: 'bg-gold/10 text-gold border-0',
  Health: 'bg-teal/10 text-teal border-0',
}

export function RecentTransactions() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">
          Recent Transactions
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-semibold text-text-secondary">Date</TableHead>
            <TableHead className="text-xs font-semibold text-text-secondary">Merchant</TableHead>
            <TableHead className="text-xs font-semibold text-text-secondary">Category</TableHead>
            <TableHead className="text-right text-xs font-semibold text-text-secondary">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockTransactions.map((tx) => (
            <TableRow key={tx.id} className="hover:bg-gray-50/50">
              <TableCell className="text-xs text-text-secondary">
                {new Date(tx.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell className="text-sm font-medium text-navy">
                {tx.merchantName ?? tx.description}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`text-xs font-medium ${
                    categoryColors[tx.category] ?? 'bg-gray-100 text-text-secondary border-0'
                  }`}
                >
                  {tx.category}
                </Badge>
              </TableCell>
              <TableCell
                className={`text-right text-sm font-semibold ${
                  tx.amount >= 0 ? 'text-mint' : 'text-text-primary'
                }`}
              >
                {tx.amount >= 0 ? '+' : ''}
                {formatCurrency(tx.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
