/**
 * OUTIL 7 — SIMULATEUR COÛT DE TRANSACTION BRVM
 * Réf : Barème CREPMF 2024, Code Général des Impôts CI 2024
 * Route : POST /market/brvm/tools/cost
 */

export interface TransactionCostInput {
  amount:          number
  type:            'buy' | 'sell'
  includeTax:      boolean
  dividendAmount?: number
  country:         'CI' | 'SN' | 'BF' | 'BJ' | 'ML' | 'NE' | 'TG' | 'GW'
}

export interface TransactionCostResult {
  grossAmount:     number
  brokerFee:       number
  brvmFee:         number
  crepmfFee:       number
  csdFee:          number
  totalFees:       number
  totalFeePct:     number
  withholdingTax?: number
  netAmount:       number
  breakEvenYield:  number
}

// Retenues à la source sur dividendes par pays UEMOA
const TAX_RATES: Record<string, number> = {
  CI: 0.150, SN: 0.100, BF: 0.125, BJ: 0.100,
  ML: 0.100, NE: 0.100, TG: 0.100, GW: 0.100,
}

export function simulateTransactionCost(input: TransactionCostInput): TransactionCostResult {
  const { amount, type, includeTax, dividendAmount, country } = input

  // Barème CREPMF 2024
  const brokerFee = Math.round(amount * 0.0060)   // 0,60% SGI
  const brvmFee   = Math.round(amount * 0.0015)   // 0,15% BRVM
  const crepmfFee = Math.round(amount * 0.0003)   // 0,03% CREPMF
  const csdFee    = Math.round(amount * 0.0002)   // 0,02% Dépositaire Central
  const totalFees = brokerFee + brvmFee + crepmfFee + csdFee

  const taxRate       = TAX_RATES[country] ?? 0.10
  const withholdingTax = includeTax && dividendAmount
    ? Math.round(dividendAmount * taxRate) : 0

  const netAmount    = type === 'buy' ? amount + totalFees : amount - totalFees - withholdingTax
  const totalCost    = totalFees + withholdingTax
  const totalFeePct  = parseFloat(((totalCost / amount) * 100).toFixed(3))
  const breakEvenYield = parseFloat((totalFeePct * 2).toFixed(2))

  return {
    grossAmount: amount,
    brokerFee, brvmFee, crepmfFee, csdFee,
    totalFees, totalFeePct,
    withholdingTax: withholdingTax || undefined,
    netAmount, breakEvenYield,
  }
}
