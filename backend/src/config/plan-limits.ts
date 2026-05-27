import { Plan } from '@prisma/client'

export interface PlanLimits {
  portfolios: number           // -1 = illimité
  watchlistItems: number
  alerts: number
  screenerAssets: string[]     // ex: ['stocks', 'etf', 'funds']
  historyYears: number
  exportEnabled: boolean
  apiAccess: boolean
  advisorFeatures: boolean     // portefeuilles clients, rapports
  reportsPerMonth: number      // -1 = illimité
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    portfolios:      1,
    watchlistItems:  10,
    alerts:          5,
    screenerAssets:  ['stocks'],
    historyYears:    1,
    exportEnabled:   false,
    apiAccess:       false,
    advisorFeatures: false,
    reportsPerMonth: 0,
  },
  STARTER: {
    portfolios:      -1,
    watchlistItems:  -1,
    alerts:          50,
    screenerAssets:  ['stocks', 'etf'],
    historyYears:    3,
    exportEnabled:   false,
    apiAccess:       false,
    advisorFeatures: false,
    reportsPerMonth: 0,
  },
  PRO: {
    portfolios:      -1,
    watchlistItems:  -1,
    alerts:          500,
    screenerAssets:  ['stocks', 'etf'],
    historyYears:    10,
    exportEnabled:   true,
    apiAccess:       true,
    advisorFeatures: false,
    reportsPerMonth: 0,
  },
  ADVISOR: {
    portfolios:      -1,
    watchlistItems:  -1,
    alerts:          500,
    screenerAssets:  ['stocks', 'etf', 'funds'],
    historyYears:    10,
    exportEnabled:   true,
    apiAccess:       true,
    advisorFeatures: true,
    reportsPerMonth: 200,
  },
  ENTERPRISE: {
    portfolios:      -1,
    watchlistItems:  -1,
    alerts:          -1,
    screenerAssets:  ['stocks', 'etf', 'funds'],
    historyYears:    10,
    exportEnabled:   true,
    apiAccess:       true,
    advisorFeatures: true,
    reportsPerMonth: -1,
  },
}

export const TRIAL_DURATION_DAYS = 14

/** Retourne le plan effectif : trial PRO uniquement pour les utilisateurs FREE */
export function getEffectivePlan(plan: Plan, trialEndsAt: Date | null): Plan {
  if (plan === 'FREE' && trialEndsAt && new Date() < trialEndsAt) return 'PRO'
  return plan
}

export function getLimits(plan: Plan, trialEndsAt: Date | null): PlanLimits {
  return PLAN_LIMITS[getEffectivePlan(plan, trialEndsAt)]
}

export function isUnlimited(value: number): boolean {
  return value === -1
}

export function withinLimit(current: number, limit: number): boolean {
  return limit === -1 || current < limit
}
