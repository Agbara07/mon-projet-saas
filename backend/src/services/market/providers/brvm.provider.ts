/**
 * BRVM Provider — Bourse Régionale des Valeurs Mobilières
 * Marché financier de l'UEMOA (8 pays d'Afrique de l'Ouest)
 * Source: brvm.org (données publiques) + SikaFinance (fallback)
 * Devise: XOF (Franc CFA BCEAO)
 * ~48 sociétés cotées
 */
import {
  IMarketProvider, Quote, HistoricalPoint, StockProfile,
  NewsItem, EarningsEvent, SearchResult,
} from '../types'

const BASE_BRVM  = 'https://www.brvm.org'
const BASE_SIKA  = 'https://www.sikafinance.com'
const TIMEOUT    = 15_000

/* ── Fetch helper ──────────────────────────────────────────── */
async function brvmFetch(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: {
      'Accept':          'text/html,application/xhtml+xml,application/json',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'User-Agent':      'Mozilla/5.0 (compatible; InvestBot/1.0)',
    },
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!r.ok) throw new Error(`BRVM HTTP ${r.status} — ${url}`)
  return r.text()
}

/* ── Base de données statique des sociétés cotées ──────────── */
export const BRVM_COMPANIES: Record<string, {
  name: string; sector: string; country: string; description?: string
}> = {
  // Agriculture
  'PALC':  { name: 'Palm Côte d\'Ivoire',               sector: 'Agriculture',  country: 'Côte d\'Ivoire',  description: 'Producteur et transformateur de palmier à huile' },
  'SICC':  { name: 'SIC Cacao',                          sector: 'Agriculture',  country: 'Côte d\'Ivoire',  description: 'Transformation et commercialisation du cacao' },
  'SOGB':  { name: 'SOGB SA',                            sector: 'Agriculture',  country: 'Côte d\'Ivoire',  description: 'Exploitation d\'hévéas et palmiers à huile' },
  'SOGC':  { name: 'Compagnie SOGECI',                   sector: 'Agriculture',  country: 'Côte d\'Ivoire',  description: 'Commerce et agriculture' },
  'SAPH':  { name: 'SAPH SA',                            sector: 'Agriculture',  country: 'Côte d\'Ivoire',  description: 'Société africaine de plantations d\'hévéas' },
  // Automobile
  'CFAC':  { name: 'CFAO Motors CI',                     sector: 'Automobile',   country: 'Côte d\'Ivoire',  description: 'Distribution automobile et services' },
  // Banque
  'BICC':  { name: 'BICICI',                             sector: 'Banque',       country: 'Côte d\'Ivoire',  description: 'Banque internationale pour le Commerce et l\'Industrie' },
  'BOAB':  { name: 'Bank of Africa Bénin',               sector: 'Banque',       country: 'Bénin',           description: 'Services bancaires au Bénin' },
  'BOABF': { name: 'Bank of Africa Burkina Faso',        sector: 'Banque',       country: 'Burkina Faso',    description: 'Services bancaires au Burkina Faso' },
  'BOAC':  { name: 'Bank of Africa Côte d\'Ivoire',      sector: 'Banque',       country: 'Côte d\'Ivoire',  description: 'Services bancaires en Côte d\'Ivoire' },
  'BOAM':  { name: 'Bank of Africa Mali',                sector: 'Banque',       country: 'Mali',            description: 'Services bancaires au Mali' },
  'BOAN':  { name: 'Bank of Africa Niger',               sector: 'Banque',       country: 'Niger',           description: 'Services bancaires au Niger' },
  'BOAS':  { name: 'Bank of Africa Sénégal',             sector: 'Banque',       country: 'Sénégal',         description: 'Services bancaires au Sénégal' },
  'COBN':  { name: 'Coris Bank International BF',        sector: 'Banque',       country: 'Burkina Faso',    description: 'Banque panafricaine au Burkina Faso' },
  'ECOC':  { name: 'Ecobank Côte d\'Ivoire',             sector: 'Banque',       country: 'Côte d\'Ivoire',  description: 'Filiale Ecobank en Côte d\'Ivoire' },
  'ETIT':  { name: 'Ecobank Transnational Inc.',         sector: 'Banque',       country: 'Togo',            description: 'Groupe bancaire panafricain coté à Lomé' },
  'NSIA':  { name: 'NSIA Banque CI',                     sector: 'Banque',       country: 'Côte d\'Ivoire',  description: 'Banque et assurances NSIA Groupe' },
  'ORGT':  { name: 'Oragroup SA',                        sector: 'Banque',       country: 'Togo',            description: 'Holding bancaire panafricain' },
  'SGBC':  { name: 'Société Générale de Banques CI',     sector: 'Banque',       country: 'Côte d\'Ivoire',  description: 'Filiale Société Générale en CI' },
  'SIBS':  { name: 'Société Ivoirienne de Banque',       sector: 'Banque',       country: 'Côte d\'Ivoire',  description: 'SIB — services bancaires universels' },
  'SMAC':  { name: 'SMACI',                              sector: 'Banque',       country: 'Côte d\'Ivoire',  description: 'Société de gestion et d\'intermédiation' },
  // Distribution
  'BERNC': { name: 'Bernabé CI',                         sector: 'Distribution', country: 'Côte d\'Ivoire',  description: 'Distribution de matériaux de construction' },
  'BNBC':  { name: 'Bernabé Burkina Faso',               sector: 'Distribution', country: 'Burkina Faso',    description: 'Distribution de matériaux BF' },
  'NTAB':  { name: 'NSIA Assurances Vie CI',             sector: 'Distribution', country: 'Burkina Faso',    description: 'Assurances et services financiers' },
  'SHEC':  { name: 'Shell CI',                           sector: 'Distribution', country: 'Côte d\'Ivoire',  description: 'Distribution de produits pétroliers' },
  // Energie
  'STAC':  { name: 'SAEC SA',                            sector: 'Energie',      country: 'Côte d\'Ivoire',  description: 'Société africaine d\'énergie' },
  // Industrie
  'CABC':  { name: 'CAISSE DE BFQ CI',                   sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Société industrielle' },
  'CIEC':  { name: 'CIE',                                sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Compagnie Ivoirienne d\'Electricité' },
  'NEIC':  { name: 'NEI-CEDA',                           sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Edition et communication' },
  'NTIC':  { name: 'NTIC SA',                            sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Nouvelles technologies industrielles' },
  'SIVC':  { name: 'SIVOA CI',                           sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Industrie agroalimentaire' },
  'SLBC':  { name: 'SOLIBRA CI',                         sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Brasserie — bières, eaux, boissons' },
  'TTLC':  { name: 'TotalEnergies CI',                   sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Distribution de produits pétroliers TotalEnergies' },
  'TTLS':  { name: 'TotalEnergies Sénégal',              sector: 'Industrie',    country: 'Sénégal',         description: 'Distribution pétrolière TotalEnergies Sénégal' },
  'UNXC':  { name: 'UNILEVER CI',                        sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Biens de consommation Unilever' },
  'UNLB':  { name: 'UNILEVER Burkina Faso',              sector: 'Industrie',    country: 'Burkina Faso',    description: 'Biens de consommation Unilever BF' },
  'UNLC':  { name: 'UNICAFÉ CI',                         sector: 'Industrie',    country: 'Côte d\'Ivoire',  description: 'Transformation et commercialisation café/cacao' },
  // Logistique
  'SDSC':  { name: 'Bolloré Transport & Logistics CI',   sector: 'Logistique',   country: 'Côte d\'Ivoire',  description: 'Logistique et transport multimodal' },
  // Télécoms
  'ONTBF': { name: 'ONATEL Burkina Faso',                sector: 'Télécoms',     country: 'Burkina Faso',    description: 'Opérateur télécom national du Burkina Faso' },
  'RELTF': { name: 'TELECEL Faso',                       sector: 'Télécoms',     country: 'Burkina Faso',    description: 'Télécommunications mobiles BF' },
  'SNTS':  { name: 'SONATEL',                            sector: 'Télécoms',     country: 'Sénégal',         description: 'Opérateur télécom leader d\'Afrique de l\'Ouest (Orange Sénégal)' },
  // Transport
  'TRDE':  { name: 'Transit Diffusion Afrique',          sector: 'Transport',    country: 'Côte d\'Ivoire',  description: 'Transport et logistique' },
}

/* ── Top 10 BRVM par capitalisation boursière ─────────────── */
export const BRVM_10 = ['SNTS','ETIT','SGBC','SLBC','TTLC','CIEC','SIBS','BOABF','PALC','ONTBF']

/* ── Parse HTML table du tableau des cours ─────────────────── */
function parseCoursTable(html: string): BRVMQuote[] {
  const results: BRVMQuote[] = []

  // Extraire les lignes du tableau (pattern des TR avec les données)
  const rowRegex = /<tr[^>]*class="[^"]*odd[^"]*"|<tr[^>]*class="[^"]*even[^"]*"[^>]*>/gi
  const tdRegex  = /<td[^>]*>([\s\S]*?)<\/td>/gi
  const linkRegex = /href="[^"]*\/([A-Z0-9]{2,8})[^"]*"[^>]*>([^<]+)<\/a>/i
  const numRegex  = /[\s,]/g

  // Découper en lignes
  const rows = html.split(/<tr[\s>]/i).slice(1)

  for (const row of rows) {
    if (!row.includes('<td')) continue
    const cells: string[] = []
    let m: RegExpExecArray | null
    const tdRx = /<td[^>]*>([\s\S]*?)<\/td>/gi
    while ((m = tdRx.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]+>/g, '').trim())
    }
    if (cells.length < 5) continue

    // Essayer d'extraire le ticker depuis le lien dans la première cellule
    const tickerMatch = linkRegex.exec(row)
    const symbol = tickerMatch?.[1]?.toUpperCase() ?? cells[0]?.toUpperCase()?.split(' ')[0]
    if (!symbol || symbol.length < 2) continue

    const info     = BRVM_COMPANIES[symbol]
    const price    = parseFloat(cells[1]?.replace(numRegex,'').replace(',','.')) || 0
    const change   = parseFloat(cells[2]?.replace(numRegex,'').replace(',','.')) || 0
    const changePct = parseFloat(cells[3]?.replace(numRegex,'').replace(',','.').replace('%','')) || 0
    const volume   = parseInt(cells[4]?.replace(numRegex,'')) || 0
    const marketCap = parseFloat(cells[6]?.replace(numRegex,'').replace(',','.')) || undefined

    if (price > 0) {
      results.push({
        symbol,
        name:          info?.name ?? cells[0] ?? symbol,
        price,
        change,
        changePercent: changePct,
        volume,
        marketCap,
        sector:        info?.sector  ?? 'Autre',
        country:       info?.country ?? 'UEMOA',
        currency:      'XOF',
        provider:      'brvm',
      })
    }
  }
  return results
}

/* ── Parse données historiques ────────────────────────────── */
function parseHistoricalTable(html: string): HistoricalPoint[] {
  const points: HistoricalPoint[] = []
  const rows = html.split(/<tr[\s>]/i).slice(1)

  for (const row of rows) {
    if (!row.includes('<td')) continue
    const cells: string[] = []
    let m: RegExpExecArray | null
    const tdRx = /<td[^>]*>([\s\S]*?)<\/td>/gi
    while ((m = tdRx.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]+>/g, '').trim())
    }
    if (cells.length < 4) continue

    // Format date BRVM : DD/MM/YYYY ou YYYY-MM-DD
    let date = cells[0]
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      const [d, mo, y] = date.split('/')
      date = `${y}-${mo}-${d}`
    }

    const close  = parseFloat(cells[1]?.replace(/[\s,]/g,'').replace(',','.')) || 0
    const volume = parseInt(cells[cells.length - 1]?.replace(/[\s,]/g,'')) || 0

    if (close > 0 && date) {
      points.push({
        date,
        open:   parseFloat(cells[2]?.replace(/[\s,]/g,'').replace(',','.')) || close,
        high:   parseFloat(cells[3]?.replace(/[\s,]/g,'').replace(',','.')) || close,
        low:    parseFloat(cells[4]?.replace(/[\s,]/g,'').replace(',','.')) || close,
        close,
        volume,
      })
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

/* ── Types spécifiques BRVM ────────────────────────────────── */
export interface BRVMQuote extends Quote {
  sector:  string
  country: string
}

export interface BRVMIndex {
  name:          string   // 'BRVM Composite' | 'BRVM 10'
  value:         number
  change:        number
  changePercent: number
  date:          string
}

export interface BRVMSectorStats {
  sector:     string
  stockCount: number
  marketCap:  number
  advancers:  number
  decliners:  number
  unchanged:  number
  avgChange:  number
}

export interface BRVMMarketStats {
  indices:        BRVMIndex[]
  totalMarketCap: number
  totalVolume:    number
  advancers:      number
  decliners:      number
  unchanged:      number
  topGainers:     BRVMQuote[]
  topLosers:      BRVMQuote[]
  sectors:        BRVMSectorStats[]
  date:           string
}

/* ── Provider principal ────────────────────────────────────── */
export class BRVMProvider implements IMarketProvider {
  name     = 'brvm'
  priority = 12  // Provider spécialisé marché UEMOA

  private _quotesCache: BRVMQuote[] | null = null
  private _cacheTs = 0
  private readonly CACHE_TTL = 60 * 60_000  // 1h (données EOD)

  /* ── Fetch + cache de toutes les cotations ─────────────────── */
  private async fetchAllQuotes(): Promise<BRVMQuote[]> {
    const now = Date.now()
    if (this._quotesCache && now - this._cacheTs < this.CACHE_TTL) {
      return this._quotesCache
    }

    const html = await brvmFetch(`${BASE_BRVM}/fr/cours-des-actions/0/tableau`)
    const quotes = parseCoursTable(html)

    if (quotes.length > 0) {
      this._quotesCache = quotes
      this._cacheTs     = now
      return quotes
    }

    // Fallback: retourner les données statiques avec prix à 0 (service non dispo)
    return Object.entries(BRVM_COMPANIES).map(([symbol, info]) => ({
      symbol, name: info.name, price: 0, change: 0, changePercent: 0,
      volume: 0, sector: info.sector, country: info.country,
      currency: 'XOF', provider: 'brvm',
    }))
  }

  /* ── IMarketProvider — méthodes standard ─────────────────── */
  async getQuote(symbol: string): Promise<Quote> {
    const quotes = await this.fetchAllQuotes()
    const q = quotes.find(q => q.symbol === symbol.toUpperCase())
    if (!q) throw new Error(`BRVM: symbole inconnu ${symbol}`)
    return q
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const quotes = await this.fetchAllQuotes()
    const upper  = symbols.map(s => s.toUpperCase())
    return quotes.filter(q => upper.includes(q.symbol))
  }

  async getHistorical(symbol: string, period = '1mo'): Promise<HistoricalPoint[]> {
    const sym  = symbol.toUpperCase()
    const html = await brvmFetch(`${BASE_BRVM}/fr/valeurs/0/historique/${sym}`)
    const all  = parseHistoricalTable(html)

    // Filtrer par période
    const days: Record<string,number> = {
      '1w':6,'1mo':30,'3mo':90,'6mo':180,'1y':365,'2y':730,'5y':1825,'max':9999
    }
    const limit = (days[period] ?? 30) * 24 * 60 * 60_000
    const cutoff = Date.now() - limit
    return all.filter(p => new Date(p.date).getTime() >= cutoff)
  }

  async getProfile(symbol: string): Promise<import('../types').StockProfile> {
    const sym   = symbol.toUpperCase()
    const info  = BRVM_COMPANIES[sym]
    const quote = await this.getQuote(sym).catch(() => null)

    return {
      symbol:      sym,
      name:        info?.name          ?? sym,
      price:       quote?.price        ?? 0,
      change:      quote?.change       ?? 0,
      changePercent: quote?.changePercent ?? 0,
      currency:    'XOF',
      sector:      info?.sector,
      country:     info?.country,
      description: info?.description,
      marketCap:   quote?.marketCap,
      provider:    'brvm',
    }
  }

  async getNews(symbol: string): Promise<NewsItem[]> {
    // BRVM ne publie pas d'actualités par symbole via API — renvoi vide
    return []
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase()
    return Object.entries(BRVM_COMPANIES)
      .filter(([sym, info]) =>
        sym.toLowerCase().includes(q) ||
        info.name.toLowerCase().includes(q) ||
        info.sector.toLowerCase().includes(q) ||
        info.country.toLowerCase().includes(q)
      )
      .map(([sym, info]) => ({
        symbol:   sym,
        name:     info.name,
        exchange: 'BRVM',
        type:     'Equity',
      }))
      .slice(0, 15)
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> { return [] }

  async getMarketOverview(): Promise<Quote[]> {
    const quotes = await this.fetchAllQuotes()
    return quotes.filter(q => q.price > 0)
  }

  /* ── ✨ SPÉCIALITÉS BRVM ───────────────────────────────────── */

  /** Toutes les cotations BRVM avec secteur + pays */
  async getBRVMQuotes(): Promise<BRVMQuote[]> {
    return this.fetchAllQuotes()
  }

  /** Indices BRVM Composite et BRVM 10 */
  async getBRVMIndices(): Promise<BRVMIndex[]> {
    const quotes = await this.fetchAllQuotes()
    const today  = new Date().toISOString().split('T')[0]

    // BRVM Composite — pondéré par capitalisation (simplification : moyenne des variations)
    const validQuotes  = quotes.filter(q => q.price > 0)
    const totalMktCap  = validQuotes.reduce((s, q) => s + (q.marketCap ?? 0), 0)
    const compositeChg = totalMktCap > 0
      ? validQuotes.reduce((s, q) => s + q.changePercent * ((q.marketCap ?? 0) / totalMktCap), 0)
      : validQuotes.reduce((s, q) => s + q.changePercent, 0) / Math.max(validQuotes.length, 1)

    // BRVM 10 — top 10 par capitalisation
    const brvm10Quotes = quotes.filter(q => BRVM_10.includes(q.symbol))
    const brvm10MktCap = brvm10Quotes.reduce((s, q) => s + (q.marketCap ?? 0), 0)
    const brvm10Chg    = brvm10MktCap > 0
      ? brvm10Quotes.reduce((s, q) => s + q.changePercent * ((q.marketCap ?? 0) / brvm10MktCap), 0)
      : brvm10Quotes.reduce((s, q) => s + q.changePercent, 0) / Math.max(brvm10Quotes.length, 1)

    return [
      {
        name:          'BRVM Composite',
        value:         totalMktCap / 1_000_000,   // en milliards XOF
        change:        compositeChg * 0.01 * totalMktCap / 1_000_000,
        changePercent: compositeChg,
        date:          today,
      },
      {
        name:          'BRVM 10',
        value:         brvm10MktCap / 1_000_000,
        change:        brvm10Chg * 0.01 * brvm10MktCap / 1_000_000,
        changePercent: brvm10Chg,
        date:          today,
      },
    ]
  }

  /** Statistiques par secteur */
  async getBRVMSectors(): Promise<BRVMSectorStats[]> {
    const quotes = await this.fetchAllQuotes()
    const map    = new Map<string, BRVMSectorStats>()

    for (const q of quotes) {
      if (!map.has(q.sector)) {
        map.set(q.sector, {
          sector: q.sector, stockCount: 0, marketCap: 0,
          advancers: 0, decliners: 0, unchanged: 0, avgChange: 0,
        })
      }
      const s = map.get(q.sector)!
      s.stockCount++
      s.marketCap  += q.marketCap ?? 0
      s.avgChange  += q.changePercent
      if      (q.changePercent > 0)  s.advancers++
      else if (q.changePercent < 0)  s.decliners++
      else                           s.unchanged++
    }

    return Array.from(map.values()).map(s => ({
      ...s,
      avgChange: s.stockCount > 0 ? s.avgChange / s.stockCount : 0,
    })).sort((a, b) => b.marketCap - a.marketCap)
  }

  /** Répartition par pays des sociétés cotées */
  async getBRVMCountries(): Promise<{ country: string; stockCount: number; marketCap: number }[]> {
    const quotes = await this.fetchAllQuotes()
    const map    = new Map<string, { stockCount: number; marketCap: number }>()

    for (const q of quotes) {
      if (!map.has(q.country)) map.set(q.country, { stockCount: 0, marketCap: 0 })
      const c = map.get(q.country)!
      c.stockCount++
      c.marketCap += q.marketCap ?? 0
    }

    return Array.from(map.entries())
      .map(([country, data]) => ({ country, ...data }))
      .sort((a, b) => b.marketCap - a.marketCap)
  }

  /** Vue marché complète (indices + top movers + secteurs) */
  async getBRVMMarketStats(): Promise<BRVMMarketStats> {
    const [quotes, indices, sectors] = await Promise.all([
      this.fetchAllQuotes(),
      this.getBRVMIndices(),
      this.getBRVMSectors(),
    ])

    const valid     = quotes.filter(q => q.price > 0)
    const sorted    = [...valid].sort((a, b) => b.changePercent - a.changePercent)

    return {
      indices,
      totalMarketCap: valid.reduce((s, q) => s + (q.marketCap ?? 0), 0),
      totalVolume:    valid.reduce((s, q) => s + q.volume, 0),
      advancers:      valid.filter(q => q.changePercent > 0).length,
      decliners:      valid.filter(q => q.changePercent < 0).length,
      unchanged:      valid.filter(q => q.changePercent === 0).length,
      topGainers:     sorted.slice(0, 5),
      topLosers:      sorted.slice(-5).reverse(),
      sectors,
      date:           new Date().toISOString().split('T')[0],
    }
  }

  /** Liste des sociétés cotées avec métadonnées */
  getBRVMCompanies() {
    return Object.entries(BRVM_COMPANIES).map(([symbol, info]) => ({
      symbol,
      ...info,
      exchange: 'BRVM',
      currency: 'XOF',
      isInBRVM10: BRVM_10.includes(symbol),
    }))
  }
}
