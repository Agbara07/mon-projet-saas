import { Request, Response } from 'express'
import {
  getQuote, getHistorical, searchSymbols, screenStocks, ScreenerFilters,
  getStockProfile, getStockNews, getEarningsCalendar, getMarketOverview,
} from '../services/market.service'

const handle = (fn: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response) => {
    try { await fn(req, res) }
    catch (e: any) {
      console.error('[market]', e?.message ?? e)
      res.status(502).json({ message: 'Données de marché temporairement indisponibles', error: e?.message })
    }
  }

export const quote = handle(async (req, res) => {
  const data = await getQuote(req.params.symbol.toUpperCase())
  res.json(data)
})

export const historical = handle(async (req, res) => {
  const period = (req.query.period as any) || '1mo'
  const data = await getHistorical(req.params.symbol.toUpperCase(), period)
  res.json(data)
})

export const search = handle(async (req, res) => {
  const q = req.query.q as string
  if (!q) return res.status(400).json({ message: 'Paramètre q requis' })
  const results = await searchSymbols(q)
  res.json(results)
})

export const screener = handle(async (req, res) => {
  const filters: ScreenerFilters = {
    minPrice:        req.query.minPrice        ? Number(req.query.minPrice)        : undefined,
    maxPrice:        req.query.maxPrice        ? Number(req.query.maxPrice)        : undefined,
    minMarketCap:    req.query.minMarketCap    ? Number(req.query.minMarketCap)    : undefined,
    maxPE:           req.query.maxPE           ? Number(req.query.maxPE)           : undefined,
    minChangePercent:req.query.minChangePercent? Number(req.query.minChangePercent): undefined,
    maxChangePercent:req.query.maxChangePercent? Number(req.query.maxChangePercent): undefined,
  }
  const results = await screenStocks(filters)
  res.json(results)
})

export const profile = handle(async (req, res) => {
  const data = await getStockProfile(req.params.symbol.toUpperCase())
  res.json(data)
})

export const news = handle(async (req, res) => {
  const data = await getStockNews(req.params.symbol.toUpperCase())
  res.json(data)
})

export const earningsCalendar = handle(async (_req, res) => {
  const data = await getEarningsCalendar()
  res.json(data)
})

export const marketOverview = handle(async (_req, res) => {
  const data = await getMarketOverview()
  res.json(data)
})
