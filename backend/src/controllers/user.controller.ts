import { Response } from 'express'
import prisma from '../config/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

export const getMe = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, role: true, organization: true },
  })
  res.json(user)
}

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name: req.body.name },
    select: { id: true, email: true, name: true },
  })
  res.json(user)
}
