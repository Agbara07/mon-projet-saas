import { Response } from 'express'
import prisma from '../config/prisma'
import { marketRouter } from '../services/market/market-router'
import { AuthRequest } from '../middlewares/auth.middleware'

export const listPortfolios = async (req: AuthRequest, res: Response) => {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId: req.user!.userId },
    include: { holdings: true },
  })
  res.json(portfolios)
}

export const createPortfolio = async (req: AuthRequest, res: Response) => {
  const portfolio = await prisma.portfolio.create({
    data: { name: req.body.name, description: req.body.description, userId: req.user!.userId },
  })
  res.status(201).json(portfolio)
}

export const deletePortfolio = async (req: AuthRequest, res: Response) => {
  await prisma.portfolio.delete({ where: { id: req.params.id } })
  res.json({ message: 'Portefeuille supprimé' })
}

export const getPortfolioWithPrices = async (req: AuthRequest, res: Response) => {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: { holdings: { include: { transactions: true } } },
  })
  if (!portfolio) return res.status(404).json({ message: 'Introuvable' })

  if (portfolio.holdings.length === 0) return res.json({ ...portfolio, totalValue: 0, totalPnl: 0, totalPnlPct: 0 })

  const symbols = portfolio.holdings.map((h) => h.symbol)
  const quotes = await marketRouter.getQuotes(symbols)
  const qmap = Object.fromEntries(quotes.map((q) => [q.symbol, q]))

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
    return { ...h, currentPrice, value, pnl, pnlPct, quote: q }
  })

  res.json({
    ...portfolio,
    holdings: enriched,
    totalValue,
    totalCost,
    totalPnl: totalValue - totalCost,
    totalPnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
  })
}

export const addHolding = async (req: AuthRequest, res: Response) => {
  const { symbol, quantity, avgBuyPrice, companyName } = req.body
  const portfolioId = req.params.id

  const existing = await prisma.holding.findUnique({ where: { portfolioId_symbol: { portfolioId, symbol } } })

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
    data: { type: 'BUY', symbol, quantity, price: avgBuyPrice, total: quantity * avgBuyPrice, holdingId: holding.id },
  })

  res.status(201).json(holding)
}

export const removeHolding = async (req: AuthRequest, res: Response) => {
  await prisma.holding.delete({ where: { id: req.params.holdingId } })
  res.json({ message: 'Position supprimée' })
}
