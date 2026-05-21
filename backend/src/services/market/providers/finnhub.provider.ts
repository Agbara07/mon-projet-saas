import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult, TechnicalData } from '../types'

const BASE = 'https://finnhub.io/api/v1'
const KEY  = process.env.FINNHUB_API_KEY ?? ''

async function fhFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('FINNHUB_API_KEY manquante')
  const r = await fetch(`${BASE}${path}&token=${KEY}`, {
    headers: { 'User-Agent': 'InvestSaaS/1.0' },
    signal:  AbortSignal.timeout(10_000),
  })
  if (r.status === 429) throw new Error('429 rate limit Finnhub')
  if (!r.ok)            throw new Error(`Finnhub HTTP ${r.status}`)
  return r.json()
}

const INDICES = ['^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX']
const INDEX_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500', '^IXIC': 'NASDAQ', '^DJI': 'Dow Jones',
  '^RUT':  'Russell 2000', '^VIX': 'VIX',
}

export class FinnhubProvider implements IMarketProvider {
  name     = 'finnhub'
  priority = 1  // provider principal

  async getQuote(symbol: string): Promise<Quote> {
    const [q, p] = await Promise.allSettled([
      fhFetch(`/quote?symbol=${symbol}`),
      fhFetch(`/stock/profile2?symbol=${symbol}`),
    ])
    const qt = q.status === 'fulfilled' ? q.value : null
    const pr = p.status === 'fulfilled' ? p.value : null
    if (!qt || qt.c === 0) throw new Error(`Pas de quote Finnhub pour ${symbol}`)
    return {
      symbol,
      name:          pr?.name ?? symbol,
      price:         qt.c,
      change:        qt.d ?? 0,
      changePercent: qt.dp ?? 0,
      volume:        qt.v ?? 0,
      week52High:    qt.h52 ?? undefined,
      week52Low:     qt.l52 ?? undefined,
      marketCap:     pr?.marketCapitalization ? pr.marketCapitalization * 1e6 : undefined,
      currency:      pr?.currency ?? 'USD',
      provider:      'finnhub',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)))
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  }

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    const resMap: Record<string, string> = {
      '1d':'D', '5d':'D', '1mo':'D', '3mo':'D', '6mo':'W', '1y':'M', '5y':'M',
    }
    const days: Record<string, number> = {
      '1d':1, '5d':5, '1mo':30, '3mo':90, '6mo':180, '1y':365, '5y':1825,
    }
    const res  = resMap[period] ?? 'D'
    const from = Math.floor((Date.now() - (days[period] ?? 30) * 86400000) / 1000)
    const to   = Math.floor(Date.now() / 1000)
    const data = await fhFetch(`/stock/candle?symbol=${symbol}&resolution=${res}&from=${from}&to=${to}`)
    if (data.s !== 'ok') throw new Error(`Finnhub candles: ${data.s}`)
    return data.t.map((ts: number, i: number) => ({
      date:   new Date(ts * 1000).toISOString().split('T')[0],
      open:   data.o[i], high: data.h[i], low: data.l[i],
      close:  data.c[i], volume: data.v[i],
    }))
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const [pr, mt, fd] = await Promise.allSettled([
      fhFetch(`/stock/profile2?symbol=${symbol}`),
      fhFetch(`/stock/metric?symbol=${symbol}&metric=all`),
      this.getQuote(symbol),
    ])
    const p = pr.status === 'fulfilled' ? pr.value : {}
    const m = mt.status === 'fulfilled' ? mt.value?.metric ?? {} : {}
    const q = fd.status === 'fulfilled' ? fd.value : {} as Quote

    return {
      ...q, symbol,
      name:            p.name ?? symbol,
      sector:          p.finnhubIndustry,
      industry:        p.finnhubIndustry,
      description:     undefined,
      website:         p.weburl,
      employees:       p.employeeTotal,
      country:         p.country,
      marketCap:       p.marketCapitalization ? p.marketCapitalization * 1e6 : undefined,
      pe:              m['peAnnual']  ?? m['peTTM'],
      forwardPE:       m['peForward'],
      eps:             m['epsTTM'],
      beta:            m['beta'],
      dividendYield:   m['dividendYieldIndicatedAnnual'],
      week52High:      m['52WeekHigh'],
      week52Low:       m['52WeekLow'],
      revenue:         m['revenuePerShareAnnual'] ? undefined : undefined,
      grossMargin:     m['grossMarginAnnual'],
      operatingMargin: m['operatingMarginAnnual'],
      revenueGrowth:   m['revenueGrowthAnnual'],
      earningsGrowth:  m['epsGrowthAnnual'],
      currency:        p.currency ?? 'USD',
      provider:        'finnhub',
    }
  }

  async getNews(symbol: string): Promise<NewsItem[]> {
    const to   = new Date().toISOString().split('T')[0]
    const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const data = await fhFetch(`/company-news?symbol=${symbol}&from=${from}&to=${to}`)
    if (!Array.isArray(data)) return []
    return data.slice(0, 15).map((n: any) => ({
      title:       n.headline,
      publisher:   n.source,
      link:        n.url,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      thumbnail:   n.image || undefined,
      sentiment:   n.sentiment > 0 ? 'positive' : n.sentiment < 0 ? 'negative' : 'neutral',
      provider:    'finnhub',
    }))
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const data = await fhFetch(`/search?q=${encodeURIComponent(query)}&limit=10`)
    return (data.result ?? []).slice(0, 10).map((r: any) => ({
      symbol: r.symbol, name: r.description,
      exchange: r.primaryExchange ?? '', type: r.type,
    }))
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> {
    const to   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const data = await fhFetch(`/calendar/earnings?from=${from}&to=${to}`)
    return (data.earningsCalendar ?? []).slice(0, 40).map((e: any) => ({
      symbol:       e.symbol,
      company:      e.symbol,
      date:         e.date,
      epsEstimate:  e.epsEstimate ?? undefined,
      epsActual:    e.epsActual   ?? undefined,
      surprisePct:  e.surprisePercent ?? undefined,
      provider:     'finnhub',
    }))
  }

  async getMarketOverview(): Promise<Quote[]> {
    const results = await Promise.allSettled(INDICES.map(s => this.getQuote(s)))
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => ({ ...(r as any).value, name: INDEX_NAMES[(r as any).value.symbol] ?? (r as any).value.symbol }))
  }
}
