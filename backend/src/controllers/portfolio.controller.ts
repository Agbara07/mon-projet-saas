import { Response } from 'express'
import { z } from 'zod'
import PDFDocument from 'pdfkit'
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

export const exportPortfolio = handle(async (req, res) => {
  const format: 'csv' | 'pdf' = req.query.format === 'pdf' ? 'pdf' : 'csv'

  const portfolio = await prisma.portfolio.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: { holdings: true },
  })
  if (!portfolio) return res.status(404).json({ message: 'Introuvable' })

  // Enrichir avec les prix live (fallback au PRU si les providers échouent)
  let qmap: Record<string, any> = {}
  if (portfolio.holdings.length > 0) {
    try {
      const quotes = await marketRouter.getQuotes(portfolio.holdings.map(h => h.symbol))
      qmap = Object.fromEntries(quotes.map(q => [q.symbol, q]))
    } catch { /* fallback au PRU */ }
  }

  interface EnrichedHolding {
    symbol: string
    companyName: string | null
    quantity: number
    avgBuyPrice: number
    currentPrice: number
    value: number
    pnl: number
    pnlPct: number
  }

  let totalCost = 0, totalValue = 0
  const enriched: EnrichedHolding[] = portfolio.holdings.map(h => {
    const currentPrice = qmap[h.symbol]?.price ?? h.avgBuyPrice
    const value        = currentPrice * h.quantity
    const cost         = h.avgBuyPrice * h.quantity
    const pnl          = value - cost
    const pnlPct       = cost > 0 ? (pnl / cost) * 100 : 0
    totalCost  += cost
    totalValue += value
    return { symbol: h.symbol, companyName: h.companyName, quantity: h.quantity,
             avgBuyPrice: h.avgBuyPrice, currentPrice, value, pnl, pnlPct }
  })

  const totalPnl    = totalValue - totalCost
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0
  const dateStr     = new Date().toISOString().slice(0, 10)
  const safeName    = portfolio.name.replace(/[/\\?"<>|:*\r\n\t]/g, '_')

  // ── CSV ────────────────────────────────────────────────────────────────
  if (format === 'csv') {
    const escape = (v: string | number) => {
      let s = String(v)
      // Neutralise les préfixes de formules Excel/LibreOffice (formula injection)
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
      return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const lines: string[] = [
      `Portfolio,${escape(portfolio.name)}`,
      `Date,${dateStr}`,
      `Valeur totale,$${totalValue.toFixed(2)}`,
      `P&L total,$${totalPnl.toFixed(2)} (${totalPnlPct.toFixed(2)}%)`,
      '',
      ['Symbole','Société','Quantité','PRU ($)','Prix live ($)','Valeur ($)','P&L ($)','P&L (%)'].join(','),
      ...enriched.map(h => [
        h.symbol,
        escape(h.companyName ?? ''),
        h.quantity,
        h.avgBuyPrice.toFixed(2),
        h.currentPrice.toFixed(2),
        h.value.toFixed(2),
        h.pnl.toFixed(2),
        h.pnlPct.toFixed(2) + '%',
      ].join(',')),
      ['TOTAL','','','','',totalValue.toFixed(2),totalPnl.toFixed(2),totalPnlPct.toFixed(2)+'%'].join(','),
    ]

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="portfolio-${safeName}-${dateStr}.csv"`)
    return res.send('﻿' + lines.join('\r\n')) // BOM UTF-8 pour Excel
  }

  // ── PDF ────────────────────────────────────────────────────────────────
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="portfolio-${safeName}-${dateStr}.pdf"`)
  doc.on('error', (err) => {
    console.error('[export:pdf]', err)
    if (!res.headersSent) res.status(500).json({ message: 'Erreur génération PDF' })
    else res.end()
  })
  doc.pipe(res)

  const C = {
    bg:      '#0d1117',
    panel:   '#161b22',
    border:  '#30363d',
    t1:      '#e6edf3',
    t2:      '#8b949e',
    blue:    '#3B8EF3',
    green:   '#0ECB81',
    red:     '#F6465D',
    white:   '#ffffff',
  }

  const W = doc.page.width  - 80  // 40 margin each side
  const colW = [55, 130, 50, 65, 70, 70, 65, 60] // 8 cols
  const headers = ['Symbole','Société','Qté','PRU ($)','Prix live ($)','Valeur ($)','P&L ($)','P&L (%)']
  const ROW_H = 18, HEADER_H = 22

  // Background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.bg)

  // Title bar
  doc.rect(0, 0, doc.page.width, 56).fill(C.panel)
  doc.fontSize(18).fillColor(C.white).font('Helvetica-Bold')
     .text(portfolio.name, 40, 16)
  doc.fontSize(9).fillColor(C.t2).font('Helvetica')
     .text(`Export du ${new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}  ·  InvestSaaS`, 40, 40)

  // KPI row
  let kpiX = 40
  const kpis = [
    { label: 'VALEUR TOTALE', value: `$${totalValue.toFixed(2)}`, color: C.t1 },
    { label: 'INVESTI',       value: `$${totalCost.toFixed(2)}`,  color: C.t2 },
    { label: 'P&L NET',       value: `${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toFixed(2)}`, color: totalPnl >= 0 ? C.green : C.red },
    { label: 'PERFORMANCE',   value: `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`,     color: totalPnlPct >= 0 ? C.green : C.red },
  ]
  const kpiW = W / kpis.length
  kpis.forEach(k => {
    doc.rect(kpiX, 64, kpiW - 8, 42).fill(C.panel)
    doc.fontSize(7).fillColor(C.t2).font('Helvetica-Bold')
       .text(k.label, kpiX + 10, 72)
    doc.fontSize(13).fillColor(k.color).font('Helvetica-Bold')
       .text(k.value, kpiX + 10, 83)
    kpiX += kpiW
  })

  // Table header
  const tableY = 116
  doc.rect(40, tableY, W, HEADER_H).fill(C.panel)
  let cx = 40
  headers.forEach((h, i) => {
    const align = i < 2 ? 'left' : 'right'
    doc.fontSize(7).fillColor(C.t2).font('Helvetica-Bold')
       .text(h, cx + 4, tableY + 7, { width: colW[i] - 8, align })
    cx += colW[i]
  })

  // Rows — max rows that fit on one landscape A4 page (footer at ~540px, table starts at 138px)
  const MAX_ROWS = Math.floor((doc.page.height - 80 - (tableY + HEADER_H)) / ROW_H)
  const visibleRows = enriched.slice(0, MAX_ROWS)
  const truncated   = enriched.length > MAX_ROWS

  let rowY = tableY + HEADER_H
  visibleRows.forEach((h, idx) => {
    const bg = idx % 2 === 0 ? C.bg : C.panel
    doc.rect(40, rowY, W, ROW_H).fill(bg)

    const up = h.pnl >= 0
    const cells = [
      h.symbol,
      h.companyName ?? '',
      String(h.quantity),
      h.avgBuyPrice.toFixed(2),
      h.currentPrice.toFixed(2),
      h.value.toFixed(2),
      `${up ? '+' : ''}${h.pnl.toFixed(2)}`,
      `${up ? '+' : ''}${h.pnlPct.toFixed(2)}%`,
    ]
    cx = 40
    cells.forEach((cell, i) => {
      const align = i < 2 ? 'left' : 'right'
      const color = i >= 6 ? (up ? C.green : C.red) : (i === 0 ? C.white : C.t1)
      doc.fontSize(8).fillColor(color).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
         .text(cell, cx + 4, rowY + 5, { width: colW[i] - 8, align })
      cx += colW[i]
    })
    rowY += ROW_H
  })

  // Truncation notice
  if (truncated) {
    doc.fontSize(7).fillColor(C.t2).font('Helvetica')
       .text(`* ${enriched.length - MAX_ROWS} position(s) non affichées — utilisez l'export CSV pour la liste complète`,
             40, rowY + 4, { width: W })
    rowY += 16
  }

  // Total row
  doc.rect(40, rowY, W, HEADER_H).fill(C.panel)
  const totalCells = ['TOTAL','','','','',
    totalValue.toFixed(2),
    `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}`,
    `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`,
  ]
  cx = 40
  totalCells.forEach((cell, i) => {
    const align = i < 2 ? 'left' : 'right'
    const color = i >= 6 ? (totalPnl >= 0 ? C.green : C.red) : C.white
    doc.fontSize(8).fillColor(color).font('Helvetica-Bold')
       .text(cell, cx + 4, rowY + 7, { width: colW[i] - 8, align })
    cx += colW[i]
  })

  // Footer
  const footerY = doc.page.height - 28
  doc.rect(0, footerY - 4, doc.page.width, 32).fill(C.panel)
  doc.fontSize(7).fillColor(C.t2).font('Helvetica')
     .text('Document généré par InvestSaaS · Données à titre informatif uniquement · Pas de conseil en investissement',
           40, footerY + 4, { width: W, align: 'center' })

  doc.end()
})
