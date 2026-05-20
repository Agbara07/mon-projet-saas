'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineStyle, LineSeries } from 'lightweight-charts'
import { calcRSI } from '@/lib/finance'
import { cn } from '@/lib/utils'

interface RSIPanelProps {
  closes:    number[]
  dates:     string[]
  height?:   number
  className?: string
}

export default function RSIPanel({ closes, dates, height = 100, className }: RSIPanelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !closes.length) return

    const chart = createChart(ref.current, {
      layout:     { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#9ca3af', fontSize: 10 },
      grid:       { vertLines: { color: '#f9fafb' }, horzLines: { color: '#f9fafb' } },
      rightPriceScale: { borderColor: '#e5e7eb', scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale:  { borderColor: '#e5e7eb', visible: false },
      width:      ref.current.clientWidth,
      height,
    })

    const rsi = calcRSI(closes)
    const validData = dates
      .map((d, i) => ({ date: d, rsi: rsi[i] }))
      .filter(p => p.rsi != null)

    const obSerie  = chart.addSeries(LineSeries, { color: '#fca5a5', lineWidth: 1, lineStyle: LineStyle.Dashed, title: '70', priceLineVisible: false })
    const osSerie  = chart.addSeries(LineSeries, { color: '#86efac', lineWidth: 1, lineStyle: LineStyle.Dashed, title: '30', priceLineVisible: false })
    const rsiSerie = chart.addSeries(LineSeries, { color: '#6366f1', lineWidth: 2, title: 'RSI', priceLineVisible: false })

    obSerie.setData(validData.map(p => ({ time: p.date as any, value: 70 })))
    osSerie.setData(validData.map(p => ({ time: p.date as any, value: 30 })))
    rsiSerie.setData(validData.map(p => ({ time: p.date as any, value: p.rsi! })))

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }) })
    ro.observe(ref.current)
    return () => { ro.disconnect(); chart.remove() }
  }, [closes, dates])

  const lastRSI = calcRSI(closes).filter(v => v != null).pop()

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-semibold text-gray-500">RSI (14)</span>
        {lastRSI != null && (
          <span className={cn('text-xs font-bold',
            lastRSI > 70 ? 'text-red-500' : lastRSI < 30 ? 'text-green-600' : 'text-indigo-600')}>
            {lastRSI.toFixed(1)}
            {lastRSI > 70 ? ' · Suracheté' : lastRSI < 30 ? ' · Survendu' : ''}
          </span>
        )}
      </div>
      <div ref={ref} style={{ height }}/>
    </div>
  )
}
