import { Response } from 'express'
import prisma from '../config/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

export const getNotes = async (req: AuthRequest, res: Response) => {
  const notes = await prisma.stockNote.findMany({
    where: { userId: req.user!.userId, symbol: req.params.symbol.toUpperCase() },
    orderBy: { updatedAt: 'desc' },
  })
  res.json(notes)
}

export const upsertNote = async (req: AuthRequest, res: Response) => {
  const { content } = req.body
  const symbol = req.params.symbol.toUpperCase()

  const existing = await prisma.stockNote.findFirst({
    where: { userId: req.user!.userId, symbol },
  })

  const note = existing
    ? await prisma.stockNote.update({ where: { id: existing.id }, data: { content } })
    : await prisma.stockNote.create({ data: { symbol, content, userId: req.user!.userId } })

  res.json(note)
}

export const deleteNote = async (req: AuthRequest, res: Response) => {
  await prisma.stockNote.delete({ where: { id: req.params.id } })
  res.json({ message: 'Note supprimée' })
}
