import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://api.marketstack.com/v2'
const KEY  = process.env.MARKETSTACK_API_KEY ?? ''

async function msFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('MARKETSTACK_API_KEY manquante')
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${BASE}${path}${sep}access_key=${KEY}`, { signal: AbortSignal.timeout(10_000) })
  if (r.status === 429) throw new Error('429 rate limit Marketstack')
  if (!r.ok)            throw new Error(`Marketstack HTTP ${r.status}`)
  const data: any = await r.json()
  if (data.error) throw new Error(data.error.message ?? 'Marketstack error')
  return data
}

export class MarketstackProvider implements IMarketProvider {
  name     = 'marketstack'
  priority = 6

  async getQuote(symbol: string): Promise<Quote> {
    const data = await msFetch(`/tickers/${symbol}/eod/latest`)
    return {
      symbol,
      name:          symbol,
      price:         data.close,
      change:        data.close - data.open,
      changePercent: data.open > 0 ? ((data.close - data.open) / data.open) * 100 : 0,
      volume:        data.volume,
      currency:      'USD',
      provider:      'marketstack',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    try {
      const data = await msFetch(`/eod?symbols=${symbols.join(',')}&limit=${symbols.length}&sort=DESC`)
      const seen = new Set<string>()
      return (data.data ?? [])
        .filter((d: any) => { if (seen.has(d.symbol)) return false; seen.add(d.symbol); return true })
        .map((d: any) => ({
          symbol:        d.symbol,
          name:          d.symbol,
          price:         d.close,
          change:        d.close - d.open,
          changePercent: d.open > 0 ? ((d.close - d.open) / d.open) * 100 : 0,
          volume:        d.volume,
          currency:      'USD',
          provider:      'marketstack',
        }))
    } catch {
      const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)))
      return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
    }
  }

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    const limitMap: Record<string, number> = {
      '1d':1,'5d':5,'1mo':30,'3mo':90,'6mo':180,'1y':365,'5y':1825,
    }
    const limit = limitMap[period] ?? 30
    const data  = await msFetch(`/tickers/${symbol}/eod?limit=${limit}&sort=ASC`)
    return (data.data ?? []).map((d: any) => ({
      date: d.date.split('T')[0], open: d.open, high: d.high,
      low: d.low, close: d.close, volume: d.volume,
    }))
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const quote = await this.getQuote(symbol)
    return { ...quote, symbol, provider: 'marketstack' }
  }

  async getNews(symbol: string): Promise<NewsItem[]> { return [] }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const data = await msFetch(`/tickers?search=${encodeURIComponent(query)}&limit=10`)
    return (data.data ?? []).map((r: any) => ({
      symbol:   r.symbol,
      name:     r.name,
      exchange: r.stock_exchange?.acronym ?? '',
    }))
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> { return [] }
}
