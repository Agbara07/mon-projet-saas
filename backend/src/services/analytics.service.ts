import Decimal from 'decimal.js'

Decimal.set({ precision: 20 })

export interface PortfolioStats {
  totalValue:        number
  totalCost:         number
  totalPnl:          number
  totalPnlPct:       number
  diversificationScore: number
  bestPerformer:     { symbol: string; pnlPct: number } | null
  worstPerformer:    { symbol: string; pnlPct: number } | null
  weightedReturn:    number
}

export function calcPortfolioStats(
  holdings: Array<{ symbol: string; quantity: number; avgBuyPrice: number; currentPrice: number }>
): PortfolioStats {
  if (!holdings.length) return {
    totalValue: 0, totalCost: 0, totalPnl: 0, totalPnlPct: 0,
    diversificationScore: 0, bestPerformer: null, worstPerformer: null, weightedReturn: 0,
  }

  let totalCost  = new Decimal(0)
  let totalValue = new Decimal(0)

  const enriched = holdings.map(h => {
    const qty   = new Decimal(h.quantity)
    const cost  = qty.mul(h.avgBuyPrice)
    const value = qty.mul(h.currentPrice)
    const pnl   = value.minus(cost)
    const pnlPct = cost.gt(0) ? pnl.div(cost).mul(100).toNumber() : 0

    totalCost  = totalCost.plus(cost)
    totalValue = totalValue.plus(value)

    return { ...h, value: value.toNumber(), cost: cost.toNumber(), pnl: pnl.toNumber(), pnlPct }
  })

  const totalPnl     = totalValue.minus(totalCost)
  const totalPnlPct  = totalCost.gt(0) ? totalPnl.div(totalCost).mul(100).toNumber() : 0
  const totalValueN  = totalValue.toNumber()

  // Herfindahl-Hirschman Index pour la diversification
  const weights = enriched.map(h => h.value / totalValueN)
  const hhi     = weights.reduce((s, w) => s + w * w, 0)
  const diversificationScore = Math.round((1 - hhi) * 100)

  const sorted       = [...enriched].sort((a, b) => b.pnlPct - a.pnlPct)
  const bestPerformer  = sorted[0] ? { symbol: sorted[0].symbol, pnlPct: sorted[0].pnlPct } : null
  const worstPerformer = sorted[sorted.length - 1]
    ? { symbol: sorted[sorted.length - 1].symbol, pnlPct: sorted[sorted.length - 1].pnlPct }
    : null

  const weightedReturn = enriched.reduce((s, h) => s + (h.value / totalValueN) * h.pnlPct, 0)

  return {
    totalValue:   totalValueN,
    totalCost:    totalCost.toNumber(),
    totalPnl:     totalPnl.toNumber(),
    totalPnlPct,
    diversificationScore,
    bestPerformer,
    worstPerformer,
    weightedReturn,
  }
}
