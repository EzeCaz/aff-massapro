'use client'

import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Clock, CheckCircle2 } from 'lucide-react'

interface Affiliate {
  totalEarnings: number
  approvedBalance: number
  paidBalance: number
}

export default function FinancialSnapshotCards({ affiliate }: { affiliate: Affiliate }) {
  const formatCurrency = (amount: number) =>
    `$${Math.round(amount).toLocaleString('en-US')}`

  const cards = [
    {
      label: 'Total Lifetime Earnings',
      value: formatCurrency(affiliate.totalEarnings),
      icon: DollarSign,
      bgClass: 'bg-purple-100',
      iconClass: 'text-purple-600',
      valueClass: 'text-purple-700',
      borderClass: 'border-purple-200',
    },
    {
      label: 'Unpaid / Pending Balance',
      value: formatCurrency(affiliate.approvedBalance),
      icon: Clock,
      bgClass: 'bg-amber-100',
      iconClass: 'text-amber-600',
      valueClass: 'text-amber-700',
      borderClass: 'border-amber-200',
    },
    {
      label: 'Paid to Date',
      value: formatCurrency(affiliate.paidBalance),
      icon: CheckCircle2,
      bgClass: 'bg-slate-100',
      iconClass: 'text-slate-600',
      valueClass: 'text-slate-700',
      borderClass: 'border-slate-200',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <Card
            key={card.label}
            className={`border ${card.borderClass} hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300 bg-gradient-to-b from-white to-purple-50/30`}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${card.bgClass} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${card.iconClass}`} />
              </div>
              <div>
                <div className="text-sm text-gray-500">{card.label}</div>
                <div className={`text-xl font-bold ${card.valueClass} truncate`}>{card.value}</div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
