import {
  IMarketProvider, Quote, HistoricalPoint, StockProfile,
  NewsItem, EarningsEvent, SearchResult,
  IncomeStatement, BalanceSheet, CashFlowStatement,
  AnalystEstimate, DCFValuation, Fundamentals,
} from '../types'

// FMP migré vers /stable/ en août 2025 — /api/v3/ et /api/v4/ = Legacy
const BASE = 'https://financialmodelingprep.com/stable'
const KEY  = process.env.FMP_API_KEY ?? ''

async function fmpFetch(path: string): Promise<any> {
  if (!KEY) throw new Error('FMP_API_KEY manquante')
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${BASE}${path}${sep}apikey=${KEY}`, {
    headers: { 'User-Agent': 'InvestSaaS/1.0' },
    signal:  AbortSignal.timeout(12_000),
  })
  if (r.status === 429) throw new Error('429 rate limit FMP')
  if (!r.ok)            throw new Error(`FMP HTTP ${r.status}`)
  return r.json()
}

export class FMPProvider implements IMarketProvider {
  name     = 'fmp'
  priority = 13

  /* ── Méthodes obligatoires (FMP non optimisé pour ces usages) ── */

  async getQuote(symbol: string): Promise<Quote> {
    const data = await fmpFetch(`/quote?symbol=${symbol}`)
    const q = Array.isArray(data) ? data[0] : data
    if (!q?.price) throw new Error(`Pas de quote FMP pour ${symbol}`)
    return {
      symbol,
      name:          q.name ?? symbol,
      price:         q.price,
      change:        q.change ?? 0,
      changePercent: q.changesPercentage ?? 0,
      volume:        q.volume ?? 0,
      marketCap:     q.marketCap ?? undefined,
      pe:            q.pe ?? undefined,
      week52High:    q.yearHigh ?? undefined,
      week52Low:     q.yearLow ?? undefined,
      currency:      'USD',
      provider:      'fmp',
    }
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(symbols.map(s => this.getQuote(s)))
    return results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)
  }

  async getHistorical(symbol: string, period: string): Promise<HistoricalPoint[]> {
    throw new Error('FMP : utiliser Twelve Data ou Polygon pour l\'historique')
  }

  async getNews(symbol: string): Promise<NewsItem[]> {
    throw new Error('FMP : utiliser Benzinga pour les news')
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    const data = await fmpFetch(`/search?query=${encodeURIComponent(query)}&limit=10`)
    if (!Array.isArray(data)) return []
    return data.map((r: any) => ({
      symbol:   r.symbol,
      name:     r.name,
      exchange: r.stockExchange ?? r.exchangeShortName ?? '',
      type:     r.type ?? 'stock',
    }))
  }

  async getEarningsCalendar(): Promise<EarningsEvent[]> {
    const data = await fmpFetch('/earning-calendar')
    if (!Array.isArray(data)) return []
    return data.slice(0, 50).map((e: any) => ({
      symbol:      e.symbol,
      company:     e.symbol,
      date:        e.date,
      epsEstimate: e.epsEstimated ?? undefined,
      epsActual:   e.eps ?? undefined,
      surprise:    e.surprise ?? undefined,
      surprisePct: e.surprise !== undefined && e.epsEstimated
        ? (e.surprise / Math.abs(e.epsEstimated)) * 100
        : undefined,
      provider: 'fmp',
    }))
  }

  /* ── getProfile — FMP a des fondamentaux riches ────────────── */
  async getProfile(symbol: string): Promise<StockProfile> {
    const data = await fmpFetch(`/profile?symbol=${symbol}`)
    const p    = Array.isArray(data) ? data[0] : data
    if (!p?.symbol) throw new Error(`Pas de profil FMP pour ${symbol}`)
    return {
      symbol,
      name:              p.companyName ?? symbol,
      price:             p.price ?? 0,
      change:            p.changes ?? 0,
      changePercent:     p.price > 0 ? (p.changes / p.price) * 100 : 0,
      currency:          p.currency ?? 'USD',
      sector:            p.sector ?? undefined,
      industry:          p.industry ?? undefined,
      description:       p.description ?? undefined,
      website:           p.website ?? undefined,
      employees:         p.fullTimeEmployees ? Number(p.fullTimeEmployees) : undefined,
      country:           p.country ?? undefined,
      marketCap:         p.mktCap ?? undefined,
      pe:                p.pe ?? undefined,
      beta:              p.beta ?? undefined,
      dividendYield:     p.lastDiv > 0 && p.price > 0 ? (p.lastDiv / p.price) * 100 : undefined,
      week52High:        p['52WeekHigh'] ?? undefined,
      week52Low:         p['52WeekLow'] ?? undefined,
      provider:          'fmp',
    }
  }

  /* ── Méthodes spécialisées FMP ─────────────────────────────── */

  async getIncomeStatements(symbol: string, limit = 10): Promise<IncomeStatement[]> {
    const data = await fmpFetch(`/income-statement?symbol=${symbol}&limit=${limit}`)
    if (!Array.isArray(data)) return []
    return data.map((s: any) => ({
      date:             s.date,
      revenue:          s.revenue ?? 0,
      grossProfit:      s.grossProfit ?? 0,
      operatingIncome:  s.operatingIncome ?? 0,
      netIncome:        s.netIncome ?? 0,
      eps:              s.eps ?? 0,
      ebitda:           s.ebitda ?? 0,
      grossMargin:      s.grossProfitRatio ? s.grossProfitRatio * 100 : undefined,
      operatingMargin:  s.operatingIncomeRatio ? s.operatingIncomeRatio * 100 : undefined,
      netMargin:        s.netIncomeRatio ? s.netIncomeRatio * 100 : undefined,
    }))
  }

  async getBalanceSheets(symbol: string, limit = 10): Promise<BalanceSheet[]> {
    const data = await fmpFetch(`/balance-sheet-statement?symbol=${symbol}&limit=${limit}`)
    if (!Array.isArray(data)) return []
    return data.map((s: any) => ({
      date:             s.date,
      totalAssets:      s.totalAssets ?? 0,
      totalLiabilities: s.totalLiabilities ?? 0,
      totalEquity:      s.totalStockholdersEquity ?? 0,
      cash:             s.cashAndCashEquivalents ?? 0,
      debt:             s.totalDebt ?? 0,
      goodwill:         s.goodwill ?? undefined,
      debtToEquity:     s.totalStockholdersEquity > 0
        ? s.totalDebt / s.totalStockholdersEquity
        : undefined,
    }))
  }

  async getCashFlows(symbol: string, limit = 10): Promise<CashFlowStatement[]> {
    const data = await fmpFetch(`/cash-flow-statement?symbol=${symbol}&limit=${limit}`)
    if (!Array.isArray(data)) return []
    return data.map((s: any) => ({
      date:               s.date,
      operatingCashFlow:  s.operatingCashFlow ?? 0,
      capitalExpenditure: s.capitalExpenditure ?? 0,
      freeCashFlow:       s.freeCashFlow ?? 0,
      dividendsPaid:      s.dividendsPaid ?? undefined,
    }))
  }

  async getAnalystEstimates(symbol: string): Promise<AnalystEstimate[]> {
    // /stable/analyst-estimates requiert un plan payant FMP
    // Endpoint non disponible sur le plan gratuit → retourne tableau vide
    throw new Error('analyst-estimates non disponible sur le plan FMP gratuit — upgrade requis')
  }

  async getDCF(symbol: string): Promise<DCFValuation> {
    const data = await fmpFetch(`/discounted-cash-flow?symbol=${symbol}`)
    const d    = Array.isArray(data) ? data[0] : data
    if (!d?.dcf) throw new Error(`Pas de DCF FMP pour ${symbol}`)
    const price  = d['Stock Price'] ?? d.Stock_Price ?? d.stockPrice ?? 0
    const upside = price > 0 ? ((d.dcf - price) / price) * 100 : 0
    return {
      symbol,
      date:       d.date,
      dcf:        d.dcf,
      stockPrice: price,
      upside:     Math.round(upside * 100) / 100,
    }
  }

  async getFundamentals(symbol: string, limit = 10): Promise<Fundamentals> {
    const [income, balance, cashflow, estimates] = await Promise.allSettled([
      this.getIncomeStatements(symbol, limit),
      this.getBalanceSheets(symbol, limit),
      this.getCashFlows(symbol, limit),
      this.getAnalystEstimates(symbol),
    ])

    let dcf: DCFValuation | undefined
    try { dcf = await this.getDCF(symbol) } catch { /* optionnel */ }

    return {
      symbol,
      incomeStatements: income.status  === 'fulfilled' ? income.value  : [],
      balanceSheets:    balance.status === 'fulfilled' ? balance.value : [],
      cashFlows:        cashflow.status === 'fulfilled' ? cashflow.value : [],
      analystEstimates: estimates.status === 'fulfilled' ? estimates.value : [],
      dcf,
      provider: 'fmp',
    }
  }
}
