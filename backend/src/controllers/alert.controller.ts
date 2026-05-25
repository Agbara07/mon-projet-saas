import { Response } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

const alertSchema = z.object({
  symbol:    z.string().min(1).max(20).toUpperCase(),
  type:      z.enum(['PRICE', 'PERCENT_CHANGE', 'VOLUME']),
  condition: z.enum(['ABOVE', 'BELOW']),
  threshold: z.number().positive(),
  message:   z.string().max(500).optional(),
})

const handle = (fn: (req: AuthRequest, res: Response) => Promise<any>) =>
  async (req: AuthRequest, res: Response) => {
    try { await fn(req, res) }
    catch (e: any) { res.status(500).json({ message: 'Erreur serveur' }) }
  }

export const listAlerts = handle(async (req, res) => {
  const alerts = await prisma.alert.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(alerts)
})

export const createAlert = handle(async (req, res) => {
  const parsed = alertSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message })
  const { symbol, type, condition, threshold, message } = parsed.data
  const alert = await prisma.alert.create({
    data: { symbol, type, condition, threshold, message, userId: req.user!.userId },
  })
  res.status(201).json(alert)
})

export const deleteAlert = handle(async (req, res) => {
  const deleted = await prisma.alert.deleteMany({
    where: { id: req.params.id, userId: req.user!.userId },
  })
  if (deleted.count === 0) return res.status(404).json({ message: 'Introuvable' })
  res.json({ message: 'Alerte supprimée' })
})

export const toggleAlert = async (req: AuthRequest, res: Response) => {
  const alert = await prisma.alert.findFirst({ where: { id: req.params.id, userId: req.user!.userId } })
  if (!alert) return res.status(404).json({ message: 'Introuvable' })
  const updated = await prisma.alert.update({ where: { id: alert.id }, data: { active: !alert.active, triggered: false } })
  res.json(updated)
}
