import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma'

const signAccess = (userId: string, orgId: string, role: string) =>
  jwt.sign({ userId, orgId, role }, process.env.JWT_SECRET!, { expiresIn: '15m' } as jwt.SignOptions)

const signRefresh = (userId: string) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' } as jwt.SignOptions)

export const register = async (req: Request, res: Response) => {
  const { email, password, name, orgName } = req.body
  const hashed = await bcrypt.hash(password, 10)
  const slug = orgName.toLowerCase().replace(/\s+/g, '-')

  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug,
      users: {
        create: { email, password: hashed, name, role: 'OWNER' },
      },
    },
    include: { users: true },
  })

  const user = org.users[0]
  const accessToken = signAccess(user.id, org.id, user.role)
  const refreshToken = signRefresh(user.id)

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

  res.status(201).json({ accessToken, refreshToken, user: { id: user.id, email, name, role: user.role } })
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Identifiants invalides' })
  }

  const accessToken = signAccess(user.id, user.organizationId, user.role)
  const refreshToken = signRefresh(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } })

  res.json({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
}

export const refreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body
  if (!refreshToken) return res.status(401).json({ message: 'Token manquant' })

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Token invalide' })
    }

    const accessToken = signAccess(user.id, user.organizationId, user.role)
    res.json({ accessToken })
  } catch {
    res.status(401).json({ message: 'Token expiré' })
  }
}

export const logout = async (req: Request, res: Response) => {
  const { userId } = req.body
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } })
  res.json({ message: 'Déconnecté' })
}
