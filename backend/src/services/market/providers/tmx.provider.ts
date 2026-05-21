/**
 * TMX Group — Corporate events, earnings calendar, Canadian equities
 * API via TMX DataLinx / Market Intelligence : https://datalinx.tmx.com
 * Données : dividendes, AGM, splits, corporate actions, calendrier émetteur
 */
import { IMarketProvider, Quote, HistoricalPoint, StockProfile, NewsItem, EarningsEvent, SearchResult } from '../types'

const BASE = 'https://app-money.tmx.com/graphql'
const KEY  = process.env.TMX_API_KEY ?? ''

// TMX expose une API GraphQL publique (partiellement)
async function tmxFetch(query: string, variables = {}): Promise<any> {
  const r = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      ...(KEY ? { 'Authorization': `Bearer ${KEY}` } : {}),
    },
    body:   JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10_000),
  })
  if (r.status === 429) throw new Error('429 rate limit TMX')
  if (!r.ok)            throw new Error(`TMX HTTP ${r.status}`)
  const data: any = await r.json()
  if (data.errors) throw new Error(data.errors[0]?.message ?? 'TMX GraphQL error')
  return data.data
}

export class TMXProvider implements IMarketProvider {
  name     = 'tmx'
  priority = 10  // spécialisé corporate events & Canada

  // TMX = marché canadien (TSX) — quotes délèguent
  async getQuote(symbol: string):            Promise<Quote>             { throw new Error('TMX: spécialisé TSX/corporate events') }
  async getQuotes(symbols: string[]):        Promise<Quote[]>           { throw new Error('TMX: spécialisé TSX') }
  async getHistorical(s: string, p: string): Promise<HistoricalPoint[]> { throw new Error('TMX: pas d\'historique général') }
  async getProfile(symbol: string):          Promise<StockProfile>      { throw new Error('TMX: profil TSX seulement') }
  async searchSymbols(q: string):            Promise<SearchResult[]>    { throw new Error('TMX: TSX seulement') }
  async getNews(symbol: string):             Promise<NewsItem[]>         { return [] }
  async getMarketOverview():                 Promise<Quote[]>            { throw new Error('TMX: pas d\'overview') }

  // ✨ SPÉCIALITÉ : Corporate events & calendrier émetteur
  async getCorporateEvents(symbol: string): Promise<any[]> {
    try {
      const query = `
        query GetCorporateEvents($symbol: String!) {
          getCompanyEvents(symbol: $symbol) {
            date
            eventType
            description
            exDate
            recordDate
            payableDate
            amount
          }
        }
      `
      const data = await tmxFetch(query, { symbol })
      return (data?.getCompanyEvents ?? []).map((e: any) => ({
        symbol,
        date:        e.date,
        type:        e.eventType,   // dividend, split, agm, rights...
        description: e.description,
        exDate:      e.exDate,
        recordDate:  e.recordDate,
        payableDate: e.payableDate,
        amount:      e.amount,
        provider:    'tmx',
      }))
    } catch { return [] }
  }

  // Calendar des résultats (émetteurs TSX)
  async getEarningsCalendar(): Promise<EarningsEvent[]> {
    try {
      const query = `
        query GetEarningsCalendar {
          getEarningsCalendar {
            ticker
            companyName
            reportDate
            epsEstimate
            epsActual
          }
        }
      `
      const data = await tmxFetch(query)
      return (data?.getEarningsCalendar ?? []).map((e: any) => ({
        symbol:      e.ticker,
        company:     e.companyName,
        date:        e.reportDate,
        epsEstimate: e.epsEstimate,
        epsActual:   e.epsActual,
        provider:    'tmx',
      }))
    } catch { return [] }
  }

  // Quotes TSX (actions canadiennes)
  async getTSXQuote(symbol: string): Promise<Quote> {
    const query = `
      query GetQuote($symbol: String!) {
        getQuoteBySymbol(symbol: $symbol, locale: "en") {
          symbol
          longName
          price
          priceChange
          percentChange
          volume
          marketCap
          week52high
          week52low
        }
      }
    `
    const data = await tmxFetch(query, { symbol })
    const q    = data?.getQuoteBySymbol
    if (!q) throw new Error(`TMX: pas de quote pour ${symbol}`)
    return {
      symbol:        q.symbol,
      name:          q.longName ?? symbol,
      price:         q.price,
      change:        q.priceChange,
      changePercent: q.percentChange,
      volume:        q.volume,
      marketCap:     q.marketCap,
      week52High:    q.week52high,
      week52Low:     q.week52low,
      currency:      'CAD',
      provider:      'tmx',
    }
  }
}
