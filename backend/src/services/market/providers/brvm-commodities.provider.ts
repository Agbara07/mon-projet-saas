/**
 * OUTIL 3 — CORRÉLATION MATIÈRES PREMIÈRES BRVM
 * Réf : Ezzahid & Elouaourti (2020), ICE Futures, CME Group
 * Route : GET /market/brvm/tools/commodities
 *         GET /market/brvm/:symbol/commodity
 */
import { BRVM_COMPANIES } from './brvm.provider'

export interface BRVMCommodityCorrelation {
  symbol:            string
  name:              string
  primaryCommodity:  string
  commodityYFTicker: string
  correlation90d:    number
  correlation30d:    number
  divergence:        number
  signal:            'Sous-valorisé' | 'Juste valeur' | 'Sur-valorisé' | 'Non calculé'
  confidence:        'Haute' | 'Moyenne' | 'Faible'
  interpretation:    string
}

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const TIMEOUT  = 12_000

async function yfFetch(symbol: string, range = '3mo'): Promise<any> {
  const url = `${YF_BASE}/${symbol}?interval=1d&range=${range}`
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InvestBot/1.0)' },
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!r.ok) throw new Error(`YF ${r.status} for ${symbol}`)
  const json = await r.json()
  return (json as any)?.chart?.result?.[0]
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 5) return 0
  const mx = x.slice(0,n).reduce((s,v) => s+v, 0) / n
  const my = y.slice(0,n).reduce((s,v) => s+v, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my
    num += dx * dy; dx2 += dx*dx; dy2 += dy*dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? 0 : num / denom
}

function dailyReturns(prices: number[]): number[] {
  const r: number[] = []
  for (let i = 1; i < prices.length; i++) {
    if (prices[i-1] > 0) r.push((prices[i] - prices[i-1]) / prices[i-1])
  }
  return r
}

export const COMMODITY_MAP: Record<string, { ticker: string; name: string; unit: string; logic: string }> = {
  'PALC':  { ticker:'PALM',  name:'Huile de palme',     unit:'USD/tonne', logic:'Producteur direct — revenus indexés au prix international' },
  'SOGB':  { ticker:'PALM',  name:'Huile de palme',     unit:'USD/tonne', logic:'Exploitation hévéas & palmiers — double exposition' },
  'SOGC':  { ticker:'PALM',  name:'Huile de palme',     unit:'USD/tonne', logic:'Négociant agricole — prix CPO déterminant' },
  'SAPH':  { ticker:'RS=F',  name:'Caoutchouc naturel', unit:'JPY/kg',    logic:'Exploitant d\'hévéas — corrélation forte avec prix TOCOM' },
  'SICC':  { ticker:'CC=F',  name:'Cacao (ICE)',         unit:'USD/tonne', logic:'Transformateur de cacao — marges liées au prix spot ICE' },
  'TTLC':  { ticker:'BZ=F',  name:'Brent Crude Oil',    unit:'USD/bbl',   logic:'Distribution pétrolière — volumes et marges liés au baril' },
  'TTLS':  { ticker:'BZ=F',  name:'Brent Crude Oil',    unit:'USD/bbl',   logic:'Distribution pétrolière Sénégal — même logique' },
  'SHEC':  { ticker:'BZ=F',  name:'Brent Crude Oil',    unit:'USD/bbl',   logic:'Réseau de stations-service — sensible au prix pompe' },
  'SNTS':  { ticker:'GC=F',  name:'Or (Gold)',           unit:'USD/oz',    logic:'Corrélation inverse — or refuge vs risque Africa (proxy)' },
  'ONTBF': { ticker:'GC=F',  name:'Or (Gold)',           unit:'USD/oz',    logic:'Même logique macro — cyclique inverse de l\'aversion au risque' },
}

export async function fetchCommodityHistory(ticker: string): Promise<{ date: string; close: number }[]> {
  try {
    const data = await yfFetch(ticker, '3mo')
    if (!data?.timestamp || !data?.indicators?.quote?.[0]?.close) return []
    const timestamps: number[]        = data.timestamp
    const closes: (number|null)[]     = data.indicators.quote[0].close
    return timestamps
      .map((ts: number, i: number) => ({ date: new Date(ts*1000).toISOString().split('T')[0], close: closes[i] ?? 0 }))
      .filter(p => p.close > 0)
  } catch { return [] }
}

export async function computeCommodityCorrelation(
  symbol:      string,
  stockPrices: { date: string; close: number }[]
): Promise<BRVMCommodityCorrelation> {
  const info = BRVM_COMPANIES[symbol] ?? { name: symbol, sector: 'Autre', country: 'UEMOA' }
  const cmap = COMMODITY_MAP[symbol]

  const EMPTY: BRVMCommodityCorrelation = {
    symbol, name: info.name,
    primaryCommodity: 'N/A', commodityYFTicker: '',
    correlation90d: 0, correlation30d: 0,
    divergence: 0, signal: 'Non calculé',
    confidence: 'Faible', interpretation: 'Aucune matière première liée à ce titre',
  }

  if (!cmap) return EMPTY

  const commPrices = await fetchCommodityHistory(cmap.ticker)
  if (commPrices.length < 20 || stockPrices.length < 20) {
    return { ...EMPTY, primaryCommodity: cmap.name, commodityYFTicker: cmap.ticker,
      interpretation: 'Données insuffisantes pour calculer la corrélation' }
  }

  const commMap = new Map(commPrices.map(p => [p.date, p.close]))
  const aligned = stockPrices
    .filter(p => commMap.has(p.date) && p.close > 0)
    .map(p => ({ date: p.date, stock: p.close, comm: commMap.get(p.date)! }))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (aligned.length < 10) return { ...EMPTY, primaryCommodity: cmap.name,
    commodityYFTicker: cmap.ticker, interpretation: 'Peu de jours en commun (<10)' }

  const stockRet = dailyReturns(aligned.map(p => p.stock))
  const commRet  = dailyReturns(aligned.map(p => p.comm))
  const last30   = Math.max(0, aligned.length - 30)
  const corr90   = pearsonCorrelation(stockRet, commRet)
  const corr30   = pearsonCorrelation(stockRet.slice(last30), commRet.slice(last30))

  const startIdx = aligned.findIndex(p => p.date.startsWith(new Date().getFullYear().toString()))
  const idx0     = startIdx >= 0 ? startIdx : 0
  const stockYTD = aligned.length > 0 ? (aligned[aligned.length-1].stock - aligned[idx0].stock) / aligned[idx0].stock * 100 : 0
  const commYTD  = aligned.length > 0 ? (aligned[aligned.length-1].comm  - aligned[idx0].comm)  / aligned[idx0].comm  * 100 : 0
  const divergence = parseFloat((stockYTD - commYTD).toFixed(1))

  let signal: BRVMCommodityCorrelation['signal'] = 'Juste valeur'
  if (Math.abs(corr90) > 0.4) {
    if (divergence < -10) signal = 'Sous-valorisé'
    else if (divergence > 10) signal = 'Sur-valorisé'
  }

  const confidence: BRVMCommodityCorrelation['confidence'] =
    aligned.length >= 60 ? 'Haute' : aligned.length >= 30 ? 'Moyenne' : 'Faible'
  const corrSign     = corr90 > 0 ? 'positive' : 'négative'
  const corrStrength = Math.abs(corr90) > 0.7 ? 'forte' : Math.abs(corr90) > 0.4 ? 'modérée' : 'faible'

  return {
    symbol, name: info.name,
    primaryCommodity:  cmap.name,
    commodityYFTicker: cmap.ticker,
    correlation90d:    parseFloat(corr90.toFixed(3)),
    correlation30d:    parseFloat(corr30.toFixed(3)),
    divergence, signal, confidence,
    interpretation: `Corrélation ${corrStrength} ${corrSign} (r=${corr90.toFixed(2)}). ${cmap.logic}`,
  }
}
