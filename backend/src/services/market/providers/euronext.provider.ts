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

/* ── ETF proxies pour indices européens (providers US free tier OK) ── */
const INDEX_PROXIES = [
  { symbol: 'EWQ', name: 'CAC 40',        country: 'France',      flag: '🇫🇷' },
  { symbol: 'EWG', name: 'DAX',           country: 'Allemagne',   flag: '🇩🇪' },
  { symbol: 'EWU', name: 'FTSE 100',      country: 'Royaume-Uni', flag: '🇬🇧' },
  { symbol: 'FEZ', name: 'Euro Stoxx 50', country: 'Europe',      flag: '🇪🇺' },
  { symbol: 'EWN', name: 'AEX',           country: 'Pays-Bas',    flag: '🇳🇱' },
  { symbol: 'EWI', name: 'FTSE MIB',      country: 'Italie',      flag: '🇮🇹' },
  { symbol: 'EWP', name: 'IBEX 35',       country: 'Espagne',     flag: '🇪🇸' },
]

/* ── Paires forex (code interne → noms affichage) ────────────── */
const FOREX_PAIRS = [
  { code: 'USD', name: 'EUR/USD', base: 'EUR', quote: 'USD' },
  { code: 'GBP', name: 'EUR/GBP', base: 'EUR', quote: 'GBP' },
  { code: 'CHF', name: 'EUR/CHF', base: 'EUR', quote: 'CHF' },
  { code: 'JPY', name: 'EUR/JPY', base: 'EUR', quote: 'JPY' },
  { code: 'CAD', name: 'EUR/CAD', base: 'EUR', quote: 'CAD' },
]

/* ── ETF proxies matières premières ─────────────────────────── */
const COMMODITY_PROXIES = [
  { symbol: 'GLD',  name: 'Or',              unit: 'USD/oz'    },
  { symbol: 'BNO',  name: 'Brent',           unit: 'USD/b'     },
  { symbol: 'UNG',  name: 'Gaz naturel',     unit: 'USD/MMBtu' },
  { symbol: 'PDBC', name: 'Matières 1ères',  unit: 'USD'       },
]

/* ── Yahoo Finance v8 — fetch direct pour actions .PA ────────── */
// Utilise l'API chart v8 (pas le package yahoo-finance2 — celui-ci a été
// désinstallé car son redirect handling était cassé sur Railway).
// fetch() natif gère les redirects correctement via redirect:'follow'.
async function yfQuote(symbol: string): Promise<{
  price: number; prevClose: number; volume: number; currency: string
}> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  })
  if (!r.ok) throw new Error(`Yahoo Finance HTTP ${r.status} pour ${symbol}`)
  const json: any = await r.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) throw new Error(`Pas de données Yahoo pour ${symbol}`)
  return {
    price:     meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice,
    volume:    meta.regularMarketVolume ?? 0,
    currency:  meta.currency ?? 'EUR',
  }
}

/* ── Frankfurter.app (BCE) — forex EUR/* sans clé API ────────── */
// Données officielles de la Banque Centrale Européenne, gratuites, sans clé.
async function ecbForexRates(): Promise<{
  today: Record<string, number>; yesterday: Record<string, number>
}> {
  const codes = FOREX_PAIRS.map(p => p.code).join(',')

  // Jour ouvré précédent pour le calcul de variation
  const prevDate = new Date()
  prevDate.setDate(prevDate.getDate() - 1)
  if (prevDate.getDay() === 0) prevDate.setDate(prevDate.getDate() - 2) // dimanche → vendredi
  if (prevDate.getDay() === 6) prevDate.setDate(prevDate.getDate() - 1) // samedi → vendredi
  const prev = prevDate.toISOString().split('T')[0]

  const [todayRes, prevRes] = await Promise.allSettled([
    fetch(`https://api.frankfurter.app/latest?from=EUR&to=${codes}`, {
      headers: { 'User-Agent': 'InvestSaaS/1.0' },
      signal: AbortSignal.timeout(8_000),
    }).then(r => r.ok ? (r.json() as Promise<any>) : Promise.reject(`HTTP ${r.status}`)),
    fetch(`https://api.frankfurter.app/${prev}?from=EUR&to=${codes}`, {
      headers: { 'User-Agent': 'InvestSaaS/1.0' },
      signal: AbortSignal.timeout(8_000),
    }).then(r => r.ok ? (r.json() as Promise<any>) : Promise.reject(`HTTP ${r.status}`)),
  ])

  const today     = todayRes.status === 'fulfilled' ? (todayRes.value as any)?.rates ?? {} : {}
  const yesterday = prevRes.status  === 'fulfilled' ? (prevRes.value  as any)?.rates ?? today : today

  return { today, yesterday }
}

/* ── API publique ────────────────────────────────────────────── */

export async function getCAC40Quotes() {
  const results = await Promise.allSettled(
    CAC40_COMPONENTS.map(async meta => {
      const q = await yfQuote(meta.symbol)
      const change        = q.price - q.prevClose
      const changePercent = q.prevClose > 0 ? (change / q.prevClose) * 100 : 0
      return {
        symbol:        meta.symbol,
        name:          meta.name,
        sector:        meta.sector,
        price:         q.price,
        change:        Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume:        q.volume,
        currency:      'EUR',
        provider:      'yahoo-v8',
      }
    })
  )
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as any).value)
    .filter((q: any) => q.price > 0)
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
  try {
    const { today, yesterday } = await ecbForexRates()
    return FOREX_PAIRS
      .filter(p => today[p.code] != null)
      .map(p => {
        const price   = today[p.code]
        const prev    = yesterday[p.code] ?? price
        const change        = Math.round((price - prev) * 10000) / 10000
        const changePercent = prev > 0 ? Math.round(((price - prev) / prev) * 10000) / 100 : 0
        return {
          symbol:        `OANDA:EUR_${p.code}`,
          name:          p.name,
          base:          p.base,
          quote:         p.quote,
          price,
          change,
          changePercent,
        }
      })
  } catch {
    return []
  }
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
