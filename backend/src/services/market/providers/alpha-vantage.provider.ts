import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://www.alphavantage.co/query'
const KEY  = process.env.ALPHA_VANTAGE_API_KEY ?? 'demo'

async function avFetch(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ ...params, apikey: KEY }).toString()
  const r  = await fetch(`${BASE}?${qs}`, { signal: AbortSignal.timeout(15_000) })
  if (!r.ok) throw new Error(`AlphaVantage HTTP ${r.status}`)
  const data = await r.json()
  if (data['Note'])       throw new Error('429 rate limit AlphaVantage')
  if (data['Information']) throw new Error('429 quota AlphaVantage')
  return data
}

export class AlphaVantageProvider implements IMarketProvider {
  name     = 'alphavantage'
  priority = 5  // utilisé en dernier (25 req/jour)

  async getQuote(symbol: string): Promise<Quote> {
    const data  = await avFetch({ function: 'GLOBAL_QUOTE', symbol })
    const q     = data['Global Quote']
    if (!q || !q['05. price']) throw new Error(`Pas de quote AV pour ${symbol}`)
    const price = parseFloat(q['05. price'])
    const prev  = parseFloat(q['08. previous close'])
    return {
      symbol,
      name:          symbol,
      price,
      change:        parseFloat(q['09. change']),
      changePercent: parseFloat(q['10. change percent'].replace('%', '')),
      volume:        parseInt(q['06. volume']),
      currency:      'USD',
      provider:      'alphavantage',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    // AV ne supporte pas le batch — on limite à 3 pour économiser le quota
    const results = await Promise.allSettled(symbols.slice(0, 3).map(s => this.getQuote(s)))
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  }

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    const isMonthly = ['1y','5y'].includes(period)
    const fn        = isMonthly ? 'TIME_SERIES_MONTHLY' : 'TIME_SERIES_DAILY'
    const data      = await avFetch({ function: fn, symbol, outputsize: 'compact' })

    const key     = Object.keys(data).find(k => k.includes('Time Series'))
    if (!key) throw new Error('AlphaVantage: pas de time series')

    const limitMap: Record<string, number> = {
      '1d':5,'5d':5,'1mo':30,'3mo':90,'6mo':180,'1y':12,'5y':60,
    }
    return Object.entries(data[key])
      .slice(0, limitMap[period] ?? 30)
      .reverse()
      .map(([date, v]: [string, any]) => ({
        date,
        open:   parseFloat(v['1. open']),
        high:   parseFloat(v['2. high']),
        low:    parseFloat(v['3. low']),
        close:  parseFloat(v['4. close']),
        volume: parseInt(v['5. volume'] ?? '0'),
      }))
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const [q, ov] = await Promise.allSettled([
      this.getQuote(symbol),
      avFetch({ function: 'OVERVIEW', symbol }),
    ])
    const quote = q.status === 'fulfilled' ? q.value : {} as Quote
    const o     = ov.status === 'fulfilled' ? ov.value : {}
    return {
      ...quote, symbol,
      name:            o.Name ?? symbol,
      sector:          o.Sector,
      industry:        o.Industry,
      description:     o.Description,
      website:         undefined,
      employees:       o.FullTimeEmployees ? parseInt(o.FullTimeEmployees) : undefined,
      country:         o.Country,
      marketCap:       o.MarketCapitalization ? parseInt(o.MarketCapitalization) : undefined,
      pe:              o.PERatio ? parseFloat(o.PERatio) : undefined,
      forwardPE:       o.ForwardPE ? parseFloat(o.ForwardPE) : undefined,
      eps:             o.EPS ? parseFloat(o.EPS) : undefined,
      beta:            o.Beta ? parseFloat(o.Beta) : undefined,
      dividendYield:   o.DividendYield ? parseFloat(o.DividendYield) * 100 : undefined,
      week52High:      o['52WeekHigh'] ? parseFloat(o['52WeekHigh']) : undefined,
      week52Low:       o['52WeekLow'] ? parseFloat(o['52WeekLow']) : undefined,
      revenue:         o.RevenueTTM ? parseInt(o.RevenueTTM) : undefined,
      grossMargin:     o.GrossProfitTTM ? undefined : undefined,
      operatingMargin: o.OperatingMarginTTM ? parseFloat(o.OperatingMarginTTM) * 100 : undefined,
      revenueGrowth:   o.RevenueGrowthYOY ? parseFloat(o.RevenueGrowthYOY) * 100 : undefined,
      currency:        o.Currency ?? 'USD',
      nextEarningsDate:o.NextEarningsDate,
      provider:        'alphavantage',
    }
  }

  async getNews(symbol: string): Promise<NewsItem[]> {
    try {
      const data = await avFetch({ function: 'NEWS_SENTIMENT', tickers: symbol, limit: '10' })
      return (data.feed ?? []).slice(0, 10).map((n: any) => ({
        title:       n.title,
        publisher:   n.source,
        link:        n.url,
        publishedAt: n.time_published,
        thumbnail:   n.banner_image ?? undefined,
        sentiment:   n.overall_sentiment_label?.toLowerCase().includes('bull') ? 'positive'
                   : n.overall_sentiment_label?.toLowerCase().includes('bear') ? 'negative' : 'neutral',
        provider:    'alphavantage',
      }))
    } catch { return [] }
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const data = await avFetch({ function: 'SYMBOL_SEARCH', keywords: query })
    return (data.bestMatches ?? []).slice(0, 10).map((r: any) => ({
      symbol:   r['1. symbol'],
      name:     r['2. name'],
      exchange: r['4. region'],
      type:     r['3. type'],
    }))
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> { return [] }
}
