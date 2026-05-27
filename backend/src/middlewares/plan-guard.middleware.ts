import { Request, Response, NextFunction } from 'express'
import prisma from '../config/prisma'
import { getLimits, withinLimit } from '../config/plan-limits'

/**
 * Vérifie qu'une ressource ne dépasse pas la limite du plan avant création.
 * À placer sur les routes POST de création (portfolio, alert, watchlist).
 *
 * Usage :
 *   router.post('/portfolios', authenticate, planGuard('portfolios'), createPortfolio)
 */
export function planGuard(resource: 'portfolios' | 'alerts' | 'watchlistItems') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId
      if (!userId) return res.status(401).json({ message: 'Non authentifié' })

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          organization: {
            select: { plan: true, trialEndsAt: true },
          },
        },
      })

      if (!user?.organization) {
        return res.status(403).json({ message: 'Organisation introuvable' })
      }

      const { plan, trialEndsAt } = user.organization
      const limits = getLimits(plan, trialEndsAt)
      const limit = limits[resource]

      if (limit === -1) return next()

      // Compter les ressources existantes
      let count = 0

      if (resource === 'portfolios') {
        count = await prisma.portfolio.count({ where: { userId } })
      } else if (resource === 'alerts') {
        count = await prisma.alert.count({ where: { userId, active: true } })
      } else if (resource === 'watchlistItems') {
        count = await prisma.watchlistItem.count({ where: { userId } })
      }

      if (!withinLimit(count, limit)) {
        return res.status(403).json({
          message: `Limite atteinte pour votre plan (${limit} ${resource} maximum)`,
          code:    'PLAN_LIMIT_REACHED',
          resource,
          limit,
          current: count,
          upgrade: true,
        })
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Bloque l'export si le plan ne l'autorise pas (exportEnabled: false).
 * Retourne 403 avec code PLAN_LIMIT_REACHED pour déclencher l'UpgradeModal côté client.
 */
export async function exportGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId
    if (!userId) return res.status(401).json({ message: 'Non authentifié' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organization: { select: { plan: true, trialEndsAt: true } } },
    })

    if (!user?.organization) {
      return res.status(403).json({ message: 'Organisation introuvable' })
    }

    const { plan, trialEndsAt } = user.organization
    if (!getLimits(plan, trialEndsAt).exportEnabled) {
      return res.status(403).json({
        message: 'L\'export est disponible à partir du plan PRO',
        code:    'PLAN_LIMIT_REACHED',
        resource: 'export',
        upgrade: true,
      })
    }

    next()
  } catch (err) {
    next(err)
  }
}

/**
 * Expose le plan effectif + les limites dans req pour usage downstream.
 * À utiliser sur les routes de lecture si nécessaire.
 */
export async function attachPlanInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.userId
    if (!userId) return next()

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        organization: { select: { plan: true, trialEndsAt: true } },
      },
    })

    if (user?.organization) {
      const { plan, trialEndsAt } = user.organization
      ;(req as any).planLimits = getLimits(plan, trialEndsAt)
      ;(req as any).trialActive = trialEndsAt ? new Date() < trialEndsAt : false
    }

    next()
  } catch (err) {
    next(err)
  }
}
