import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://api.marketdata.app/v1'
const KEY  = process.env.MARKETDATA_API_KEY ?? ''

async function mdFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('MARKETDATA_API_KEY manquante')
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'Authorization': `Token ${KEY}` },
    signal:  AbortSignal.timeout(10_000),
  })
  if (r.status === 429) throw new Error('429 rate limit MarketData')
  if (!r.ok)            throw new Error(`MarketData HTTP ${r.status}`)
  return r.json()
}

export class MarketDataProvider implements IMarketProvider {
  name     = 'marketdata'
  priority = 7

  async getQuote(symbol: string): Promise<Quote> {
    const data = await mdFetch(`/stocks/quotes/${symbol}/`)
    return {
      symbol,
      name:          symbol,
      price:         data.last?.[0] ?? 0,
      change:        data.change?.[0] ?? 0,
      changePercent: data.changepct?.[0] ?? 0,
      volume:        data.volume?.[0] ?? 0,
      week52High:    data['52weekHigh']?.[0],
      week52Low:     data['52weekLow']?.[0],
      currency:      'USD',
      provider:      'marketdata',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)))
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  }

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    const countMap: Record<string, string> = {
      '1d':'1D','5d':'5D','1mo':'1M','3mo':'3M','6mo':'6M','1y':'1Y','5y':'5Y',
    }
    const data = await mdFetch(`/stocks/candles/D/${symbol}/?from=${countMap[period] ?? '1M'}&countback=100`)
    const dates = data.t ?? []
    return dates.map((ts: number, i: number) => ({
      date:   new Date(ts * 1000).toISOString().split('T')[0],
      open:   data.o?.[i] ?? 0,
      high:   data.h?.[i] ?? 0,
      low:    data.l?.[i] ?? 0,
      close:  data.c?.[i] ?? 0,
      volume: data.v?.[i] ?? 0,
    }))
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const q = await this.getQuote(symbol)
    return { ...q, provider: 'marketdata' }
  }

  async getNews(symbol: string): Promise<NewsItem[]> { return [] }

  async searchSymbols(query: string): Promise<SearchResult[]> { return [] }

  async getEarningsCalendar(): Promise<EarningsEvent[]> { return [] }
}
