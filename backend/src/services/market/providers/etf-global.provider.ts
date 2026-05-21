/**
 * ETF Global — Datasets ETF, analytics, holdings, performance
 * API : https://www.etfglobal.com/api
 * Données : ETF details, holdings, sector exposure, performance metrics
 */
import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://api.etfglobal.com/v1'
const KEY  = process.env.ETF_GLOBAL_API_KEY ?? ''

async function etfFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('ETF_GLOBAL_API_KEY manquante')
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${BASE}${path}${sep}apikey=${KEY}`, {
    headers: { 'Accept': 'application/json' },
    signal:  AbortSignal.timeout(10_000),
  })
  if (r.status === 429) throw new Error('429 rate limit ETF Global')
  if (!r.ok)            throw new Error(`ETF Global HTTP ${r.status}`)
  return r.json()
}

export interface ETFDetails {
  symbol:          string
  name:            string
  issuer:          string
  category:        string
  assetClass:      string
  totalAssets:     number
  expenseRatio:    number
  ytdReturn:       number
  oneYearReturn:   number
  dividendYield:   number
  numberOfHoldings:number
  currency:        string
  inceptionDate:   string
}

export interface ETFHolding {
  symbol:     string
  name:       string
  weight:     number
  sharesHeld: number
  value:      number
  sector:     string
}

export class ETFGlobalProvider implements IMarketProvider {
  name     = 'etfglobal'
  priority = 11  // spécialisé ETF

  // Pas un provider de quotes stocks classiques
  async getQuote(symbol: string):            Promise<Quote>             { throw new Error('ETF Global: spécialisé ETF') }
  async getQuotes(symbols: string[]):        Promise<Quote[]>           { throw new Error('ETF Global: spécialisé ETF') }
  async getHistorical(s: string, p: string): Promise<HistoricalPoint[]> { throw new Error('ETF Global: utilisez getETFHistorical') }
  async searchSymbols(q: string):            Promise<SearchResult[]>    { return this.searchETFs(q) }
  async getNews(symbol: string):             Promise<NewsItem[]>         { return [] }
  async getMarketOverview():                 Promise<Quote[]>            { throw new Error('ETF Global: pas d\'overview') }
  async getEarningsCalendar():               Promise<EarningsEvent[]>    { return [] }

  // ✨ SPÉCIALITÉ : Profil complet ETF
  async getProfile(symbol: string): Promise<StockProfile> {
    const data = await etfFetch(`/etf/${symbol}`)
    return {
      symbol,
      name:          data.fund_name ?? symbol,
      price:         data.nav ?? data.price ?? 0,
      change:        0,
      changePercent: data.daily_return ?? 0,
      marketCap:     data.total_assets,
      dividendYield: data.dividend_yield ? data.dividend_yield * 100 : undefined,
      currency:      data.currency ?? 'USD',
      description:   data.investment_objective,
      sector:        data.category,
      industry:      data.asset_class,
      provider:      'etfglobal',
    }
  }

  // ✨ Détails complets ETF
  async getETFDetails(symbol: string): Promise<ETFDetails> {
    const data = await etfFetch(`/etf/${symbol}`)
    return {
      symbol,
      name:             data.fund_name,
      issuer:           data.issuer,
      category:         data.category,
      assetClass:       data.asset_class,
      totalAssets:      data.total_assets,
      expenseRatio:     data.expense_ratio,
      ytdReturn:        data.ytd_return,
      oneYearReturn:    data.one_year_return,
      dividendYield:    data.dividend_yield,
      numberOfHoldings: data.number_of_holdings,
      currency:         data.currency,
      inceptionDate:    data.inception_date,
    }
  }

  // ✨ Holdings (top positions de l'ETF)
  async getETFHoldings(symbol: string, limit = 20): Promise<ETFHolding[]> {
    const data = await etfFetch(`/etf/${symbol}/holdings?limit=${limit}`)
    return (data.holdings ?? []).map((h: any) => ({
      symbol:     h.ticker,
      name:       h.company,
      weight:     h.weight,
      sharesHeld: h.shares_held,
      value:      h.market_value,
      sector:     h.sector,
    }))
  }

  // ✨ Exposition sectorielle
  async getETFSectorExposure(symbol: string): Promise<{ sector: string; weight: number }[]> {
    const data = await etfFetch(`/etf/${symbol}/sectors`)
    return (data.sectors ?? []).map((s: any) => ({
      sector: s.sector,
      weight: s.weight,
    }))
  }

  // ✨ Performance ETF multi-périodes
  async getETFPerformance(symbol: string): Promise<Record<string, number>> {
    const data = await etfFetch(`/etf/${symbol}/performance`)
    return {
      '1d':   data['1d']   ?? 0,
      '1w':   data['1w']   ?? 0,
      '1mo':  data['1mo']  ?? 0,
      '3mo':  data['3mo']  ?? 0,
      '6mo':  data['6mo']  ?? 0,
      '1y':   data['1y']   ?? 0,
      '3y':   data['3y']   ?? 0,
      '5y':   data['5y']   ?? 0,
      'ytd':  data['ytd']  ?? 0,
    }
  }

  // ✨ Recherche ETF
  async searchETFs(query: string): Promise<SearchResult[]> {
    try {
      const data = await etfFetch(`/search?q=${encodeURIComponent(query)}&type=etf&limit=10`)
      return (data.results ?? []).map((r: any) => ({
        symbol:   r.ticker,
        name:     r.fund_name,
        exchange: r.exchange,
        type:     'ETF',
      }))
    } catch { return [] }
  }

  // ✨ Liste des ETF par catégorie
  async getETFsByCategory(category: string): Promise<ETFDetails[]> {
    const data = await etfFetch(`/etfs?category=${encodeURIComponent(category)}&limit=20`)
    return (data.etfs ?? []).map((d: any) => ({
      symbol:           d.ticker,
      name:             d.fund_name,
      issuer:           d.issuer,
      category:         d.category,
      assetClass:       d.asset_class,
      totalAssets:      d.total_assets,
      expenseRatio:     d.expense_ratio,
      ytdReturn:        d.ytd_return,
      oneYearReturn:    d.one_year_return,
      dividendYield:    d.dividend_yield,
      numberOfHoldings: d.number_of_holdings,
      currency:         d.currency,
      inceptionDate:    d.inception_date,
    }))
  }
}
