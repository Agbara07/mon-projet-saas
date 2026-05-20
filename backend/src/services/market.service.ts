/**
 * Market service — appels directs à l'API Yahoo Finance v8
 * Pas de dépendance externe, utilise fetch natif (Node 18+)
 */

const YF_BASE  = 'https://query1.finance.yahoo.com'
const YF_BASE2 = 'https://query2.finance.yahoo.com'
const HEADERS  = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function yfFetch(url: string): Promise<any> {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} for ${url}`)
  return res.json()
}

/* ── Types ─────────────────────────────────────────────────── */
export interface Quote {
  symbol: string; name: string; price: number; change: number
  changePercent: number; volume: number; marketCap?: number
  pe?: number; week52High?: number; week52Low?: number; currency: string
}
export interface HistoricalPoint {
  date: string; open: number; high: number; low: number; close: number; volume: number
}
export interface StockProfile {
  symbol: string; name: string; price: number; change: number; changePercent: number
  sector?: string; industry?: string; description?: string; website?: string
  employees?: number; country?: string; marketCap?: number; pe?: number
  forwardPE?: number; eps?: number; beta?: number; dividendYield?: number
  week52High?: number; week52Low?: number; revenue?: number
  grossMargin?: number; operatingMargin?: number
  revenueGrowth?: number; earningsGrowth?: number
  nextEarningsDate?: string; currency: string
}
export interface NewsItem {
  title: string; publisher: string; link: string; publishedAt: string; thumbnail?: string
}
export interface EarningsEvent {
  symbol: string; company: string; date: string
  epsEstimate?: number; epsActual?: number; surprise?: number; surprisePct?: number
}
export interface ScreenerFilters {
  minPrice?: number; maxPrice?: number; minMarketCap?: number
  maxPE?: number; minChangePercent?: number; maxChangePercent?: number
}

/* ── Cache ─────────────────────────────────────────────────── */
const quoteCache   = new Map<string, { data: Quote;       ts: number }>()
const profileCache = new Map<string, { data: StockProfile; ts: number }>()
const CACHE_TTL    = 60_000
const PROFILE_TTL  = 5 * 60_000

/* ── Quote via v8/chart (2 jours pour calculer le changement) ── */
export async function getQuote(symbol: string): Promise<Quote> {
  const cached = quoteCache.get(symbol)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  // range=5d + interval=1d pour obtenir les clôtures récentes et calculer la variation
  const json = await yfFetch(
    `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`
  )
  const result = json?.chart?.result?.[0]
  const meta   = result?.meta
  if (!meta) throw new Error(`Pas de données pour ${symbol}`)

  // Calculer change% depuis la clôture précédente
  const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter((c: any) => c != null)
  const currentPrice  = meta.regularMarketPrice ?? (closes[closes.length - 1] ?? 0)
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2] ?? currentPrice
  const change        = currentPrice - previousClose
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

  const data: Quote = {
    symbol:        meta.symbol ?? symbol,
    name:          meta.longName ?? meta.shortName ?? symbol,
    price:         currentPrice,
    change,
    changePercent,
    volume:        meta.regularMarketVolume ?? 0,
    marketCap:     meta.marketCap,
    pe:            meta.trailingPE,
    week52High:    meta.fiftyTwoWeekHigh,
    week52Low:     meta.fiftyTwoWeekLow,
    currency:      meta.currency ?? 'USD',
  }
  quoteCache.set(symbol, { data, ts: Date.now() })
  return data
}

const FALLBACK_QUOTE = (symbol: string): Quote => ({
  symbol, name: symbol, price: 0, change: 0, changePercent: 0, volume: 0, currency: 'USD',
})

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(symbols.map(getQuote))
  return results.map((r, i) => r.status === 'fulfilled' ? r.value : FALLBACK_QUOTE(symbols[i]))
}

/* ── Historical via v8/chart ───────────────────────────────── */
const RANGE_MAP: Record<string, string> = {
  '1d':'1d', '5d':'5d', '1mo':'1mo', '3mo':'3mo',
  '6mo':'6mo', '1y':'1y', '2y':'2y', '5y':'5y',
}
const INTERVAL_MAP: Record<string, string> = {
  '1d':'5m', '5d':'30m', '1mo':'1d', '3mo':'1d',
  '6mo':'1d', '1y':'1wk', '2y':'1wk', '5y':'1mo',
}

export async function getHistorical(symbol: string, period = '1mo'): Promise<HistoricalPoint[]> {
  const range    = RANGE_MAP[period]    ?? '1mo'
  const interval = INTERVAL_MAP[period] ?? '1d'

  const json = await yfFetch(
    `${YF_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`
  )
  const result = json?.chart?.result?.[0]
  if (!result) return []

  const timestamps: number[] = result.timestamp ?? []
  const q = result.indicators?.quote?.[0] ?? {}
  const opens   = q.open   ?? []
  const highs   = q.high   ?? []
  const lows    = q.low    ?? []
  const closes  = q.close  ?? []
  const volumes = q.volume ?? []

  return timestamps
    .map((ts, i) => ({
      date:   new Date(ts * 1000).toISOString().split('T')[0],
      open:   opens[i]   ?? 0,
      high:   highs[i]   ?? 0,
      low:    lows[i]    ?? 0,
      close:  closes[i]  ?? 0,
      volume: volumes[i] ?? 0,
    }))
    .filter(p => p.close > 0)
}

/* ── Search ────────────────────────────────────────────────── */
export async function searchSymbols(query: string) {
  // Essayer v1 d'abord, puis v7 comme fallback
  let quotes: any[] = []
  try {
    const json = await yfFetch(
      `${YF_BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
    )
    quotes = json?.finance?.result?.[0]?.quotes ?? json?.quotes ?? []
  } catch {
    try {
      const json2 = await yfFetch(
        `${YF_BASE2}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
      )
      quotes = json2?.finance?.result?.[0]?.quotes ?? json2?.quotes ?? []
    } catch { /* retourner tableau vide */ }
  }
  return quotes
    .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
    .slice(0, 10)
    .map((q: any) => ({
      symbol:   q.symbol,
      name:     q.longname ?? q.shortname ?? q.symbol,
      exchange: q.exchDisp ?? q.exchange ?? '',
    }))
}

/* ── Stock Profile ─────────────────────────────────────────── */
export async function getStockProfile(symbol: string): Promise<StockProfile> {
  const cached = profileCache.get(symbol)
  if (cached && Date.now() - cached.ts < PROFILE_TTL) return cached.data

  const [quoteData, summaryJson] = await Promise.allSettled([
    getQuote(symbol),
    yfFetch(`${YF_BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,financialData,defaultKeyStatistics,calendarEvents`)
  ])

  const q   = quoteData.status === 'fulfilled' ? quoteData.value : FALLBACK_QUOTE(symbol)
  const sum = summaryJson.status === 'fulfilled' ? summaryJson.value?.quoteSummary?.result?.[0] : null

  const ap = sum?.assetProfile ?? {}
  const fd = sum?.financialData ?? {}
  const ks = sum?.defaultKeyStatistics ?? {}
  const ce = sum?.calendarEvents ?? {}

  const nextEarnings = ce?.earnings?.earningsDate?.[0]?.raw

  const data: StockProfile = {
    symbol: q.symbol, name: q.name, price: q.price, change: q.change,
    changePercent: q.changePercent, currency: q.currency,
    sector:      ap.sector,
    industry:    ap.industry,
    description: ap.longBusinessSummary,
    website:     ap.website,
    employees:   ap.fullTimeEmployees,
    country:     ap.country,
    marketCap:   q.marketCap,
    pe:          q.pe,
    forwardPE:   ks.forwardPE?.raw,
    eps:         ks.trailingEps?.raw,
    beta:        ks.beta?.raw,
    dividendYield:   ks.dividendYield?.raw  ? ks.dividendYield.raw * 100  : undefined,
    week52High:  q.week52High,
    week52Low:   q.week52Low,
    revenue:         fd.totalRevenue?.raw,
    grossMargin:     fd.grossMargins?.raw    ? fd.grossMargins.raw * 100    : undefined,
    operatingMargin: fd.operatingMargins?.raw? fd.operatingMargins.raw * 100: undefined,
    revenueGrowth:   fd.revenueGrowth?.raw   ? fd.revenueGrowth.raw * 100   : undefined,
    earningsGrowth:  fd.earningsGrowth?.raw  ? fd.earningsGrowth.raw * 100  : undefined,
    nextEarningsDate: nextEarnings ? new Date(nextEarnings * 1000).toISOString().split('T')[0] : undefined,
  }

  profileCache.set(symbol, { data, ts: Date.now() })
  return data
}

/* ── News ──────────────────────────────────────────────────── */
export async function getStockNews(symbol: string): Promise<NewsItem[]> {
  const json = await yfFetch(
    `${YF_BASE}/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=10`
  )
  const news = json?.finance?.result?.[0]?.news ?? []
  return news.map((n: any) => ({
    title:       n.title,
    publisher:   n.publisher,
    link:        n.link,
    publishedAt: new Date((n.providerPublishTime ?? Date.now() / 1000) * 1000).toISOString(),
    thumbnail:   n.thumbnail?.resolutions?.[0]?.url,
  }))
}

/* ── Earnings Calendar ─────────────────────────────────────── */
const EARNINGS_SYMBOLS = [
  'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA','JPM','V','JNJ',
  'WMT','PG','MA','UNH','HD','BAC','XOM','CVX','ASML','SAP',
]

export async function getEarningsCalendar(): Promise<EarningsEvent[]> {
  const results = await Promise.allSettled(
    EARNINGS_SYMBOLS.map(async sym => {
      const [q, sum] = await Promise.allSettled([
        getQuote(sym),
        yfFetch(`${YF_BASE}/v10/finance/quoteSummary/${sym}?modules=calendarEvents,earningsHistory`)
      ])
      const quote  = q.status   === 'fulfilled' ? q.value   : null
      const data   = sum.status === 'fulfilled' ? sum.value?.quoteSummary?.result?.[0] : null
      if (!data) return null

      const ce = data.calendarEvents
      const eh = data.earningsHistory?.history ?? []
      const nextRaw = ce?.earnings?.earningsDate?.[0]?.raw

      if (nextRaw) {
        return {
          symbol:   sym,
          company:  quote?.name ?? sym,
          date:     new Date(nextRaw * 1000).toISOString().split('T')[0],
          epsEstimate: ce.earnings?.earningsAverage?.raw,
        } as EarningsEvent
      }
      const last = eh[0]
      if (last) {
        const actual   = last.epsActual?.raw
        const estimate = last.epsEstimate?.raw
        return {
          symbol:      sym,
          company:     quote?.name ?? sym,
          date:        new Date(last.period * 1000).toISOString().split('T')[0],
          epsActual:   actual,
          epsEstimate: estimate,
          surprise:    actual != null && estimate != null ? actual - estimate : undefined,
          surprisePct: last.surprisePercent?.raw,
        } as EarningsEvent
      }
      return null
    })
  )
  return results
    .filter((r): r is PromiseFulfilledResult<EarningsEvent> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/* ── Market Overview (indices) ─────────────────────────────── */
export async function getMarketOverview(): Promise<Quote[]> {
  const symbols = ['SPY', 'QQQ', 'DIA', 'IWM', '^VIX']
  return getQuotes(symbols)
}

/* ── Screener ──────────────────────────────────────────────── */
const SCREENER_SYMBOLS = [
  'AAPL','MSFT','GOOGL','AMZN','NVDA','META','TSLA','BRK-B','JPM','V',
  'JNJ','WMT','PG','MA','UNH','HD','BAC','XOM','CVX',
  'ASML','SAP','LVMH.PA','TTE.PA','SIE.DE',
]

export async function screenStocks(filters: ScreenerFilters): Promise<Quote[]> {
  const quotes = await getQuotes(SCREENER_SYMBOLS)
  return quotes.filter(q => {
    if (q.price === 0) return false
    if (filters.minPrice      !== undefined && q.price         < filters.minPrice)      return false
    if (filters.maxPrice      !== undefined && q.price         > filters.maxPrice)      return false
    if (filters.minMarketCap  !== undefined && (q.marketCap??0)< filters.minMarketCap)  return false
    if (filters.maxPE         !== undefined && q.pe != null && q.pe > filters.maxPE)   return false
    if (filters.minChangePercent !== undefined && q.changePercent < filters.minChangePercent) return false
    if (filters.maxChangePercent !== undefined && q.changePercent > filters.maxChangePercent) return false
    return true
  })
}
