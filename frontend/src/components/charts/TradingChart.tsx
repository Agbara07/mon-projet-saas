'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  AreaSeries, LineSeries, HistogramSeries,
  type IChartApi,
} from 'lightweight-charts'
import { cn } from '@/lib/utils'
import { calcSMA, calcEMA, calcBollingerBands } from '@/lib/finance'

interface Candle {
  date: string; open: number; high: number; low: number; close: number; volume: number
}

interface TradingChartProps {
  data:           Candle[]
  symbol?:        string
  height?:        number
  showVolume?:    boolean
  showSMA?:       boolean
  showEMA?:       boolean
  showBollinger?: boolean
  showRSI?:       boolean
  className?:     string
  onCrosshairMove?: (price: number | null, date: string | null) => void
}

export default function TradingChart({
  data, symbol, height = 320, showVolume = true,
  showSMA = false, showEMA = false, showBollinger = false,
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
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor:  '#6b7280',
        fontFamily: 'Inter, sans-serif',
        fontSize:   11,
      },
      grid: {
        vertLines: { color: '#f3f4f6', style: LineStyle.Dotted },
        horzLines: { color: '#f3f4f6', style: LineStyle.Dotted },
      },
      crosshair: {
        mode:     CrosshairMode.Normal,
        vertLine: { color: '#9ca3af', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#374151' },
        horzLine: { color: '#9ca3af', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#374151' },
      },
      rightPriceScale: {
        borderColor:  '#e5e7eb',
        scaleMargins: { top: 0.1, bottom: showVolume ? 0.25 : 0.1 },
      },
      timeScale: { borderColor: '#e5e7eb', timeVisible: true, secondsVisible: false },
      width:  containerRef.current.clientWidth,
      height,
    })
    chartRef.current = chart

    const closes = data.map(d => d.close)
    const isUp   = data[data.length - 1]?.close >= data[0]?.close
    const lineColor = isUp ? '#16a34a' : '#dc2626'
    const areaTop   = isUp ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)'

    // ── Area series ──────────────────────────────────────────
    const areaSerie = chart.addSeries(AreaSeries, {
      lineColor,
      topColor:    areaTop,
      bottomColor: 'rgba(255,255,255,0)',
      lineWidth:   2,
      crosshairMarkerVisible:          true,
      crosshairMarkerRadius:           5,
      crosshairMarkerBorderColor:      lineColor,
      crosshairMarkerBackgroundColor:  '#ffffff',
    })
    areaSerie.setData(data.map(d => ({ time: d.date as any, value: d.close })))

    // ── SMA 20 ───────────────────────────────────────────────
    if (showSMA) {
      const sma    = calcSMA(closes, 20)
      const smaSerie = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, title: 'SMA 20' })
      smaSerie.setData(
        data.map((d, i) => ({ time: d.date as any, value: sma[i] ?? undefined }))
          .filter((p): p is { time: any; value: number } => p.value != null)
      )
    }

    // ── EMA 50 ───────────────────────────────────────────────
    if (showEMA) {
      const ema    = calcEMA(closes, 50)
      const emaSerie = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'EMA 50' })
      emaSerie.setData(
        data.map((d, i) => ({ time: d.date as any, value: ema[i] ?? undefined }))
          .filter((p): p is { time: any; value: number } => p.value != null)
      )
    }

    // ── Bollinger Bands ──────────────────────────────────────
    if (showBollinger) {
      const bb = calcBollingerBands(closes)
      const upperSerie  = chart.addSeries(LineSeries, { color: '#8b5cf6',   lineWidth: 1, title: 'BB Upper' })
      const middleSerie = chart.addSeries(LineSeries, { color: '#8b5cf680', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Mid' })
      const lowerSerie  = chart.addSeries(LineSeries, { color: '#8b5cf6',   lineWidth: 1, title: 'BB Lower' })

      const bbKeys = ['upper', 'middle', 'lower'] as const
      const bbSeries = [upperSerie, middleSerie, lowerSerie]
      bbKeys.forEach((key, idx) => {
        bbSeries[idx].setData(
          data.map((d, i) => ({ time: d.date as any, value: bb[i][key] ?? undefined }))
            .filter((p): p is { time: any; value: number } => p.value != null)
        )
      })
    }

    // ── Volume histogram ─────────────────────────────────────
    if (showVolume) {
      const volSerie = chart.addSeries(HistogramSeries, {
        priceFormat:  { type: 'volume' },
        priceScaleId: 'volume',
        color:        '#e5e7eb',
      })
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
      volSerie.setData(
        data.map(d => ({
          time:  d.date as any,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)',
        }))
      )
    }

    // ── Crosshair ────────────────────────────────────────────
    chart.subscribeCrosshairMove(param => {
      const price = param.seriesData.get(areaSerie)
      if (price && 'value' in price) {
        setHoveredPrice((price as any).value)
        setHoveredDate(param.time ? String(param.time) : null)
        onCrosshairMove?.((price as any).value, param.time ? String(param.time) : null)
      } else {
        setHoveredPrice(null); setHoveredDate(null)
        onCrosshairMove?.(null, null)
      }
    })

    // ── Resize ───────────────────────────────────────────────
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
        <div className="absolute top-2 left-2 z-10 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm text-xs font-mono pointer-events-none">
          <span className="text-gray-500">{hoveredDate} </span>
          <span className="font-bold text-gray-900">${hoveredPrice.toFixed(2)}</span>
        </div>
      )}
      <div ref={containerRef} style={{ height }}/>
    </div>
  )
}
