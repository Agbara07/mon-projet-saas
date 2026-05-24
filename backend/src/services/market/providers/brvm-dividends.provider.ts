/**
 * OUTIL 2 — SCREENER DIVIDENDES BRVM
 * Réf : Gordon & Shapiro (1956), données BRVM/CREPMF
 * Route : GET /market/brvm/tools/dividends
 *         GET /market/brvm/:symbol/dividend
 */
import { BRVM_COMPANIES } from './brvm.provider'

export interface BRVMDividendData {
  symbol:           string
  name:             string
  currentPrice:     number
  lastDividend:     number
  currentYield:     number
  payoutRatio?:     number
  history:          { year: number; amount: number; yield?: number }[]
  consistency:      number
  exDividendDate?:  string
  paymentDate?:     string
  gordonFairValue?: number
  sector:           string
  country:          string
  qualified:        boolean
}

// Source : rapports annuels BRVM + CREPMF — montants en XOF/action
const DIVIDEND_DB: Record<string, {
  payoutRatio?: number; exDate?: string; payDate?: string
  history: { year: number; amount: number }[]
}> = {
  'SNTS':  { payoutRatio:87, exDate:'2024-06-15', payDate:'2024-07-01', history:[{year:2023,amount:11_500},{year:2022,amount:11_000},{year:2021,amount:10_500},{year:2020,amount:8_000},{year:2019,amount:10_000},{year:2018,amount:9_500}] },
  'SLBC':  { payoutRatio:80, history:[{year:2023,amount:19_000},{year:2022,amount:17_500},{year:2021,amount:15_000},{year:2020,amount:12_000},{year:2019,amount:14_000}] },
  'SGBC':  { payoutRatio:60, exDate:'2024-05-20', payDate:'2024-06-10', history:[{year:2023,amount:2_800},{year:2022,amount:2_500},{year:2021,amount:2_200},{year:2020,amount:1_800},{year:2019,amount:2_300}] },
  'ETIT':  { payoutRatio:55, history:[{year:2023,amount:950},{year:2022,amount:850},{year:2021,amount:700},{year:2020,amount:500},{year:2019,amount:800}] },
  'ONTBF': { payoutRatio:75, history:[{year:2023,amount:2_200},{year:2022,amount:2_000},{year:2021,amount:1_800},{year:2020,amount:1_500},{year:2019,amount:1_900}] },
  'BOABF': { payoutRatio:50, history:[{year:2023,amount:650},{year:2022,amount:580},{year:2021,amount:500},{year:2020,amount:400},{year:2019,amount:550}] },
  'CIEC':  { payoutRatio:70, history:[{year:2023,amount:950},{year:2022,amount:900},{year:2021,amount:800},{year:2020,amount:650},{year:2019,amount:850}] },
  'TTLC':  { payoutRatio:65, history:[{year:2023,amount:1_100},{year:2022,amount:1_050},{year:2021,amount:900},{year:2020,amount:700},{year:2019,amount:950}] },
  'PALC':  { payoutRatio:60, history:[{year:2023,amount:620},{year:2022,amount:700},{year:2021,amount:550},{year:2020,amount:450},{year:2019,amount:580}] },
  'SIBS':  { payoutRatio:55, history:[{year:2023,amount:500},{year:2022,amount:450},{year:2021,amount:400},{year:2020,amount:300}] },
  'TTLS':  { payoutRatio:70, history:[{year:2023,amount:900},{year:2022,amount:850},{year:2021,amount:750},{year:2020,amount:600}] },
  'BICC':  { payoutRatio:45, history:[{year:2023,amount:350},{year:2022,amount:320},{year:2021,amount:280}] },
  'SAPH':  { payoutRatio:55, history:[{year:2023,amount:480},{year:2022,amount:520},{year:2021,amount:400},{year:2020,amount:300}] },
  'ORGT':  { payoutRatio:50, history:[{year:2023,amount:280},{year:2022,amount:250},{year:2021,amount:200}] },
  'UNXC':  { payoutRatio:80, history:[{year:2023,amount:600},{year:2022,amount:580},{year:2021,amount:500},{year:2020,amount:400}] },
}

export function computeDividendData(symbol: string, currentPrice: number): BRVMDividendData {
  const db   = DIVIDEND_DB[symbol]
  const info = BRVM_COMPANIES[symbol] ?? { name: symbol, sector: 'Autre', country: 'UEMOA' }
  const last = db?.history?.[0]?.amount ?? 0
  const yield_ = currentPrice > 0 && last > 0
    ? parseFloat(((last / currentPrice) * 100).toFixed(2)) : 0

  const hist3  = (db?.history ?? []).slice(0, 3)
  const avgDiv = hist3.length > 0 ? hist3.reduce((s, h) => s + h.amount, 0) / hist3.length : 0
  const histAll = db?.history ?? []

  let g = 0
  if (histAll.length >= 2) {
    const oldest = histAll[histAll.length - 1].amount
    const newest = histAll[0].amount
    if (oldest > 0 && newest > oldest) {
      g = Math.min(Math.pow(newest / oldest, 1 / (histAll.length - 1)) - 1, 0.08)
    }
  }

  const k  = 0.10
  const D1 = avgDiv * (1 + g)
  const gordonFV = D1 > 0 && k > g ? Math.round(D1 / (k - g)) : undefined

  return {
    symbol,
    name:           info.name,
    currentPrice,
    lastDividend:   last,
    currentYield:   yield_,
    payoutRatio:    db?.payoutRatio,
    history: (db?.history ?? []).map(h => ({
      year: h.year, amount: h.amount,
      yield: currentPrice > 0 ? parseFloat(((h.amount / currentPrice) * 100).toFixed(2)) : undefined,
    })),
    consistency:     db?.history?.length ?? 0,
    exDividendDate:  db?.exDate,
    paymentDate:     db?.payDate,
    gordonFairValue: gordonFV,
    sector:          info.sector,
    country:         info.country,
    qualified:       (db?.history?.length ?? 0) >= 3,
  }
}
