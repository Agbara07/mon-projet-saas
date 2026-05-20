'use client'

import { useMemo } from 'react'
import { calcSMA, calcEMA, calcRSI, calcMACD, calcBollingerBands, fmtPrice, fmtPercent } from '@/lib/finance'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/Progress'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface HistPoint { date: string; close: number; volume: number }

interface TechnicalIndicatorsProps {
  data: HistPoint[]
}

function Signal({ label, value, signal }: { label: string; value: string; signal: 'buy' | 'sell' | 'neutral' }) {
  const color = signal === 'buy' ? 'text-green-600' : signal === 'sell' ? 'text-red-500' : 'text-gray-500'
  const bg    = signal === 'buy' ? 'bg-green-50 border-green-200' : signal === 'sell' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
  const Icon  = signal === 'buy' ? TrendingUp : signal === 'sell' ? TrendingDown : Minus

  return (
    <div className={cn('flex items-center justify-between px-3 py-2 rounded-xl border text-sm', bg)}>
      <span className="text-gray-600 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('font-bold tabular-nums', color)}>{value}</span>
        <Icon size={13} className={color}/>
      </div>
    </div>
  )
}

export default function TechnicalIndicators({ data }: TechnicalIndicatorsProps) {
  const closes = useMemo(() => data.map(d => d.close), [data])
  const last   = closes[closes.length - 1] ?? 0

  const sma20  = useMemo(() => calcSMA(closes, 20),   [closes])
  const sma50  = useMemo(() => calcSMA(closes, 50),   [closes])
  const ema12  = useMemo(() => calcEMA(closes, 12),   [closes])
  const rsi    = useMemo(() => calcRSI(closes),        [closes])
  const macd   = useMemo(() => calcMACD(closes),       [closes])
  const bb     = useMemo(() => calcBollingerBands(closes), [closes])

  const lastSMA20  = sma20[sma20.length - 1]
  const lastSMA50  = sma50[sma50.length - 1]
  const lastEMA12  = ema12[ema12.length - 1]
  const lastRSI    = rsi[rsi.length - 1]
  const lastMACD   = macd.macdLine[macd.macdLine.length - 1]
  const lastSignal = macd.signalLine[macd.signalLine.length - 1]
  const lastHisto  = macd.histogram[macd.histogram.length - 1]
  const lastBB     = bb[bb.length - 1]

  // Score bull/bear (nombre de signaux haussiers)
  let bullSignals = 0, totalSignals = 0

  if (lastSMA20 != null) { totalSignals++; if (last > lastSMA20) bullSignals++ }
  if (lastSMA50 != null) { totalSignals++; if (last > lastSMA50) bullSignals++ }
  if (lastEMA12 != null) { totalSignals++; if (last > lastEMA12) bullSignals++ }
  if (lastRSI   != null) { totalSignals++; if (lastRSI > 50) bullSignals++ }
  if (lastMACD != null && lastSignal != null) { totalSignals++; if (lastMACD > lastSignal) bullSignals++ }

  const score    = totalSignals > 0 ? Math.round((bullSignals / totalSignals) * 100) : 50
  const overall  = score >= 65 ? 'Haussier' : score <= 35 ? 'Baissier' : 'Neutre'
  const overallColor = score >= 65 ? 'text-green-600' : score <= 35 ? 'text-red-500' : 'text-gray-500'

  // Position dans les bandes de Bollinger
  const bbPosition = lastBB?.upper && lastBB?.lower
    ? ((last - lastBB.lower) / (lastBB.upper - lastBB.lower)) * 100
    : 50

  return (
    <div className="space-y-5">

      {/* Score global */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900 text-sm">Score technique global</p>
          <span className={cn('font-black text-lg', overallColor)}>{overall}</span>
        </div>
        <Progress value={score} color={score >= 65 ? 'green' : score <= 35 ? 'red' : 'blue'} size="lg" showLabel/>
        <p className="text-gray-400 text-xs mt-2 text-center">
          {bullSignals}/{totalSignals} signaux haussiers
        </p>
      </div>

      {/* Moyennes mobiles */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Moyennes mobiles</p>
        {lastSMA20 != null && (
          <Signal label="SMA 20" value={fmtPrice(lastSMA20)}
            signal={last > lastSMA20 ? 'buy' : 'sell'}/>
        )}
        {lastSMA50 != null && (
          <Signal label="SMA 50" value={fmtPrice(lastSMA50)}
            signal={last > lastSMA50 ? 'buy' : 'sell'}/>
        )}
        {lastEMA12 != null && (
          <Signal label="EMA 12" value={fmtPrice(lastEMA12)}
            signal={last > lastEMA12 ? 'buy' : 'sell'}/>
        )}
      </div>

      {/* RSI */}
      {lastRSI != null && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">RSI (14)</p>
          <Signal
            label={`RSI: ${lastRSI.toFixed(1)}`}
            value={lastRSI > 70 ? 'Suracheté' : lastRSI < 30 ? 'Survendu' : 'Neutre'}
            signal={lastRSI > 70 ? 'sell' : lastRSI < 30 ? 'buy' : 'neutral'}/>
          <div className="px-1">
            <Progress value={lastRSI} max={100}
              color={lastRSI > 70 ? 'red' : lastRSI < 30 ? 'green' : 'blue'} size="sm"/>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Survendu (30)</span><span>Suracheté (70)</span>
            </div>
          </div>
        </div>
      )}

      {/* MACD */}
      {lastMACD != null && lastSignal != null && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">MACD (12,26,9)</p>
          <Signal
            label={`MACD: ${lastMACD.toFixed(2)}`}
            value={lastMACD > lastSignal ? 'Signal haussier' : 'Signal baissier'}
            signal={lastMACD > lastSignal ? 'buy' : 'sell'}/>
          {lastHisto != null && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs">
              <span className="text-gray-500">Histogramme: </span>
              <span className={cn('font-bold', lastHisto > 0 ? 'text-green-600' : 'text-red-500')}>
                {lastHisto > 0 ? '+' : ''}{lastHisto.toFixed(3)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bollinger Bands */}
      {lastBB?.upper && lastBB?.lower && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bandes de Bollinger (20,2)</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Bande haute</span>
              <span className="font-semibold text-red-500">{fmtPrice(lastBB.upper)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Milieu (SMA 20)</span>
              <span className="font-semibold text-blue-600">{fmtPrice(lastBB.middle)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Bande basse</span>
              <span className="font-semibold text-green-600">{fmtPrice(lastBB.lower)}</span>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-400 mb-1">Position dans les bandes</p>
              <Progress value={bbPosition} color={bbPosition > 80 ? 'red' : bbPosition < 20 ? 'green' : 'blue'} size="sm"/>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
