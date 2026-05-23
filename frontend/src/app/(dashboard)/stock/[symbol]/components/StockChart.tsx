'use client'

import { cn } from '@/lib/utils'
import TradingChart from '@/components/charts/TradingChart'
import { RefreshCw } from 'lucide-react'

interface HistoricalPoint { date: string; open: number; high: number; low: number; close: number; volume: number }

const PERIODS = [
  { label: '1J',  value: '1d'  },
  { label: '5J',  value: '5d'  },
  { label: '1M',  value: '1mo' },
  { label: '3M',  value: '3mo' },
  { label: '1Y',  value: '1y'  },
  { label: '5Y',  value: '5y'  },
]

interface StockChartProps {
  data:           HistoricalPoint[]
  period:         string
  onPeriodChange: (p: string) => void
  loading?:       boolean
  showSMA?:       boolean
  showEMA?:       boolean
  onToggleSMA?:   () => void
  onToggleEMA?:   () => void
}

export default function StockChart({
  data, period, onPeriodChange, loading,
  showSMA, showEMA, onToggleSMA, onToggleEMA,
}: StockChartProps) {
  return (
    <div className="border-b border-[var(--fin-border)] flex-shrink-0">
      {/* Chart toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--fin-panel)]">
        {/* Period selector */}
        <div className="flex items-center gap-0.5">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={cn(
                'h-6 px-2.5 rounded text-[10px] font-bold font-mono transition-colors',
                period === p.value
                  ? 'bg-[var(--fin-blue)] text-white'
                  : 'text-[var(--fin-t3)] hover:text-[var(--fin-t1)] hover:bg-[var(--fin-hover)]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-[var(--fin-border)] mx-1" />

        {/* Indicator toggles */}
        {onToggleSMA && (
          <button
            onClick={onToggleSMA}
            className={cn(
              'h-6 px-2 rounded text-[9px] font-bold uppercase tracking-wide transition-colors',
              showSMA
                ? 'bg-blue-100 text-blue-600 border border-blue-200'
                : 'text-[var(--fin-t3)] hover:bg-[var(--fin-hover)] border border-[var(--fin-border)]'
            )}
          >
            SMA 20
          </button>
        )}
        {onToggleEMA && (
          <button
            onClick={onToggleEMA}
            className={cn(
              'h-6 px-2 rounded text-[9px] font-bold uppercase tracking-wide transition-colors',
              showEMA
                ? 'bg-amber-100 text-amber-600 border border-amber-200'
                : 'text-[var(--fin-t3)] hover:bg-[var(--fin-hover)] border border-[var(--fin-border)]'
            )}
          >
            EMA 50
          </button>
        )}

        <div className="flex-1" />

        {loading && (
          <RefreshCw size={10} strokeWidth={2} className="text-[var(--fin-t3)] animate-spin" />
        )}
      </div>

      {/* Chart */}
      <div className="bg-white">
        {loading && !data.length ? (
          <div className="flex items-center justify-center h-[280px] text-[var(--fin-t3)]">
            <RefreshCw size={14} strokeWidth={1.5} className="animate-spin mr-2" />
            <span className="text-xs font-mono">CHARGEMENT...</span>
          </div>
        ) : (
          <TradingChart
            data={data}
            height={280}
            showVolume
            showSMA={showSMA}
            showEMA={showEMA}
          />
        )}
      </div>
    </div>
  )
}
