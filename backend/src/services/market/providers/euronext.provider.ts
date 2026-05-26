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

/* ── ETF proxies pour indices européens (US-listed, free tier OK) ── */
const INDEX_PROXIES = [
  { symbol: 'EWQ', name: 'CAC 40',        country: 'France',      flag: '🇫🇷' },
  { symbol: 'EWG', name: 'DAX',           country: 'Allemagne',   flag: '🇩🇪' },
  { symbol: 'EWU', name: 'FTSE 100',      country: 'Royaume-Uni', flag: '🇬🇧' },
  { symbol: 'FEZ', name: 'Euro Stoxx 50', country: 'Europe',      flag: '🇪🇺' },
  { symbol: 'EWN', name: 'AEX',           country: 'Pays-Bas',    flag: '🇳🇱' },
  { symbol: 'EWI', name: 'FTSE MIB',      country: 'Italie',      flag: '🇮🇹' },
  { symbol: 'EWP', name: 'IBEX 35',       country: 'Espagne',     flag: '🇪🇸' },
]

/* ── Paires forex ────────────────────────────────────────────── */
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

/* ── open.er-api.com — taux EUR/* (BCE, gratuit, sans clé) ───── */
// Alternative robuste à Finnhub OANDA et Frankfurter (problèmes sur Railway).
// Données BCE, 1500 req/mois sans clé, pas de blocage cloud.
async function erApiRates(): Promise<Record<string, number>> {
  const r = await fetch('https://open.er-api.com/v6/latest/EUR', {
    headers: { 'User-Agent': 'InvestSaaS/1.0' },
    signal: AbortSignal.timeout(8_000),
  })
  if (!r.ok) throw new Error(`ExchangeRate API HTTP ${r.status}`)
  const data = (await r.json()) as any
  if (data.result !== 'success') throw new Error('ExchangeRate API: résultat non valide')
  return data.rates ?? {}
}

/* ── API publique ────────────────────────────────────────────── */

export async function getCAC40Quotes() {
  const symbols = CAC40_COMPONENTS.map(c => c.symbol)
  // marketRouter.getQuotes() cascade désormais à travers tous les providers
  // jusqu'à ce que chaque symbole soit résolu (fix bug "empty array = success").
  // TwelveData / EODHD prendront le relais après Finnhub pour les .PA.
  const quotes = await marketRouter.getQuotes(symbols)
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
  try {
    const rates = await erApiRates()
    return FOREX_PAIRS
      .filter(p => rates[p.code] != null)
      .map(p => ({
        symbol:        `EUR_${p.code}`,
        name:          p.name,
        base:          p.base,
        quote:         p.quote,
        price:         rates[p.code],
        // open.er-api free tier ne fournit pas de variation journalière
        change:        0,
        changePercent: 0,
      }))
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
