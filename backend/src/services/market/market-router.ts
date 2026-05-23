import { cache, TTL } from './cache'
import { circuitBreaker } from './circuit-breaker'
import {
  Quote, HistoricalPoint, StockProfile, NewsItem,
  EarningsEvent, SearchResult, TechnicalData,
  ScreenerFilters, ProviderStatus, IMarketProvider,
} from './types'

import { FinnhubProvider }      from './providers/finnhub.provider'
import { TwelveDataProvider }   from './providers/twelvedata.provider'
import { PolygonProvider }      from './providers/polygon.provider'
import { AlphaVantageProvider } from './providers/alpha-vantage.provider'
import { EODHDProvider }        from './providers/eodhd.provider'
import { MarketstackProvider }  from './providers/marketstack.provider'
import { MarketDataProvider }   from './providers/marketdata.provider'
import { IEXProvider }          from './providers/iex.provider'
import { BenzingaProvider }     from './providers/benzinga.provider'
import { TMXProvider }          from './providers/tmx.provider'
import { ETFGlobalProvider }    from './providers/etf-global.provider'
import { BRVMProvider }         from './providers/brvm.provider'
import { FMPProvider }          from './providers/fmp.provider'

/* ── Providers disponibles (priorité croissante) ────────── */
const ALL_PROVIDERS: IMarketProvider[] = [
  new FinnhubProvider(),
  new TwelveDataProvider(),
  new PolygonProvider(),
  new EODHDProvider(),
  new AlphaVantageProvider(),
  new MarketstackProvider(),
  new MarketDataProvider(),
  new IEXProvider(),
  new BenzingaProvider(),
  new TMXProvider(),
  new ETFGlobalProvider(),
  new BRVMProvider(),
  new FMPProvider(),
].sort((a, b) => a.priority - b.priority)

// Providers spécialisés (accès direct sans routing générique)
export const benzingaProvider  = new BenzingaProvider()
export const tmxProvider       = new TMXProvider()
export const etfGlobalProvider = new ETFGlobalProvider()
export const brvmProvider      = new BRVMProvider()
export const fmpProvider       = new FMPProvider()

/* ── Routing par type de donnée (13 providers) ──────────── */
const ROUTING = {
  quote:      ['finnhub','twelvedata','polygon','iex','eodhd','alphavantage','marketstack','marketdata'],
  historical: ['twelvedata','polygon','iex','eodhd','alphavantage','marketstack','finnhub'],
  profile:    ['finnhub','iex','eodhd','fmp','alphavantage','polygon','twelvedata'],  // FMP ajouté pos.4
  news:       ['benzinga','polygon','finnhub','iex','alphavantage','eodhd'],
  earnings:   ['benzinga','fmp','finnhub','tmx','eodhd'],                             // FMP ajouté pos.2
  search:     ['finnhub','twelvedata','polygon','fmp','iex','alphavantage','eodhd'],  // FMP ajouté pos.4
  overview:   ['finnhub','twelvedata','polygon','iex'],
  technical:  ['twelvedata'],
}

function getProvidersByType(type: keyof typeof ROUTING): IMarketProvider[] {
  return ROUTING[type]
    .map(name => ALL_PROVIDERS.find(p => p.name === name))
    .filter((p): p is IMarketProvider => !!p && circuitBreaker.isAvailable(p.name))
}

/* ── Fallback générique ──────────────────────────────────── */
async function withFallback<T>(
  type:      keyof typeof ROUTING,
  operation: string,
  fn:        (p: IMarketProvider) => Promise<T>
): Promise<T> {
  const providers = getProvidersByType(type)

  if (providers.length === 0) {
    throw new Error(`Aucun provider disponible pour ${type}`)
  }

  let lastError: Error = new Error('Aucun provider disponible')

  for (const provider of providers) {
    try {
      const result = await fn(provider)
      circuitBreaker.onSuccess(provider.name)
      return result
    } catch (err: any) {
      circuitBreaker.onError(provider.name, err)
      lastError = err
      console.warn(`[router] ${provider.name} failed for ${operation}: ${err.message} — fallback...`)
    }
  }

  throw new Error(`Tous les providers ont échoué pour ${operation}: ${lastError.message}`)
}

/* ── Fallback quote (avec valeur par défaut si tout échoue) */
const FALLBACK_QUOTE = (symbol: string): Quote => ({
  symbol, name: symbol, price: 0, change: 0, changePercent: 0,
  volume: 0, currency: 'USD', provider: 'none',
})

/* ── API publique du router ──────────────────────────────── */
export class MarketRouter {

  async getQuote(symbol: string): Promise<Quote> {
    const key = `quote:${symbol}`
    const hit = cache.get<Quote>(key)
    if (hit) return hit

    const data = await withFallback('quote', `quote(${symbol})`, p => p.getQuote(symbol))
    cache.set(key, data, TTL.QUOTE)
    return data
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const missing = symbols.filter(s => !cache.has(`quote:${s}`))
    const cached  = symbols
      .filter(s => cache.has(`quote:${s}`))
      .map(s => cache.get<Quote>(`quote:${s}`)!)

    if (missing.length === 0) return cached

    const fetched = await withFallback('quote', `quotes(${missing.join(',')})`, p => p.getQuotes(missing))
      .catch(() => missing.map(FALLBACK_QUOTE))

    fetched.forEach(q => { if (q.price > 0) cache.set(`quote:${q.symbol}`, q, TTL.QUOTE) })
    return [...cached, ...fetched]
  }

  async getHistorical(symbol: string, period = '1mo'): Promise<HistoricalPoint[]> {
    const key = `hist:${symbol}:${period}`
    const hit = cache.get<HistoricalPoint[]>(key)
    if (hit) return hit

    const data = await withFallback('historical', `historical(${symbol},${period})`, p => p.getHistorical(symbol, period))
    cache.set(key, data, TTL.HISTORICAL)
    return data
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const key = `profile:${symbol}`
    const hit = cache.get<StockProfile>(key)
    if (hit) return hit

    const data = await withFallback('profile', `profile(${symbol})`, p => p.getProfile(symbol))
    cache.set(key, data, TTL.PROFILE)
    return data
  }

  async getNews(symbol: string): Promise<NewsItem[]> {
    const key = `news:${symbol}`
    const hit = cache.get<NewsItem[]>(key)
    if (hit) return hit

    const data = await withFallback('news', `news(${symbol})`, p => p.getNews(symbol))
    cache.set(key, data, TTL.NEWS)
    return data
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const key = `search:${query}`
    const hit = cache.get<SearchResult[]>(key)
    if (hit) return hit

    const data = await withFallback('search', `search(${query})`, p => p.searchSymbols(query))
    cache.set(key, data, TTL.SEARCH)
    return data
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> {
    const key = 'earnings:calendar'
    const hit = cache.get<EarningsEvent[]>(key)
    if (hit) return hit

    const data = await withFallback('earnings', 'earnings()', p => p.getEarningsCalendar())
    cache.set(key, data, TTL.EARNINGS)
    return data
  }

  async getMarketOverview(): Promise<Quote[]> {
    const key = 'market:overview'
    const hit = cache.get<Quote[]>(key)
    if (hit) return hit

    const data = await withFallback('overview', 'overview()', p => p.getMarketOverview!())
    const valid = data.filter(q => q.price > 0)
    if (valid.length > 0) cache.set(key, valid, TTL.OVERVIEW)
    return valid
  }

  async getTechnicalIndicators(symbol: string, period = '1mo'): Promise<TechnicalData> {
    const key = `technical:${symbol}:${period}`
    const hit = cache.get<TechnicalData>(key)
    if (hit) return hit

    const tdProvider = ALL_PROVIDERS.find(p => p.name === 'twelvedata') as any
    if (!tdProvider?.getTechnicalIndicators || !circuitBreaker.isAvailable('twelvedata')) {
      throw new Error('Indicateurs techniques non disponibles (TwelveData requis)')
    }
    const data = await tdProvider.getTechnicalIndicators(symbol, period)
    circuitBreaker.onSuccess('twelvedata')
    cache.set(key, data, TTL.TECHNICAL)
    return data
  }

  async screenStocks(filters: ScreenerFilters): Promise<Quote[]> {
    // 85 symboles couvrant tous les secteurs (S&P500 + Europe top caps)
    const SYMBOLS = [
      // Technology
      'AAPL','MSFT','NVDA','GOOGL','META','TSLA','AVGO','ORCL','CRM','AMD',
      'INTC','QCOM','TXN','AMAT','MU','LRCX','NOW','ADBE','INTU','PANW',
      // Healthcare
      'JNJ','UNH','LLY','ABT','MRK','TMO','DHR','ISRG','MDT','BMY',
      // Financials
      'JPM','BAC','WFC','GS','MS','BLK','SPGI','CB','AXP','V','MA',
      // Consumer Discretionary
      'AMZN','HD','MCD','NKE','SBUX','TGT','LOW','BKNG','CMG',
      // Consumer Staples
      'WMT','PG','KO','PEP','COST','PM','MO',
      // Energy
      'XOM','CVX','COP','EOG','SLB','PSX',
      // Industrials
      'CAT','BA','HON','UPS','RTX','LMT','GE','MMM',
      // Materials
      'LIN','APD','SHW','FCX','NEM',
      // Real Estate
      'AMT','PLD','EQIX','CCI',
      // Utilities
      'NEE','DUK','SO',
      // Europe top caps
      'ASML','SAP','LVMH.PA','TTE.PA','SIE.DE','BNP.PA','OR.PA','NESN.SW','NOVO-B.CO',
    ]

    // Carte sectorielle statique — utilisée uniquement pour le filtre sector
    const SECTOR_MAP: Record<string, string> = {
      AAPL:'Technology', MSFT:'Technology', NVDA:'Technology', GOOGL:'Technology',
      META:'Technology', AVGO:'Technology', ORCL:'Technology', CRM:'Technology',
      AMD:'Technology', INTC:'Technology', QCOM:'Technology', TXN:'Technology',
      AMAT:'Technology', MU:'Technology', LRCX:'Technology', NOW:'Technology',
      ADBE:'Technology', INTU:'Technology', PANW:'Technology', TSLA:'Technology',
      JNJ:'Healthcare', UNH:'Healthcare', LLY:'Healthcare', ABT:'Healthcare',
      MRK:'Healthcare', TMO:'Healthcare', DHR:'Healthcare', ISRG:'Healthcare',
      MDT:'Healthcare', BMY:'Healthcare',
      JPM:'Financials', BAC:'Financials', WFC:'Financials', GS:'Financials',
      MS:'Financials', BLK:'Financials', SPGI:'Financials', CB:'Financials',
      AXP:'Financials', V:'Financials', MA:'Financials',
      AMZN:'Consumer Discretionary', HD:'Consumer Discretionary', MCD:'Consumer Discretionary',
      NKE:'Consumer Discretionary', SBUX:'Consumer Discretionary', TGT:'Consumer Discretionary',
      LOW:'Consumer Discretionary', BKNG:'Consumer Discretionary', CMG:'Consumer Discretionary',
      WMT:'Consumer Staples', PG:'Consumer Staples', KO:'Consumer Staples',
      PEP:'Consumer Staples', COST:'Consumer Staples', PM:'Consumer Staples', MO:'Consumer Staples',
      XOM:'Energy', CVX:'Energy', COP:'Energy', EOG:'Energy', SLB:'Energy', PSX:'Energy',
      CAT:'Industrials', BA:'Industrials', HON:'Industrials', UPS:'Industrials',
      RTX:'Industrials', LMT:'Industrials', GE:'Industrials', MMM:'Industrials',
      LIN:'Materials', APD:'Materials', SHW:'Materials', FCX:'Materials', NEM:'Materials',
      AMT:'Real Estate', PLD:'Real Estate', EQIX:'Real Estate', CCI:'Real Estate',
      NEE:'Utilities', DUK:'Utilities', SO:'Utilities',
      ASML:'Technology', SAP:'Technology', 'LVMH.PA':'Consumer Discretionary',
      'TTE.PA':'Energy', 'SIE.DE':'Industrials', 'BNP.PA':'Financials',
      'OR.PA':'Consumer Staples', 'NESN.SW':'Consumer Staples', 'NOVO-B.CO':'Healthcare',
    }

    const quotes = await this.getQuotes(SYMBOLS)
    return quotes.filter(q => {
      if (q.price <= 0)                                                           return false
      if (filters.minPrice        && q.price            < filters.minPrice)       return false
      if (filters.maxPrice        && q.price            > filters.maxPrice)       return false
      if (filters.minMarketCap    && (q.marketCap??0)   < filters.minMarketCap)   return false
      if (filters.maxMarketCap    && (q.marketCap??0)   > filters.maxMarketCap)   return false
      if (filters.maxPE           && q.pe != null && q.pe > filters.maxPE)        return false
      if (filters.minPE           && q.pe != null && q.pe < filters.minPE)        return false
      if (filters.minChangePercent && q.changePercent   < filters.minChangePercent) return false
      if (filters.maxChangePercent && q.changePercent   > filters.maxChangePercent) return false
      if (filters.minVolume       && q.volume           < filters.minVolume)      return false
      if (filters.sector) {
        const sym = q.symbol.toUpperCase()
        const stockSector = SECTOR_MAP[sym] ?? ''
        if (!stockSector.toLowerCase().includes(filters.sector.toLowerCase())) return false
      }
      return true
    })
  }

  getProvidersStatus(): ProviderStatus[] {
    return circuitBreaker.getStatus()
  }

  getCacheStats() {
    return { size: cache.size(), providers: this.getProvidersStatus() }
  }
}

export const marketRouter = new MarketRouter()
