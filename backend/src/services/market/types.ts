/* ── Interfaces communes à tous les providers ─────────────── */

export interface Quote {
  symbol:        string
  name:          string
  price:         number
  change:        number
  changePercent: number
  volume:        number
  marketCap?:    number
  pe?:           number
  week52High?:   number
  week52Low?:    number
  currency:      string
  provider?:     string   // quel provider a fourni la donnée
}

export interface HistoricalPoint {
  date:   string
  open:   number
  high:   number
  low:    number
  close:  number
  volume: number
}

export interface StockProfile {
  symbol:            string
  name:              string
  price:             number
  change:            number
  changePercent:     number
  currency:          string
  sector?:           string
  industry?:         string
  description?:      string
  website?:          string
  employees?:        number
  country?:          string
  marketCap?:        number
  pe?:               number
  forwardPE?:        number
  eps?:              number
  beta?:             number
  dividendYield?:    number
  week52High?:       number
  week52Low?:        number
  revenue?:          number
  grossMargin?:      number
  operatingMargin?:  number
  revenueGrowth?:    number
  earningsGrowth?:   number
  nextEarningsDate?: string
  provider?:         string
}

export interface NewsItem {
  title:       string
  publisher:   string
  link:        string
  publishedAt: string
  thumbnail?:  string
  sentiment?:  'positive' | 'negative' | 'neutral'
  provider?:   string
}

export interface EarningsEvent {
  symbol:       string
  company:      string
  date:         string
  epsEstimate?: number
  epsActual?:   number
  surprise?:    number
  surprisePct?: number
  provider?:    string
}

export interface TechnicalIndicator {
  date:  string
  value: number
}

export interface TechnicalData {
  symbol:    string
  rsi?:      TechnicalIndicator[]
  macd?:     { macd: number; signal: number; histogram: number; date: string }[]
  bollinger?:{ upper: number; middle: number; lower: number; date: string }[]
  sma20?:    TechnicalIndicator[]
  ema50?:    TechnicalIndicator[]
  provider?: string
}

export interface SearchResult {
  symbol:   string
  name:     string
  exchange: string
  type?:    string
}

export interface ScreenerFilters {
  minPrice?:         number
  maxPrice?:         number
  minMarketCap?:     number
  maxPE?:            number
  minChangePercent?: number
  maxChangePercent?: number
  sector?:           string
  exchange?:         string
}

/* ── Interface abstraite qu'implémente chaque provider ────── */
export interface IMarketProvider {
  name:     string
  priority: number   // plus bas = plus prioritaire

  getQuote(symbol: string):                             Promise<Quote>
  getQuotes(symbols: string[]):                         Promise<Quote[]>
  getHistorical(symbol: string, period: string):        Promise<HistoricalPoint[]>
  getProfile(symbol: string):                           Promise<StockProfile>
  getNews(symbol: string):                              Promise<NewsItem[]>
  searchSymbols(query: string):                         Promise<SearchResult[]>
  getEarningsCalendar():                                Promise<EarningsEvent[]>

  // Optionnels — implémentés selon les capacités du provider
  getTechnicalIndicators?(symbol: string, period: string): Promise<TechnicalData>
  getMarketOverview?():                                 Promise<Quote[]>
}

/* ── Données fondamentales (FMP) ────────────────────────────── */

export interface IncomeStatement {
  date:             string
  revenue:          number
  grossProfit:      number
  operatingIncome:  number
  netIncome:        number
  eps:              number
  ebitda:           number
  grossMargin?:     number
  operatingMargin?: number
  netMargin?:       number
}

export interface BalanceSheet {
  date:             string
  totalAssets:      number
  totalLiabilities: number
  totalEquity:      number
  cash:             number
  debt:             number
  goodwill?:        number
  debtToEquity?:    number
}

export interface CashFlowStatement {
  date:                string
  operatingCashFlow:   number
  capitalExpenditure:  number
  freeCashFlow:        number
  dividendsPaid?:      number
}

export interface AnalystEstimate {
  date:             string
  epsAvg:           number
  epsHigh:          number
  epsLow:           number
  revenueAvg:       number
  revenueHigh:      number
  revenueLow:       number
  numberAnalysts:   number
}

export interface DCFValuation {
  symbol:     string
  date:       string
  dcf:        number   // fair value par action
  stockPrice: number
  upside:     number   // % upside = (dcf - price) / price * 100
}

export interface Fundamentals {
  symbol:            string
  incomeStatements:  IncomeStatement[]
  balanceSheets:     BalanceSheet[]
  cashFlows:         CashFlowStatement[]
  analystEstimates:  AnalystEstimate[]
  dcf?:              DCFValuation
  provider:          string
}

/* ── Statut d'un provider ───────────────────────────────────── */
export interface ProviderStatus {
  name:        string
  healthy:     boolean
  lastError?:  string
  errorCount:  number
  lastSuccess: Date | null
  rateLimited: boolean
}
