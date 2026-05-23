import { Response } from 'express'
import prisma from '../config/prisma'
import { marketRouter } from '../services/market/market-router'
import { AuthRequest } from '../middlewares/auth.middleware'

export const getWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.watchlistItem.findMany({
      where: { userId: req.user!.userId },
      orderBy: { addedAt: 'desc' },
    })
    if (items.length === 0) return res.json([])

    let qmap: Record<string, any> = {}
    try {
      const quotes = await marketRouter.getQuotes(items.map((i) => i.symbol))
      qmap = Object.fromEntries(quotes.map((q) => [q.symbol, q]))
    } catch { /* retourne sans quotes si Yahoo Finance échoue */ }

    res.json(items.map((i) => ({ ...i, quote: qmap[i.symbol] ?? null })))
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

export const addToWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, companyName } = req.body
    const item = await prisma.watchlistItem.upsert({
      where: { userId_symbol: { userId: req.user!.userId, symbol: symbol.toUpperCase() } },
      create: { symbol: symbol.toUpperCase(), companyName, userId: req.user!.userId },
      update: {},
    })
    res.status(201).json(item)
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}

export const removeFromWatchlist = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.watchlistItem.deleteMany({
      where: { userId: req.user!.userId, symbol: req.params.symbol.toUpperCase() },
    })
    res.json({ message: 'Retiré de la watchlist' })
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur' })
  }
}
