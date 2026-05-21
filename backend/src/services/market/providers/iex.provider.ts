import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://cloud.iexapis.com/stable'
const KEY  = process.env.IEX_CLOUD_API_KEY ?? ''

async function iexFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('IEX_CLOUD_API_KEY manquante')
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${BASE}${path}${sep}token=${KEY}`, {
    signal: AbortSignal.timeout(10_000),
  })
  if (r.status === 429) throw new Error('429 rate limit IEX Cloud')
  if (r.status === 402) throw new Error('402 quota IEX Cloud dépassé')
  if (!r.ok)            throw new Error(`IEX Cloud HTTP ${r.status}`)
  return r.json()
}

export class IEXProvider implements IMarketProvider {
  name     = 'iex'
  priority = 8

  async getQuote(symbol: string): Promise<Quote> {
    const [q, p] = await Promise.allSettled([
      iexFetch(`/stock/${symbol}/quote`),
      iexFetch(`/stock/${symbol}/company`),
    ])
    const qt = q.status === 'fulfilled' ? q.value : null
    const co = p.status === 'fulfilled' ? p.value : null
    if (!qt) throw new Error(`Pas de quote IEX pour ${symbol}`)
    return {
      symbol,
      name:          co?.companyName ?? symbol,
      price:         qt.latestPrice ?? 0,
      change:        qt.change ?? 0,
      changePercent: qt.changePercent ? qt.changePercent * 100 : 0,
      volume:        qt.volume ?? 0,
      marketCap:     qt.marketCap ?? undefined,
      pe:            qt.peRatio ?? undefined,
      week52High:    qt.week52High ?? undefined,
      week52Low:     qt.week52Low ?? undefined,
      currency:      'USD',
      provider:      'iex',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    try {
      // IEX batch endpoint
      const syms  = symbols.join(',')
      const types = 'quote,company'
      const data  = await iexFetch(`/stock/market/batch?symbols=${syms}&types=${types}`)
      return Object.entries(data).map(([sym, val]: [string, any]) => ({
        symbol:        sym,
        name:          val.company?.companyName ?? sym,
        price:         val.quote?.latestPrice ?? 0,
        change:        val.quote?.change ?? 0,
        changePercent: val.quote?.changePercent ? val.quote.changePercent * 100 : 0,
        volume:        val.quote?.volume ?? 0,
        marketCap:     val.quote?.marketCap ?? undefined,
        pe:            val.quote?.peRatio ?? undefined,
        week52High:    val.quote?.week52High ?? undefined,
        week52Low:     val.quote?.week52Low ?? undefined,
        currency:      'USD',
        provider:      'iex',
      }))
    } catch {
      const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)))
      return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
    }
  }

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    const rangeMap: Record<string, string> = {
      '1d':'1d','5d':'5d','1mo':'1m','3mo':'3m','6mo':'6m','1y':'1y','5y':'5y',
    }
    const range = rangeMap[period] ?? '1m'
    const data  = await iexFetch(`/stock/${symbol}/chart/${range}?chartCloseOnly=false`)
    return (Array.isArray(data) ? data : []).map((d: any) => ({
      date:   d.date,
      open:   d.open  ?? d.close,
      high:   d.high  ?? d.close,
      low:    d.low   ?? d.close,
      close:  d.close,
      volume: d.volume ?? 0,
    }))
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const [q, co, stats] = await Promise.allSettled([
      this.getQuote(symbol),
      iexFetch(`/stock/${symbol}/company`),
      iexFetch(`/stock/${symbol}/advanced-stats`),
    ])
    const quote    = q.status      === 'fulfilled' ? q.value      : {} as Quote
    const company  = co.status     === 'fulfilled' ? co.value     : {}
    const advanced = stats.status  === 'fulfilled' ? stats.value  : {}
    return {
      ...quote, symbol,
      sector:          company.sector,
      industry:        company.industry,
      description:     company.description,
      website:         company.website,
      employees:       company.employees,
      country:         company.country,
      forwardPE:       advanced.forwardPERatio,
      eps:             advanced.ttmEPS,
      beta:            advanced.beta,
      dividendYield:   advanced.dividendYield ? advanced.dividendYield * 100 : undefined,
      revenue:         advanced.revenue,
      grossMargin:     advanced.grossProfit ? undefined : undefined,
      revenueGrowth:   advanced.revenueGrowth ? advanced.revenueGrowth * 100 : undefined,
      nextEarningsDate:advanced.nextEarningsDate,
      provider:        'iex',
    }
  }

  async getNews(symbol: string): Promise<NewsItem[]> {
    const data = await iexFetch(`/stock/${symbol}/news/last/10`)
    return (Array.isArray(data) ? data : []).map((n: any) => ({
      title:       n.headline,
      publisher:   n.source,
      link:        n.url,
      publishedAt: new Date(n.datetime).toISOString(),
      thumbnail:   n.image ?? undefined,
      provider:    'iex',
    }))
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const data = await iexFetch(`/search/${encodeURIComponent(query)}`)
    return (Array.isArray(data) ? data : []).slice(0, 10).map((r: any) => ({
      symbol:   r.symbol,
      name:     r.securityName ?? r.companyName ?? r.symbol,
      exchange: r.exchange ?? '',
      type:     r.securityType,
    }))
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> {
    try {
      const data = await iexFetch(`/data/core/earnings_today`)
      return (Array.isArray(data) ? data : []).map((e: any) => ({
        symbol:      e.symbol,
        company:     e.symbol,
        date:        e.EPSReportDate ?? e.reportDate,
        epsEstimate: e.consensusEPS,
        epsActual:   e.actualEPS,
        provider:    'iex',
      }))
    } catch { return [] }
  }

  async getMarketOverview(): Promise<Quote[]> {
    return this.getQuotes(['SPY', 'QQQ', 'DIA', 'IWM'])
  }
}
