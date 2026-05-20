import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  user?: { userId: string; orgId: string; role: string }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Token manquant' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthRequest['user']
    req.user = payload
    next()
  } catch {
    res.status(401).json({ message: 'Token invalide' })
  }
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OWNER') {
    return res.status(403).json({ message: 'Accès refusé' })
  }
  next()
}
