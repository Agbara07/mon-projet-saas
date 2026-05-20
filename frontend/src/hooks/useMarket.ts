import { useQuery, useQueries } from '@tanstack/react-query'
import api from '@/lib/api'

/* ── Types ──────────────────────────────────────────────────── */
export interface Quote {
  symbol: string; name: string; price: number; change: number
  changePercent: number; volume: number; marketCap?: number
  pe?: number; week52High?: number; week52Low?: number; currency: string
}
export interface HistPoint { date: string; open: number; high: number; low: number; close: number; volume: number }
export interface StockProfile extends Quote {
  sector?: string; industry?: string; description?: string; website?: string
  employees?: number; country?: string; forwardPE?: number; eps?: number
  beta?: number; dividendYield?: number; revenue?: number
  grossMargin?: number; operatingMargin?: number
  revenueGrowth?: number; earningsGrowth?: number; nextEarningsDate?: string
}
export interface NewsItem { title: string; publisher: string; link: string; publishedAt: string; thumbnail?: string }
export interface EarningsEvent {
  symbol: string; company: string; date: string
  epsEstimate?: number; epsActual?: number; surprise?: number; surprisePct?: number
}

/* ── Fetchers ───────────────────────────────────────────────── */
const fetchQuote      = (s: string)  => api.get(`/market/${s}/quote`).then(r => r.data as Quote)
const fetchHistorical = (s: string, p: string) => api.get(`/market/${s}/historical?period=${p}`).then(r => r.data as HistPoint[])
const fetchProfile    = (s: string)  => api.get(`/market/${s}/profile`).then(r => r.data as StockProfile)
const fetchNews       = (s: string)  => api.get(`/market/${s}/news`).then(r => r.data as NewsItem[])
const fetchSearch     = (q: string)  => api.get(`/market/search?q=${encodeURIComponent(q)}`).then(r => r.data)
const fetchOverview   = ()           => api.get('/market/overview').then(r => r.data as Quote[])
const fetchEarnings   = ()           => api.get('/market/earnings').then(r => r.data as EarningsEvent[])
const fetchScreener   = (p: URLSearchParams) => api.get(`/market/screener?${p}`).then(r => r.data as Quote[])

/* ── Hooks ──────────────────────────────────────────────────── */
export const useQuote = (symbol: string) =>
  useQuery({ queryKey: ['quote', symbol], queryFn: () => fetchQuote(symbol), staleTime: 30_000, enabled: !!symbol })

export const useHistorical = (symbol: string, period = '1mo') =>
  useQuery({ queryKey: ['historical', symbol, period], queryFn: () => fetchHistorical(symbol, period), staleTime: 60_000, enabled: !!symbol })

export const useStockProfile = (symbol: string) =>
  useQuery({ queryKey: ['profile', symbol], queryFn: () => fetchProfile(symbol), staleTime: 5 * 60_000, enabled: !!symbol })

export const useStockNews = (symbol: string) =>
  useQuery({ queryKey: ['news', symbol], queryFn: () => fetchNews(symbol), staleTime: 5 * 60_000, enabled: !!symbol })

export const useMarketSearch = (query: string) =>
  useQuery({ queryKey: ['search', query], queryFn: () => fetchSearch(query), staleTime: 30_000, enabled: query.length >= 2 })

export const useMarketOverview = () =>
  useQuery({ queryKey: ['overview'], queryFn: fetchOverview, staleTime: 60_000, refetchInterval: 60_000 })

export const useEarningsCalendar = () =>
  useQuery({ queryKey: ['earnings'], queryFn: fetchEarnings, staleTime: 10 * 60_000 })

export const useScreener = (params: URLSearchParams, enabled: boolean) =>
  useQuery({ queryKey: ['screener', params.toString()], queryFn: () => fetchScreener(params), staleTime: 60_000, enabled })

export const useMultipleQuotes = (symbols: string[]) =>
  useQueries({
    queries: symbols.map(s => ({
      queryKey: ['quote', s],
      queryFn:  () => fetchQuote(s),
      staleTime: 30_000,
      enabled:  !!s,
    })),
  })
