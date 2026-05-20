'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, CrosshairMode, LineStyle, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import { cn } from '@/lib/utils'
import { calcSMA, calcEMA, calcRSI, calcBollingerBands } from '@/lib/finance'

interface Candle {
  date: string; open: number; high: number; low: number; close: number; volume: number
}

interface TradingChartProps {
  data: Candle[]
  symbol?: string
  height?: number
  showVolume?: boolean
  showSMA?: boolean
  showEMA?: boolean
  showBollinger?: boolean
  showRSI?: boolean
  className?: string
  onCrosshairMove?: (price: number | null, date: string | null) => void
}

const PERIODS = ['5d','1mo','3mo','6mo','1y','5y'] as const

export default function TradingChart({
  data, symbol, height = 320, showVolume = true,
  showSMA = false, showEMA = false, showBollinger = false, showRSI = false,
  className, onCrosshairMove,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null)
  const [hoveredDate,  setHoveredDate]  = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !data.length) return

    const chart = createChart(containerRef.current, {
      layout: {
        background:  { type: ColorType.Solid, color: '#ffffff' },
        textColor:   '#6b7280',
        fontFamily:  'Inter, sans-serif',
        fontSize:    11,
      },
      grid: {
        vertLines:   { color: '#f3f4f6', style: LineStyle.Dotted },
        horzLines:   { color: '#f3f4f6', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#6b7280', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#374151' },
        horzLine: { color: '#6b7280', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#374151' },
      },
      rightPriceScale: { borderColor: '#e5e7eb', scaleMargins: { top: 0.1, bottom: showVolume ? 0.25 : 0.1 } },
      timeScale:       { borderColor: '#e5e7eb', timeVisible: true, secondsVisible: false },
      width:  containerRef.current.clientWidth,
      height,
    })
    chartRef.current = chart

    const closes = data.map(d => d.close)

    // ── Area / Line series ──────────────────────────────────────
    const isUp     = data[data.length - 1]?.close >= data[0]?.close
    const lineColor = isUp ? '#16a34a' : '#dc2626'
    const areaTop   = isUp ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)'

    const areaSeries = chart.addAreaSeries({
      lineColor,
      topColor:         areaTop,
      bottomColor:      'rgba(255,255,255,0)',
      lineWidth:        2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  5,
      crosshairMarkerBorderColor: lineColor,
      crosshairMarkerBackgroundColor: '#ffffff',
    })

    areaSeries.setData(data.map(d => ({ time: d.date as any, value: d.close })))

    // ── SMA 20 ──────────────────────────────────────────────────
    if (showSMA) {
      const sma = calcSMA(closes, 20)
      const smaSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, title: 'SMA 20' })
      smaSeries.setData(
        data.map((d, i) => ({ time: d.date as any, value: sma[i] ?? undefined }))
          .filter(p => p.value != null) as any
      )
    }

    // ── EMA 50 ──────────────────────────────────────────────────
    if (showEMA) {
      const ema = calcEMA(closes, 50)
      const emaSeries = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'EMA 50' })
      emaSeries.setData(
        data.map((d, i) => ({ time: d.date as any, value: ema[i] ?? undefined }))
          .filter(p => p.value != null) as any
      )
    }

    // ── Bollinger Bands ─────────────────────────────────────────
    if (showBollinger) {
      const bb = calcBollingerBands(closes)
      const upperSeries  = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 1, title: 'BB Upper' })
      const middleSeries = chart.addLineSeries({ color: '#8b5cf680', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Mid' })
      const lowerSeries  = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 1, title: 'BB Lower' })
      ;[
        [upperSeries, 'upper' as const],
        [middleSeries, 'middle' as const],
        [lowerSeries, 'lower' as const],
      ].forEach(([series, key]) => {
        (series as ISeriesApi<'Line'>).setData(
          data.map((d, i) => ({ time: d.date as any, value: bb[i][key] ?? undefined }))
            .filter(p => p.value != null) as any
        )
      })
    }

    // ── Volume histogram ────────────────────────────────────────
    if (showVolume) {
      const volSeries = chart.addHistogramSeries({
        priceFormat:   { type: 'volume' },
        priceScaleId:  'volume',
        color:         '#e5e7eb',
      })
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
      volSeries.setData(
        data.map(d => ({
          time:  d.date as any,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)',
        }))
      )
    }

    // ── Crosshair ────────────────────────────────────────────────
    chart.subscribeCrosshairMove(param => {
      const price = param.seriesData.get(areaSeries)
      if (price && 'value' in price) {
        setHoveredPrice((price as any).value)
        setHoveredDate(param.time ? String(param.time) : null)
        onCrosshairMove?.((price as any).value, param.time ? String(param.time) : null)
      } else {
        setHoveredPrice(null)
        setHoveredDate(null)
        onCrosshairMove?.(null, null)
      }
    })

    // ── Resize observer ─────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth })
    })
    ro.observe(containerRef.current)

    chart.timeScale().fitContent()

    return () => { ro.disconnect(); chart.remove() }
  }, [data, showVolume, showSMA, showEMA, showBollinger, height])

  if (!data.length) return (
    <div className={cn('flex items-center justify-center text-gray-400 text-sm', className)} style={{ height }}>
      Aucune donnée disponible
    </div>
  )

  return (
    <div className={cn('relative', className)}>
      {hoveredPrice != null && (
        <div className="absolute top-2 left-2 z-10 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm text-xs font-mono">
          <span className="text-gray-500">{hoveredDate} </span>
          <span className="font-bold text-gray-900">${hoveredPrice.toFixed(2)}</span>
        </div>
      )}
      <div ref={containerRef} style={{ height }}/>
    </div>
  )
}
