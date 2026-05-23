'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

interface IncomeStatement {
  date: string; revenue: number; grossProfit: number
  operatingIncome: number; netIncome: number; eps: number; ebitda: number
  grossMargin?: number; operatingMargin?: number; netMargin?: number
}
interface BalanceSheet {
  date: string; totalAssets: number; totalLiabilities: number; totalEquity: number
  cash: number; debt: number; debtToEquity?: number
}
interface CashFlowStatement {
  date: string; operatingCashFlow: number; capitalExpenditure: number; freeCashFlow: number
}
interface Fundamentals {
  symbol: string
  incomeStatements: IncomeStatement[]
  balanceSheets: BalanceSheet[]
  cashFlows: CashFlowStatement[]
}

function fmt(n: number) {
  if (Math.abs(n) >= 1e9)  return `${(n/1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6)  return `${(n/1e6).toFixed(1)}M`
  if (Math.abs(n) >= 1e3)  return `${(n/1e3).toFixed(1)}K`
  return n.toFixed(2)
}
function pct(n?: number) { return n != null ? `${n.toFixed(1)}%` : '—' }

function DataTable({ headers, rows, highlightCol }: {
  headers: string[]
  rows: (string | React.ReactNode)[][]
  highlightCol?: number
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="border-b border-[var(--fin-border)]">
            {headers.map((h, i) => (
              <th
                key={i}
                className={cn(
                  'py-1.5 px-2 text-[9px] font-bold uppercase tracking-widest text-[var(--fin-t3)]',
                  i === 0 ? 'text-left' : 'text-right'
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[var(--fin-border)] last:border-0 hover:bg-[var(--fin-hover)] transition-colors">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'py-1.5 px-2',
                    ci === 0 ? 'text-left text-[var(--fin-t2)] font-medium text-[10px]' : 'text-right',
                    ci > 0 && ci === highlightCol ? 'font-bold text-[var(--fin-t1)]' : 'text-[var(--fin-t2)]'
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type SubTab = 'income' | 'balance' | 'cashflow'

export default function FundamentalsTab({ symbol }: { symbol: string }) {
  const [data,    setData]    = useState<Fundamentals | null>(null)
  const [loading, setLoading] = useState(true)
  const [subTab,  setSubTab]  = useState<SubTab>('income')

  useEffect(() => {
    api.get(`/market/${symbol}/fundamentals?limit=5`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol])

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-[var(--fin-t3)]">
      <RefreshCw size={14} strokeWidth={1.5} className="animate-spin mr-2" />
      <span className="text-xs font-mono">CHARGEMENT DES DONNÉES FMP...</span>
    </div>
  )

  if (!data || (!data.incomeStatements.length && !data.balanceSheets.length)) return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="text-sm font-medium text-[var(--fin-t2)]">Données fondamentales indisponibles</p>
      <p className="text-[10px] text-[var(--fin-t3)] mt-1">FMP ne couvre pas ce symbole ou la limite est atteinte</p>
    </div>
  )

  const SUB_TABS: { key: SubTab; label: string }[] = [
    { key: 'income',   label: 'Compte de résultat' },
    { key: 'balance',  label: 'Bilan' },
    { key: 'cashflow', label: 'Cash flow' },
  ]

  // Build income table
  const incomeRows = data.incomeStatements.map(s => [
    s.date.split('-')[0],
    `$${fmt(s.revenue)}`,
    `$${fmt(s.grossProfit)}`,
    `$${fmt(s.netIncome)}`,
    s.eps.toFixed(2),
    pct(s.grossMargin),
    pct(s.netMargin),
  ])

  // Build balance table
  const balanceRows = data.balanceSheets.map(s => [
    s.date.split('-')[0],
    `$${fmt(s.totalAssets)}`,
    `$${fmt(s.totalLiabilities)}`,
    `$${fmt(s.totalEquity)}`,
    `$${fmt(s.cash)}`,
    `$${fmt(s.debt)}`,
    s.debtToEquity != null ? s.debtToEquity.toFixed(2) : '—',
  ])

  // Build cashflow table
  const cashRows = data.cashFlows.map(s => [
    s.date.split('-')[0],
    `$${fmt(s.operatingCashFlow)}`,
    `$${fmt(s.capitalExpenditure)}`,
    `$${fmt(s.freeCashFlow)}`,
  ])

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-4"
    >
      {/* Sub-tab selector */}
      <div className="flex items-center gap-0 border border-[var(--fin-border)] rounded-lg overflow-hidden inline-flex mb-4">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={cn(
              'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors border-r border-[var(--fin-border)] last:border-0',
              subTab === t.key
                ? 'bg-[var(--fin-blue)] text-white'
                : 'text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tables */}
      <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg overflow-hidden">
        {subTab === 'income' && (
          <DataTable
            headers={['Exercice', 'Revenu', 'Brut', 'Net', 'EPS', 'Mg. brute', 'Mg. nette']}
            rows={incomeRows}
          />
        )}
        {subTab === 'balance' && (
          <DataTable
            headers={['Exercice', 'Actif total', 'Passif total', 'Fonds propres', 'Trésorerie', 'Dette', 'D/E ratio']}
            rows={balanceRows}
          />
        )}
        {subTab === 'cashflow' && (
          <DataTable
            headers={['Exercice', 'Cash opérationnel', 'Capex', 'Free cash flow']}
            rows={cashRows}
          />
        )}
      </div>

      <p className="text-[9px] text-[var(--fin-t3)] mt-2">Source : Financial Modeling Prep · 5 derniers exercices</p>
    </motion.div>
  )
}
