'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import TradingChart from '@/components/charts/TradingChart'
import TechnicalIndicators from '@/components/charts/TechnicalIndicators'

interface HistoricalPoint { date: string; open: number; high: number; low: number; close: number; volume: number }

interface TechnicalTabProps {
  symbol:     string
  historical: HistoricalPoint[]
}

export default function TechnicalTab({ symbol, historical }: TechnicalTabProps) {
  const [showSMA,     setShowSMA]     = useState(true)
  const [showEMA,     setShowEMA]     = useState(false)
  const [showBB,      setShowBB]      = useState(false)

  if (!historical.length) return (
    <div className="flex flex-col items-center py-16 text-center">
      <p className="text-sm font-medium text-[var(--fin-t2)]">Données historiques insuffisantes</p>
      <p className="text-[10px] text-[var(--fin-t3)] mt-1">Sélectionner une période plus longue (3M ou 1Y)</p>
    </div>
  )

  const overlayBtns = [
    { label: 'SMA 20', active: showSMA, toggle: () => setShowSMA(v => !v), color: 'text-blue-600 border-blue-200 bg-blue-50' },
    { label: 'EMA 50', active: showEMA, toggle: () => setShowEMA(v => !v), color: 'text-amber-600 border-amber-200 bg-amber-50' },
    { label: 'Bollinger', active: showBB, toggle: () => setShowBB(v => !v), color: 'text-purple-600 border-purple-200 bg-purple-50' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="p-4 space-y-4"
    >
      {/* Overlay controls */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">Indicateurs sur chart :</span>
        {overlayBtns.map(btn => (
          <button
            key={btn.label}
            onClick={btn.toggle}
            className={cn(
              'h-6 px-2.5 rounded text-[9px] font-bold border transition-colors',
              btn.active
                ? btn.color
                : 'text-[var(--fin-t3)] border-[var(--fin-border)] hover:bg-[var(--fin-hover)]'
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Chart with overlays */}
      <div className="bg-white border border-[var(--fin-border)] rounded-lg overflow-hidden">
        <TradingChart
          data={historical}
          height={220}
          showVolume={false}
          showSMA={showSMA}
          showEMA={showEMA}
          showBollinger={showBB}
        />
      </div>

      {/* Computed indicators panel */}
      <div className="bg-[var(--fin-surface)] border border-[var(--fin-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-[var(--fin-border)]">
          <span className="text-[9px] font-bold text-[var(--fin-t3)] uppercase tracking-widest">
            Signaux calculés
          </span>
        </div>
        <div className="p-4">
          <TechnicalIndicators data={historical} />
        </div>
      </div>
    </motion.div>
  )
}
