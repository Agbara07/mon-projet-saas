import { Response } from 'express'
import prisma from '../config/prisma'
import { AuthRequest } from '../middlewares/auth.middleware'

export const listUsers = async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true, organization: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
}

export const listOrganizations = async (_req: AuthRequest, res: Response) => {
  const orgs = await prisma.organization.findMany({
    include: { _count: { select: { users: true } }, subscriptions: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(orgs)
}
