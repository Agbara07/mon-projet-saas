import { marketRouter } from '../market-router'

/* ── CAC 40 components (Euronext Paris, suffixe .PA) ─────────── */
export const CAC40_COMPONENTS: { symbol: string; name: string; sector: string }[] = [
  { symbol: 'MC.PA',   name: 'LVMH',                  sector: 'Luxe' },
  { symbol: 'TTE.PA',  name: 'TotalEnergies',          sector: 'Énergie' },
  { symbol: 'SAN.PA',  name: 'Sanofi',                 sector: 'Santé' },
  { symbol: 'AIR.PA',  name: 'Airbus',                 sector: 'Industrie' },
  { symbol: 'BNP.PA',  name: 'BNP Paribas',            sector: 'Finance' },
  { symbol: 'OR.PA',   name: "L'Oréal",                sector: 'Consommation' },
  { symbol: 'AI.PA',   name: 'Air Liquide',             sector: 'Matériaux' },
  { symbol: 'SU.PA',   name: 'Schneider Electric',      sector: 'Industrie' },
  { symbol: 'EL.PA',   name: 'EssilorLuxottica',        sector: 'Santé' },
  { symbol: 'RMS.PA',  name: 'Hermès',                  sector: 'Luxe' },
  { symbol: 'KER.PA',  name: 'Kering',                  sector: 'Luxe' },
  { symbol: 'DSY.PA',  name: 'Dassault Systèmes',       sector: 'Technologie' },
  { symbol: 'CAP.PA',  name: 'Capgemini',               sector: 'Technologie' },
  { symbol: 'SGO.PA',  name: 'Saint-Gobain',            sector: 'Matériaux' },
  { symbol: 'ACA.PA',  name: 'Crédit Agricole',         sector: 'Finance' },
  { symbol: 'GLE.PA',  name: 'Société Générale',        sector: 'Finance' },
  { symbol: 'RI.PA',   name: 'Pernod Ricard',           sector: 'Consommation' },
  { symbol: 'VIE.PA',  name: 'Veolia',                  sector: 'Énergie' },
  { symbol: 'DG.PA',   name: 'Vinci',                   sector: 'Industrie' },
  { symbol: 'LR.PA',   name: 'Legrand',                 sector: 'Industrie' },
  { symbol: 'STM.PA',  name: 'STMicroelectronics',      sector: 'Technologie' },
  { symbol: 'PUB.PA',  name: 'Publicis',                sector: 'Média' },
  { symbol: 'EDEN.PA', name: 'Edenred',                 sector: 'Services' },
  { symbol: 'ERF.PA',  name: 'Eurofins Scientific',     sector: 'Santé' },
  { symbol: 'EN.PA',   name: 'Bouygues',                sector: 'Industrie' },
  { symbol: 'CS.PA',   name: 'AXA',                     sector: 'Finance' },
  { symbol: 'RNO.PA',  name: 'Renault',                 sector: 'Automobile' },
  { symbol: 'SAF.PA',  name: 'Safran',                  sector: 'Défense' },
  { symbol: 'HO.PA',   name: 'Thales',                  sector: 'Défense' },
  { symbol: 'ML.PA',   name: 'Michelin',                sector: 'Automobile' },
  { symbol: 'URW.PA',  name: 'Unibail-Rodamco',         sector: 'Immobilier' },
  { symbol: 'VIV.PA',  name: 'Vivendi',                 sector: 'Média' },
  { symbol: 'WLN.PA',  name: 'Worldline',               sector: 'Technologie' },
  { symbol: 'ORA.PA',  name: 'Orange',                  sector: 'Télécoms' },
  { symbol: 'TEP.PA',  name: 'Teleperformance',         sector: 'Services' },
  { symbol: 'ATO.PA',  name: 'Atos',                    sector: 'Technologie' },
  { symbol: 'SW.PA',   name: 'Sodexo',                  sector: 'Services' },
  { symbol: 'SLB.PA',  name: 'SEB',                     sector: 'Consommation' },
  { symbol: 'AM.PA',   name: 'Dassault Aviation',       sector: 'Défense' },
  { symbol: 'ENGI.PA', name: 'Engie',                   sector: 'Énergie' },
]

/* ── ETF proxies pour indices européens (Finnhub free tier OK) ── */
const INDEX_PROXIES = [
  { symbol: 'EWQ', name: 'CAC 40',        country: 'France',      flag: '🇫🇷' },
  { symbol: 'EWG', name: 'DAX',           country: 'Allemagne',   flag: '🇩🇪' },
  { symbol: 'EWU', name: 'FTSE 100',      country: 'Royaume-Uni', flag: '🇬🇧' },
  { symbol: 'FEZ', name: 'Euro Stoxx 50', country: 'Europe',      flag: '🇪🇺' },
  { symbol: 'EWN', name: 'AEX',           country: 'Pays-Bas',    flag: '🇳🇱' },
  { symbol: 'EWI', name: 'FTSE MIB',      country: 'Italie',      flag: '🇮🇹' },
  { symbol: 'EWP', name: 'IBEX 35',       country: 'Espagne',     flag: '🇪🇸' },
]

/* ── Paires forex via Finnhub ────────────────────────────────── */
const FOREX_PAIRS = [
  { symbol: 'OANDA:EUR_USD', name: 'EUR/USD', base: 'EUR', quote: 'USD' },
  { symbol: 'OANDA:EUR_GBP', name: 'EUR/GBP', base: 'EUR', quote: 'GBP' },
  { symbol: 'OANDA:EUR_CHF', name: 'EUR/CHF', base: 'EUR', quote: 'CHF' },
  { symbol: 'OANDA:EUR_JPY', name: 'EUR/JPY', base: 'EUR', quote: 'JPY' },
  { symbol: 'OANDA:EUR_CAD', name: 'EUR/CAD', base: 'EUR', quote: 'CAD' },
]

/* ── ETF proxies matières premières ─────────────────────────── */
const COMMODITY_PROXIES = [
  { symbol: 'GLD', name: 'Or',            unit: 'USD/oz' },
  { symbol: 'BNO', name: 'Brent',         unit: 'USD/b'  },
  { symbol: 'UNG', name: 'Gaz naturel',   unit: 'USD/MMBtu' },
  { symbol: 'PDBC', name: 'Matières 1ères', unit: 'USD' },
]

/* ── Fetch Finnhub direct (forex — hors IMarketProvider) ────── */
async function fhQuote(symbol: string): Promise<any> {
  const KEY = process.env.FINNHUB_API_KEY ?? ''
  if (!KEY) throw new Error('FINNHUB_API_KEY manquante')
  const r = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${KEY}`,
    { headers: { 'User-Agent': 'InvestSaaS/1.0' }, signal: AbortSignal.timeout(8_000) }
  )
  if (!r.ok) throw new Error(`Finnhub HTTP ${r.status} pour ${symbol}`)
  return r.json()
}

/* ── API publique ────────────────────────────────────────────── */

export async function getCAC40Quotes() {
  const symbols = CAC40_COMPONENTS.map(c => c.symbol)
  const quotes  = await marketRouter.getQuotes(symbols)
  return quotes.map(q => {
    const meta = CAC40_COMPONENTS.find(c => c.symbol === q.symbol)
    return {
      ...q,
      name:     meta?.name   ?? q.name,
      sector:   meta?.sector ?? '',
      currency: 'EUR',
    }
  }).filter(q => q.price > 0)
}

export async function getEuropeanIndices() {
  const symbols = INDEX_PROXIES.map(i => i.symbol)
  const quotes  = await marketRouter.getQuotes(symbols)
  return quotes
    .filter(q => q.price > 0)
    .map(q => {
      const meta = INDEX_PROXIES.find(i => i.symbol === q.symbol)!
      return { ...q, name: meta.name, country: meta.country, flag: meta.flag }
    })
}

export async function getEuropeanForex() {
  const results = await Promise.allSettled(
    FOREX_PAIRS.map(async pair => {
      const data = await fhQuote(pair.symbol)
      if (!data?.c) throw new Error(`Pas de données forex pour ${pair.symbol}`)
      return {
        symbol:        pair.symbol,
        name:          pair.name,
        base:          pair.base,
        quote:         pair.quote,
        price:         data.c,
        change:        data.d  ?? 0,
        changePercent: data.dp ?? 0,
      }
    })
  )
  return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
}

export async function getEuropeanCommodities() {
  const symbols = COMMODITY_PROXIES.map(c => c.symbol)
  const quotes  = await marketRouter.getQuotes(symbols)
  return quotes
    .filter(q => q.price > 0)
    .map(q => {
      const meta = COMMODITY_PROXIES.find(c => c.symbol === q.symbol)!
      return { ...q, name: meta.name, unit: meta.unit }
    })
}

export async function getEuropeanPalmares() {
  const quotes = await getCAC40Quotes()
  const sorted = [...quotes].sort((a, b) => b.changePercent - a.changePercent)
  return {
    topGainers: sorted.slice(0, 5),
    topLosers:  sorted.slice(-5).reverse(),
    unchanged:  quotes.filter(q => Math.abs(q.changePercent) < 0.05),
    updatedAt:  new Date().toISOString(),
  }
}
