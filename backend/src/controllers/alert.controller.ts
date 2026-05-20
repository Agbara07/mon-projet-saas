import { Response } from 'express'
import prisma from '../config/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

export const listAlerts = async (req: AuthRequest, res: Response) => {
  const alerts = await prisma.alert.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(alerts)
}

export const createAlert = async (req: AuthRequest, res: Response) => {
  const { symbol, type, condition, threshold, message } = req.body
  const alert = await prisma.alert.create({
    data: { symbol: symbol.toUpperCase(), type, condition, threshold: Number(threshold), message, userId: req.user!.userId },
  })
  res.status(201).json(alert)
}

export const deleteAlert = async (req: AuthRequest, res: Response) => {
  await prisma.alert.delete({ where: { id: req.params.id } })
  res.json({ message: 'Alerte supprimée' })
}

export const toggleAlert = async (req: AuthRequest, res: Response) => {
  const alert = await prisma.alert.findFirst({ where: { id: req.params.id, userId: req.user!.userId } })
  if (!alert) return res.status(404).json({ message: 'Introuvable' })
  const updated = await prisma.alert.update({ where: { id: alert.id }, data: { active: !alert.active, triggered: false } })
  res.json(updated)
}
