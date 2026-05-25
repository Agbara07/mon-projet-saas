import { Response } from 'express'
import { z } from 'zod'
import prisma from '../config/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

const profileSchema = z.object({
  name: z.string().min(1).max(100),
})

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, role: true, organization: true },
  })
  res.json(user)
}

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const parsed = profileSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message })
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name: parsed.data.name },
    select: { id: true, email: true, name: true },
  })
  res.json(user)
}
