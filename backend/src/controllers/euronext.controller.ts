import { Request, Response } from 'express'
import {
  getCAC40Quotes,
  getEuropeanIndices,
  getEuropeanForex,
  getEuropeanCommodities,
  getEuropeanPalmares,
} from '../services/market/providers/euronext.provider'
import { FMPProvider } from '../services/market/providers/fmp.provider'

const fmp = new FMPProvider()

/* ── Palmarès CAC 40 ─────────────────────────────────────────── */
export async function euronextPalmares(req: Request, res: Response) {
  try {
    const data = await getEuropeanPalmares()
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

/* ── Toutes les cotations CAC 40 ─────────────────────────────── */
export async function euronextStocks(req: Request, res: Response) {
  try {
    const quotes = await getCAC40Quotes()
    res.json({ quotes, updatedAt: new Date().toISOString() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

/* ── Indices européens (ETF proxies) ─────────────────────────── */
export async function euronextIndices(req: Request, res: Response) {
  try {
    const indices = await getEuropeanIndices()
    res.json({ indices, updatedAt: new Date().toISOString() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

/* ── Devises EUR/* (Finnhub OANDA) ──────────────────────────── */
export async function euronextForex(req: Request, res: Response) {
  try {
    const forex = await getEuropeanForex()
    res.json({ forex, updatedAt: new Date().toISOString() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

/* ── Matières premières (ETF proxies) ───────────────────────── */
export async function euronextCommodities(req: Request, res: Response) {
  try {
    const commodities = await getEuropeanCommodities()
    res.json({ commodities, updatedAt: new Date().toISOString() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}

/* ── Vue d'ensemble combinée ─────────────────────────────────── */
export async function euronextOverview(req: Request, res: Response) {
  const [palmares, indices, forex, commodities] = await Promise.allSettled([
    getEuropeanPalmares(),
    getEuropeanIndices(),
    getEuropeanForex(),
    getEuropeanCommodities(),
  ])
  res.json({
    palmares:    palmares.status    === 'fulfilled' ? palmares.value    : null,
    indices:     indices.status     === 'fulfilled' ? indices.value     : [],
    forex:       forex.status       === 'fulfilled' ? forex.value       : [],
    commodities: commodities.status === 'fulfilled' ? commodities.value : [],
    updatedAt:   new Date().toISOString(),
  })
}

/* ── Transactions dirigeants (insider trading via FMP) ───────── */
export async function insiderTransactions(req: Request, res: Response) {
  const { symbol } = req.params
  const limit = Math.min(Number(req.query.limit ?? 20), 100)
  try {
    const transactions = await fmp.getInsiderTransactions(symbol, limit)
    res.json({ symbol, transactions, updatedAt: new Date().toISOString() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
