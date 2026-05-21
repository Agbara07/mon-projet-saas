import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://eodhd.com/api'
const KEY  = process.env.EODHD_API_KEY ?? ''

async function eodFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('EODHD_API_KEY manquante')
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${BASE}${path}${sep}api_token=${KEY}&fmt=json`, {
    signal: AbortSignal.timeout(10_000),
  })
  if (r.status === 429) throw new Error('429 rate limit EODHD')
  if (!r.ok)            throw new Error(`EODHD HTTP ${r.status}`)
  return r.json()
}

export class EODHDProvider implements IMarketProvider {
  name     = 'eodhd'
  priority = 4

  async getQuote(symbol: string): Promise<Quote> {
    // EODHD utilise ticker.EXCHANGE (ex: AAPL.US)
    const sym  = symbol.includes('.') ? symbol : `${symbol}.US`
    const data = await eodFetch(`/real-time/${sym}`)
    return {
      symbol,
      name:          symbol,
      price:         data.close,
      change:        data.change,
      changePercent: data.change_p,
      volume:        data.volume,
      currency:      'USD',
      provider:      'eodhd',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)))
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  }

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    const sym    = symbol.includes('.') ? symbol : `${symbol}.US`
    const daysMap: Record<string, number> = {
      '1d':1,'5d':5,'1mo':30,'3mo':90,'6mo':180,'1y':365,'5y':1825,
    }
    const from = new Date(Date.now() - (daysMap[period] ?? 30) * 86400000).toISOString().split('T')[0]
    const to   = new Date().toISOString().split('T')[0]
    const data = await eodFetch(`/eod/${sym}?from=${from}&to=${to}&period=d`)
    return (Array.isArray(data) ? data : []).map((d: any) => ({
      date: d.date, open: d.open, high: d.high, low: d.low,
      close: d.close, volume: d.volume,
    }))
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const sym  = symbol.includes('.') ? symbol : `${symbol}.US`
    const [q, f] = await Promise.allSettled([
      this.getQuote(symbol),
      eodFetch(`/fundamentals/${sym}`),
    ])
    const quote = q.status === 'fulfilled' ? q.value : {} as Quote
    const fund  = f.status === 'fulfilled' ? f.value : {}
    const gen   = fund?.General ?? {}
    const high  = fund?.Highlights ?? {}
    return {
      ...quote, symbol,
      name:            gen.Name ?? symbol,
      sector:          gen.Sector,
      industry:        gen.Industry,
      description:     gen.Description,
      website:         gen.WebURL,
      employees:       gen.FullTimeEmployees,
      country:         gen.CountryISO,
      marketCap:       high.MarketCapitalization,
      pe:              high.PERatio,
      eps:             high.EarningsShare,
      dividendYield:   high.DividendYield ? parseFloat(high.DividendYield) * 100 : undefined,
      currency:        gen.CurrencyCode ?? 'USD',
      provider:        'eodhd',
    }
  }

  async getNews(symbol: string): Promise<NewsItem[]> {
    const sym  = symbol.includes('.') ? symbol : `${symbol}.US`
    try {
      const data = await eodFetch(`/news?s=${sym}&limit=10`)
      return (Array.isArray(data) ? data : []).map((n: any) => ({
        title:       n.title,
        publisher:   n.link?.split('/')[2] ?? 'Unknown',
        link:        n.link,
        publishedAt: n.date,
        provider:    'eodhd',
      }))
    } catch { return [] }
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const data = await eodFetch(`/search/${encodeURIComponent(query)}`)
    return (Array.isArray(data) ? data : []).slice(0, 10).map((r: any) => ({
      symbol:   r.Code,
      name:     r.Name,
      exchange: r.Exchange,
      type:     r.Type,
    }))
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> {
    const from = new Date().toISOString().split('T')[0]
    const to   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    try {
      const data = await eodFetch(`/calendar/earnings?from=${from}&to=${to}`)
      return (data?.earnings ?? []).slice(0, 30).map((e: any) => ({
        symbol:      e.code?.split('.')[0],
        company:     e.code,
        date:        e.report_date,
        epsEstimate: e.estimate,
        epsActual:   e.actual,
        provider:    'eodhd',
      }))
    } catch { return [] }
  }
}
