/**
 * Benzinga — News financières, analyst ratings, options activity
 * API directe (pas via Polygon) : https://docs.benzinga.com
 */
import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://api.benzinga.com/api/v2'
const KEY  = process.env.BENZINGA_API_KEY ?? ''

async function bzFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('BENZINGA_API_KEY manquante')
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${BASE}${path}${sep}token=${KEY}`, {
    headers: { 'Accept': 'application/json' },
    signal:  AbortSignal.timeout(10_000),
  })
  if (r.status === 429) throw new Error('429 rate limit Benzinga')
  if (r.status === 401) throw new Error('401 clé Benzinga invalide')
  if (!r.ok)            throw new Error(`Benzinga HTTP ${r.status}`)
  return r.json()
}

export class BenzingaProvider implements IMarketProvider {
  name     = 'benzinga'
  priority = 9  // spécialisé news/ratings — pas pour les quotes

  // Benzinga n'est pas un provider de quotes — il délègue (throw = fallback)
  async getQuote(symbol: string):          Promise<Quote>          { throw new Error('Benzinga: pas de quotes') }
  async getQuotes(symbols: string[]):      Promise<Quote[]>        { throw new Error('Benzinga: pas de quotes') }
  async getHistorical(s: string, p: string): Promise<HistoricalPoint[]> { throw new Error('Benzinga: pas d\'historique') }
  async getProfile(symbol: string):        Promise<StockProfile>   { throw new Error('Benzinga: pas de profil basique') }
  async searchSymbols(q: string):          Promise<SearchResult[]> { throw new Error('Benzinga: pas de search') }
  async getMarketOverview():               Promise<Quote[]>        { throw new Error('Benzinga: pas d\'overview') }

  // ✨ SPÉCIALITÉ : News premium + Analyst Ratings
  async getNews(symbol: string): Promise<NewsItem[]> {
    const data = await bzFetch(`/news?tickers=${symbol}&pageSize=15&displayOutput=full`)
    const articles = data?.data ?? data ?? []
    return (Array.isArray(articles) ? articles : []).slice(0, 15).map((n: any) => ({
      title:       n.title,
      publisher:   n.author ?? 'Benzinga',
      link:        n.url,
      publishedAt: n.created ?? n.updated ?? new Date().toISOString(),
      thumbnail:   n.image?.[0]?.url ?? undefined,
      sentiment:   n.stocks?.[0]?.sentiment === 'bullish' ? 'positive'
               :   n.stocks?.[0]?.sentiment === 'bearish' ? 'negative' : 'neutral',
      provider:    'benzinga',
    }))
  }

  // ✨ SPÉCIALITÉ : Analyst ratings (upgrades/downgrades)
  async getAnalystRatings(symbol: string): Promise<any[]> {
    try {
      const data = await bzFetch(`/analyst/ratings?symbols=${symbol}&pageSize=10`)
      return (data?.ratings ?? []).map((r: any) => ({
        analyst:    r.analyst,
        action:     r.action_pt,        // upgrade/downgrade/maintains
        rating:     r.rating_current,
        priceTo:    r.pt_current,
        priceFrom:  r.pt_prior,
        date:       r.date,
        provider:   'benzinga',
      }))
    } catch { return [] }
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const end   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      const data  = await bzFetch(`/calendar/earnings?date_from=${today}&date_to=${end}&pageSize=50`)
      return (data?.earnings ?? []).map((e: any) => ({
        symbol:      e.ticker,
        company:     e.name,
        date:        e.date,
        epsEstimate: e.eps_est ? parseFloat(e.eps_est) : undefined,
        epsActual:   e.eps ? parseFloat(e.eps) : undefined,
        surprisePct: e.surprise_pct ? parseFloat(e.surprise_pct) : undefined,
        provider:    'benzinga',
      }))
    } catch { return [] }
  }
}
