import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult, TechnicalData, TechnicalIndicator } from '../types'

const BASE = 'https://api.twelvedata.com'
const KEY  = process.env.TWELVE_DATA_API_KEY ?? ''

async function tdFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('TWELVE_DATA_API_KEY manquante')
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${BASE}${path}${sep}apikey=${KEY}`, {
    signal: AbortSignal.timeout(12_000),
  })
  if (r.status === 429) throw new Error('429 rate limit TwelveData')
  if (!r.ok)            throw new Error(`TwelveData HTTP ${r.status}`)
  const data: any = await r.json()
  if (data.code === 400 || data.status === 'error') throw new Error(data.message ?? 'TwelveData error')
  return data
}

const PERIOD_MAP: Record<string, { interval: string; outputsize: number }> = {
  '1d':  { interval: '5min',  outputsize: 78  },
  '5d':  { interval: '30min', outputsize: 60  },
  '1mo': { interval: '1day',  outputsize: 30  },
  '3mo': { interval: '1day',  outputsize: 90  },
  '6mo': { interval: '1day',  outputsize: 180 },
  '1y':  { interval: '1week', outputsize: 52  },
  '5y':  { interval: '1month',outputsize: 60  },
}

export class TwelveDataProvider implements IMarketProvider {
  name     = 'twelvedata'
  priority = 2

  async getQuote(symbol: string): Promise<Quote> {
    const data = await tdFetch(`/quote?symbol=${symbol}`)
    return {
      symbol:        data.symbol,
      name:          data.name ?? symbol,
      price:         parseFloat(data.close),
      change:        parseFloat(data.change),
      changePercent: parseFloat(data.percent_change),
      volume:        parseInt(data.volume ?? '0'),
      week52High:    parseFloat(data.fifty_two_week?.high ?? '0') || undefined,
      week52Low:     parseFloat(data.fifty_two_week?.low ?? '0') || undefined,
      currency:      data.currency ?? 'USD',
      provider:      'twelvedata',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    // TwelveData supporte les requêtes batch
    try {
      const joined = symbols.join(',')
      const data   = await tdFetch(`/quote?symbol=${joined}`)
      if (Array.isArray(data)) return data.map(this._mapQuote)
      if (data.symbol) return [this._mapQuote(data)]
      // Objet avec clés = symboles
      return Object.values(data).map(this._mapQuote)
    } catch {
      const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)))
      return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
    }
  }

  private _mapQuote = (d: any): Quote => ({
    symbol:        d.symbol,
    name:          d.name ?? d.symbol,
    price:         parseFloat(d.close),
    change:        parseFloat(d.change ?? '0'),
    changePercent: parseFloat(d.percent_change ?? '0'),
    volume:        parseInt(d.volume ?? '0'),
    currency:      d.currency ?? 'USD',
    provider:      'twelvedata',
  })

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    const { interval, outputsize } = PERIOD_MAP[period] ?? PERIOD_MAP['1mo']
    const data = await tdFetch(`/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&order=ASC`)
    return (data.values ?? []).map((v: any) => ({
      date:   v.datetime.split(' ')[0],
      open:   parseFloat(v.open),
      high:   parseFloat(v.high),
      low:    parseFloat(v.low),
      close:  parseFloat(v.close),
      volume: parseInt(v.volume ?? '0'),
    }))
  }

  async getProfile(symbol: string): Promise<StockProfile> {
    const [q, p] = await Promise.allSettled([
      this.getQuote(symbol),
      tdFetch(`/profile?symbol=${symbol}`),
    ])
    const quote   = q.status === 'fulfilled' ? q.value : {} as Quote
    const profile = p.status === 'fulfilled' ? p.value : {}
    return {
      ...quote, symbol,
      sector:      profile.sector,
      industry:    profile.industry,
      description: profile.description,
      website:     profile.website,
      employees:   profile.employees,
      country:     profile.country,
      provider:    'twelvedata',
    }
  }

  async getNews(symbol: string): Promise<NewsItem[]> { return [] } // TwelveData n'a pas de news gratuitement

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const data = await tdFetch(`/symbol_search?symbol=${encodeURIComponent(query)}&show_plan=true`)
    return (data.data ?? []).slice(0, 10).map((r: any) => ({
      symbol:   r.symbol,
      name:     r.instrument_name,
      exchange: r.exchange,
      type:     r.instrument_type,
    }))
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> { return [] } // non disponible gratuitement

  async getMarketOverview(): Promise<Quote[]> {
    return this.getQuotes(['SPY', 'QQQ', 'DIA', 'IWM'])
  }

  // ✨ EXCLUSIVITÉ TwelveData : indicateurs techniques natifs
  async getTechnicalIndicators(symbol: string, period: string): Promise<TechnicalData> {
    const { interval, outputsize } = PERIOD_MAP[period] ?? PERIOD_MAP['1mo']
    const params = `symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&order=ASC`

    const [rsiData, macdData, bbData, sma20Data, ema50Data] = await Promise.allSettled([
      tdFetch(`/rsi?${params}&time_period=14`),
      tdFetch(`/macd?${params}&fast_period=12&slow_period=26&signal_period=9`),
      tdFetch(`/bbands?${params}&time_period=20&sd=2`),
      tdFetch(`/sma?${params}&time_period=20`),
      tdFetch(`/ema?${params}&time_period=50`),
    ])

    return {
      symbol,
      rsi:      rsiData.status === 'fulfilled'
                  ? rsiData.value.values?.map((v: any) => ({ date: v.datetime.split(' ')[0], value: parseFloat(v.rsi) })) : [],
      macd:     macdData.status === 'fulfilled'
                  ? macdData.value.values?.map((v: any) => ({
                      date:      v.datetime.split(' ')[0],
                      macd:      parseFloat(v.macd),
                      signal:    parseFloat(v.macd_signal),
                      histogram: parseFloat(v.macd_hist),
                    })) : [],
      bollinger:bbData.status === 'fulfilled'
                  ? bbData.value.values?.map((v: any) => ({
                      date:   v.datetime.split(' ')[0],
                      upper:  parseFloat(v.upper_band),
                      middle: parseFloat(v.middle_band),
                      lower:  parseFloat(v.lower_band),
                    })) : [],
      sma20:    sma20Data.status === 'fulfilled'
                  ? sma20Data.value.values?.map((v: any) => ({ date: v.datetime.split(' ')[0], value: parseFloat(v.sma) })) : [],
      ema50:    ema50Data.status === 'fulfilled'
                  ? ema50Data.value.values?.map((v: any) => ({ date: v.datetime.split(' ')[0], value: parseFloat(v.ema) })) : [],
      provider: 'twelvedata',
    }
  }
}
