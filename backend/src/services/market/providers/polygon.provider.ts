import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://api.polygon.io'
const KEY  = process.env.POLYGON_API_KEY ?? ''

async function pgFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('POLYGON_API_KEY manquante')
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${BASE}${path}${sep}apiKey=${KEY}`, {
    signal: AbortSignal.timeout(10_000),
  })
  if (r.status === 429) throw new Error('429 rate limit Polygon')
  if (!r.ok)            throw new Error(`Polygon HTTP ${r.status}`)
  return r.json()
}

const MULTIPLIER_MAP: Record<string, { multiplier: number; timespan: string; limit: number }> = {
  '1d':  { multiplier:5,  timespan:'minute', limit:78  },
  '5d':  { multiplier:30, timespan:'minute', limit:60  },
  '1mo': { multiplier:1,  timespan:'day',    limit:30  },
  '3mo': { multiplier:1,  timespan:'day',    limit:90  },
  '6mo': { multiplier:1,  timespan:'day',    limit:180 },
  '1y':  { multiplier:1,  timespan:'week',   limit:52  },
  '5y':  { multiplier:1,  timespan:'month',  limit:60  },
}

export class PolygonProvider implements IMarketProvider {
  name     = 'polygon'
  priority = 3

  async getQuote(symbol: string): Promise<Quote> {
    const [snap, details] = await Promise.allSettled([
      pgFetch(`/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`),
      pgFetch(`/v3/reference/tickers/${symbol}`),
    ])

    const s = snap.status === 'fulfilled' ? snap.value?.ticker : null
    const d = details.status === 'fulfilled' ? details.value?.results : null

    if (!s) throw new Error(`Pas de quote Polygon pour ${symbol}`)

    const prev = s.prevDay?.c ?? s.day?.c ?? 0
    const cur  = s.day?.c ?? s.lastTrade?.p ?? 0
    const chg  = cur - prev
    const pct  = prev > 0 ? (chg / prev) * 100 : 0

    return {
      symbol,
      name:          d?.name ?? symbol,
      price:         cur,
      change:        chg,
      changePercent: pct,
      volume:        s.day?.v ?? 0,
      marketCap:     d?.market_cap ?? undefined,
      currency:      'USD',
      provider:      'polygon',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)))
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  }

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    const { multiplier, timespan, limit } = MULTIPLIER_MAP[period] ?? MULTIPLIER_MAP['1mo']
    const to   = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - limit * (timespan === 'day' ? 86400000 : timespan === 'week' ? 604800000 : 2592000000))
      .toISOString().split('T')[0]

    const data = await pgFetch(
      `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}`
    )
    return (data.results ?? []).map((r: any) => ({
      date:   new Date(r.t).toISOString().split('T')[0],
      open:   r.o, high: r.h, low: r.l, close: r.c, volume: r.v,
    }))
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const [q, d] = await Promise.allSettled([
      this.getQuote(symbol),
      pgFetch(`/v3/reference/tickers/${symbol}`),
    ])
    const quote   = q.status === 'fulfilled' ? q.value : {} as Quote
    const details = d.status === 'fulfilled' ? d.value?.results : {}
    return {
      ...quote, symbol,
      description: details?.description,
      website:     details?.homepage_url,
      employees:   details?.total_employees,
      currency:    details?.currency_name ?? 'USD',
      provider:    'polygon',
    }
  }

  // News via Benzinga (intégré dans Polygon)
  async getNews(symbol: string): Promise<NewsItem[]> {
    const data = await pgFetch(`/v2/reference/news?ticker=${symbol}&limit=15&order=desc&sort=published_utc`)
    return (data.results ?? []).map((n: any) => ({
      title:       n.title,
      publisher:   n.publisher?.name ?? 'Unknown',
      link:        n.article_url,
      publishedAt: n.published_utc,
      thumbnail:   n.image_url ?? undefined,
      provider:    'polygon (benzinga)',
    }))
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const data = await pgFetch(`/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=10`)
    return (data.results ?? []).map((r: any) => ({
      symbol:   r.ticker,
      name:     r.name,
      exchange: r.primary_exchange ?? '',
      type:     r.type,
    }))
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> { return [] }

  async getMarketOverview(): Promise<Quote[]> {
    try {
      const data = await pgFetch('/v2/snapshot/locale/us/markets/stocks/tickers?tickers=SPY,QQQ,DIA,IWM')
      return (data.tickers ?? []).map((t: any) => ({
        symbol:        t.ticker,
        name:          t.ticker,
        price:         t.day?.c ?? 0,
        change:        (t.day?.c ?? 0) - (t.prevDay?.c ?? 0),
        changePercent: t.todaysChangePerc ?? 0,
        volume:        t.day?.v ?? 0,
        currency:      'USD',
        provider:      'polygon',
      }))
    } catch { return [] }
  }
}
