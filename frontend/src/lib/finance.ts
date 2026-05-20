import Decimal from 'decimal.js'
import numeral from 'numeral'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

/* ─── Formatage monétaire ───────────────────────────────────── */
export function fmtCurrency(n: number | null | undefined, currency = 'USD', decimals = 2): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function fmtPrice(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—'
  return `$${new Decimal(n).toFixed(decimals)}`
}

export function fmtBigNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (Math.abs(n) >= 1e9)  return `$${(n / 1e9).toFixed(2)}Md`
  if (Math.abs(n) >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`
  return `$${numeral(n).format('0,0')}`
}

export function fmtPercent(n: number | null | undefined, decimals = 2, showSign = true): string {
  if (n == null) return '—'
  const sign = showSign && n > 0 ? '+' : ''
  return `${sign}${new Decimal(n).toFixed(decimals)}%`
}

export function fmtVolume(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}

export function fmtNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—'
  return numeral(n).format(decimals > 0 ? `0,0.${'0'.repeat(decimals)}` : '0,0')
}

/* ─── Formatage dates ───────────────────────────────────────── */
export function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy', { locale: fr })
}

export function fmtDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yy', { locale: fr })
}

export function fmtRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: fr })
}

/* ─── Calculs P&L ───────────────────────────────────────────── */
export interface PnLResult {
  pnl:        number
  pnlPct:     number
  totalCost:  number
  totalValue: number
}

export function calcPnL(quantity: number, avgBuyPrice: number, currentPrice: number): PnLResult {
  const qty   = new Decimal(quantity)
  const buy   = new Decimal(avgBuyPrice)
  const cur   = new Decimal(currentPrice)
  const cost  = qty.mul(buy)
  const value = qty.mul(cur)
  const pnl   = value.minus(cost)
  const pnlPct = cost.gt(0) ? pnl.div(cost).mul(100) : new Decimal(0)

  return {
    pnl:        pnl.toNumber(),
    pnlPct:     pnlPct.toNumber(),
    totalCost:  cost.toNumber(),
    totalValue: value.toNumber(),
  }
}

export function calcPortfolioPnL(holdings: Array<{ quantity: number; avgBuyPrice: number; currentPrice: number }>) {
  let totalCost  = new Decimal(0)
  let totalValue = new Decimal(0)

  for (const h of holdings) {
    const qty = new Decimal(h.quantity)
    totalCost  = totalCost.plus(qty.mul(h.avgBuyPrice))
    totalValue = totalValue.plus(qty.mul(h.currentPrice))
  }

  const pnl    = totalValue.minus(totalCost)
  const pnlPct = totalCost.gt(0) ? pnl.div(totalCost).mul(100) : new Decimal(0)

  return {
    totalCost:  totalCost.toNumber(),
    totalValue: totalValue.toNumber(),
    pnl:        pnl.toNumber(),
    pnlPct:     pnlPct.toNumber(),
  }
}

/* ─── Indicateurs techniques (frontend) ────────────────────── */
export function calcSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null
    const slice = data.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

export function calcEMA(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1)
  const result: (number | null)[] = new Array(data.length).fill(null)
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  result[period - 1] = ema
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
    result[i] = ema
  }
  return result
}

export function calcRSI(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null)
  if (data.length < period + 1) return result

  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1]
    if (diff > 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period; i < data.length; i++) {
    const diff = data[i] - data[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const rs  = avgLoss === 0 ? 100 : avgGain / avgLoss
    result[i] = 100 - 100 / (1 + rs)
  }
  return result
}

export function calcMACD(data: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast   = calcEMA(data, fast)
  const emaSlow   = calcEMA(data, slow)
  const macdLine  = data.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i]! - emaSlow[i]! : null
  )
  const macdValues = macdLine.filter((v): v is number => v != null)
  const signalRaw  = calcEMA(macdValues, signal)
  let si = 0
  const signalLine = macdLine.map(v => v != null ? (signalRaw[si++] ?? null) : null)
  const histogram  = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? v - signalLine[i]! : null
  )
  return { macdLine, signalLine, histogram }
}

export function calcBollingerBands(data: number[], period = 20, stdDevMult = 2) {
  const sma = calcSMA(data, period)
  return data.map((_, i) => {
    if (sma[i] == null) return { upper: null, middle: null, lower: null }
    const slice = data.slice(i - period + 1, i + 1)
    const mean = sma[i]!
    const variance = slice.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / period
    const sd = Math.sqrt(variance)
    return {
      upper:  mean + stdDevMult * sd,
      middle: mean,
      lower:  mean - stdDevMult * sd,
    }
  })
}

/* ─── Analyse de portefeuille ───────────────────────────────── */
export function calcDiversificationScore(holdings: Array<{ value: number }>) {
  const total = holdings.reduce((s, h) => s + h.value, 0)
  if (total === 0 || holdings.length === 0) return 0
  const weights = holdings.map(h => h.value / total)
  const hhi = weights.reduce((s, w) => s + w * w, 0) // Herfindahl-Hirschman Index
  return Math.round((1 - hhi) * 100) // 0 = concentré, 100 = diversifié
}

export function calcWeightedReturn(holdings: Array<{ value: number; pnlPct: number }>) {
  const total = holdings.reduce((s, h) => s + h.value, 0)
  if (total === 0) return 0
  return holdings.reduce((s, h) => s + (h.value / total) * h.pnlPct, 0)
}

/* ─── CSV Import/Export (PapaParse) ─────────────────────────── */
export async function parseCSV(file: File): Promise<Record<string, string>[]> {
  const Papa = (await import('papaparse')).default
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as Record<string, string>[]),
      error: reject,
    })
  })
}

export function exportToCSV(data: Record<string, any>[], filename: string) {
  const headers  = Object.keys(data[0] ?? {})
  const rows     = data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
  const csv      = [headers.join(','), ...rows].join('\n')
  const blob     = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
