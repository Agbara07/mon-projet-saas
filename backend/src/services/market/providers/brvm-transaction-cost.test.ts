import { simulateTransactionCost } from './brvm-transaction-cost.provider'

// Montant de référence pour tous les tests : 1 000 000 FCFA
const AMOUNT = 1_000_000

// ═══════════════════════════════════════════════════════════════
// Barème CREPMF 2024 — frais fixes
// ═══════════════════════════════════════════════════════════════
describe('frais fixes (barème CREPMF 2024)', () => {
  it('calcule les 4 composantes de frais pour 1 000 000 FCFA', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'buy', includeTax: false, country: 'CI',
    })
    expect(result.brokerFee).toBe(6_000)   // 0,60% SGI
    expect(result.brvmFee).toBe(1_500)     // 0,15% BRVM
    expect(result.crepmfFee).toBe(300)     // 0,03% CREPMF
    expect(result.csdFee).toBe(200)        // 0,02% Dépositaire Central
    expect(result.totalFees).toBe(8_000)   // 0,80% total
  })

  it('totalFeePct = totalFees / amount × 100 (arrondi 3 décimales)', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'buy', includeTax: false, country: 'CI',
    })
    expect(result.totalFeePct).toBeCloseTo(0.8, 3)
  })

  it('breakEvenYield = totalFeePct × 2 (rendement seuil de rentabilité)', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'buy', includeTax: false, country: 'CI',
    })
    expect(result.breakEvenYield).toBeCloseTo(result.totalFeePct * 2, 2)
  })
})

// ═══════════════════════════════════════════════════════════════
// Direction de la transaction — achat vs vente
// ═══════════════════════════════════════════════════════════════
describe('sens de la transaction', () => {
  it('achat : netAmount = grossAmount + totalFees', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'buy', includeTax: false, country: 'CI',
    })
    expect(result.netAmount).toBe(AMOUNT + result.totalFees)
  })

  it('vente sans dividende : netAmount = grossAmount − totalFees', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'sell', includeTax: false, country: 'CI',
    })
    expect(result.netAmount).toBe(AMOUNT - result.totalFees)
  })

  it('grossAmount correspond toujours au montant d\'entrée', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'buy', includeTax: false, country: 'SN',
    })
    expect(result.grossAmount).toBe(AMOUNT)
  })
})

// ═══════════════════════════════════════════════════════════════
// Retenue à la source sur dividendes
// ═══════════════════════════════════════════════════════════════
describe('retenue à la source sur dividendes', () => {
  const DIVIDEND = 50_000

  it('CI (15%) : withholdingTax = dividendAmount × 0,15', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'sell', includeTax: true,
      dividendAmount: DIVIDEND, country: 'CI',
    })
    expect(result.withholdingTax).toBe(Math.round(DIVIDEND * 0.15)) // 7 500
  })

  it('SN (10%) : withholdingTax = dividendAmount × 0,10', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'sell', includeTax: true,
      dividendAmount: DIVIDEND, country: 'SN',
    })
    expect(result.withholdingTax).toBe(Math.round(DIVIDEND * 0.10)) // 5 000
  })

  it('BF (12,5%) : retenue correcte', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'sell', includeTax: true,
      dividendAmount: DIVIDEND, country: 'BF',
    })
    expect(result.withholdingTax).toBe(Math.round(DIVIDEND * 0.125)) // 6 250
  })

  it('includeTax: false → withholdingTax absent (undefined)', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'sell', includeTax: false,
      dividendAmount: DIVIDEND, country: 'CI',
    })
    expect(result.withholdingTax).toBeUndefined()
  })

  it('vente avec dividende CI : netAmount = grossAmount − totalFees − withholdingTax', () => {
    const result = simulateTransactionCost({
      amount: AMOUNT, type: 'sell', includeTax: true,
      dividendAmount: DIVIDEND, country: 'CI',
    })
    const expected = AMOUNT - result.totalFees - (result.withholdingTax ?? 0)
    expect(result.netAmount).toBe(expected)
  })
})

// ═══════════════════════════════════════════════════════════════
// Cas limites
// ═══════════════════════════════════════════════════════════════
describe('cas limites', () => {
  it('pays inconnu → fallback taux 10%', () => {
    const result = simulateTransactionCost({
      amount: 100_000, type: 'sell', includeTax: true,
      dividendAmount: 10_000, country: 'GW', // Guinée-Bissau (TAX_RATES = 10%)
    })
    expect(result.withholdingTax).toBe(1_000)
  })

  it('petit montant (< 1000) : frais arrondis à 0 si Math.round les élimine', () => {
    const result = simulateTransactionCost({
      amount: 100, type: 'buy', includeTax: false, country: 'CI',
    })
    // brokerFee = round(100 * 0.006) = round(0.6) = 1
    expect(result.totalFees).toBe(result.brokerFee + result.brvmFee + result.crepmfFee + result.csdFee)
    expect(result.netAmount).toBe(100 + result.totalFees)
  })
})
