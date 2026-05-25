import { Response } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { marketRouter } from '../services/market/market-router'
import { AuthRequest } from '../middlewares/auth.middleware'

const portfolioSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

const holdingSchema = z.object({
  symbol:      z.string().min(1).max(20).toUpperCase(),
  quantity:    z.number().positive(),
  avgBuyPrice: z.number().positive(),
  companyName: z.string().max(200).optional(),
})

const handle = (fn: (req: AuthRequest, res: Response) => Promise<any>) =>
  async (req: AuthRequest, res: Response) => {
    try { await fn(req, res) }
    catch (e: any) {
      console.error('[portfolio]', e?.message)
      res.status(500).json({ message: 'Erreur serveur', error: e?.message })
    }
  }

export const listPortfolios = handle(async (req, res) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: req.user!.userId },
    include: { holdings: true },
  })
  res.json(portfolios)
})

export const createPortfolio = handle(async (req, res) => {
  const parsed = portfolioSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message })
  const { name, description } = parsed.data
  const portfolio = await prisma.portfolio.create({
    data: { name, description, userId: req.user!.userId },
  })
  res.status(201).json(portfolio)
})

export const deletePortfolio = handle(async (req, res) => {
  const deleted = await prisma.portfolio.deleteMany({
    where: { id: req.params.id, userId: req.user!.userId },
  })
  if (deleted.count === 0) return res.status(404).json({ message: 'Introuvable' })
  res.json({ message: 'Portefeuille supprimé' })
})

export const getPortfolioWithPrices = handle(async (req, res) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: { holdings: { include: { transactions: true } } },
  })
  if (!portfolio) return res.status(404).json({ message: 'Introuvable' })

  if (portfolio.holdings.length === 0) {
    return res.json({ ...portfolio, totalValue: 0, totalCost: 0, totalPnl: 0, totalPnlPct: 0 })
  }

  const symbols = portfolio.holdings.map((h) => h.symbol)

  // Fallback gracieux si les providers de marché échouent
  let qmap: Record<string, any> = {}
  try {
    const quotes = await marketRouter.getQuotes(symbols)
    qmap = Object.fromEntries(quotes.map((q) => [q.symbol, q]))
  } catch {
    // Les prix restent à avgBuyPrice — PnL = 0
  }

  let totalCost = 0
  let totalValue = 0

  const enriched = portfolio.holdings.map((h) => {
    const q = qmap[h.symbol]
    const currentPrice = q?.price ?? h.avgBuyPrice
    const value = currentPrice * h.quantity
    const cost = h.avgBuyPrice * h.quantity
    const pnl = value - cost
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0
    totalCost += cost
    totalValue += value
    return { ...h, currentPrice, value, pnl, pnlPct, quote: q ?? null }
  })

  res.json({
    ...portfolio,
    holdings: enriched,
    totalValue,
    totalCost,
    totalPnl: totalValue - totalCost,
    totalPnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
  })
})

export const addHolding = handle(async (req, res) => {
  const parsed = holdingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message })
  const { symbol, quantity, avgBuyPrice, companyName } = parsed.data
  const portfolioId = req.params.id

  const existing = await prisma.holding.findUnique({
    where: { portfolioId_symbol: { portfolioId, symbol } },
  })

  let holding
  if (existing) {
    const totalQty = existing.quantity + quantity
    const newAvg = (existing.avgBuyPrice * existing.quantity + avgBuyPrice * quantity) / totalQty
    holding = await prisma.holding.update({
      where: { id: existing.id },
      data: { quantity: totalQty, avgBuyPrice: newAvg },
    })
  } else {
    holding = await prisma.holding.create({
      data: { symbol, quantity, avgBuyPrice, companyName, portfolioId },
    })
  }

  await prisma.transaction.create({
    data: {
      type: 'BUY', symbol, quantity, price: avgBuyPrice,
      total: quantity * avgBuyPrice, holdingId: holding.id,
    },
  })

  res.status(201).json(holding)
})

export const removeHolding = handle(async (req, res) => {
  // Vérifie que le holding appartient à un portfolio de l'utilisateur
  const holding = await prisma.holding.findFirst({
    where: { id: req.params.holdingId, portfolio: { userId: req.user!.userId } },
  })
  if (!holding) return res.status(404).json({ message: 'Introuvable' })
  await prisma.holding.delete({ where: { id: holding.id } })
  res.json({ message: 'Position supprimée' })
})
