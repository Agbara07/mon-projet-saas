'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

export interface CurrentUser {
  id:           string
  name:         string
  email:        string
  role:         'OWNER' | 'ADMIN' | 'MEMBER'
  organization: {
    id:          string
    name:        string
    plan:        string
    trialEndsAt: string | null
  }
}

export function useCurrentUser() {
  const [user,    setUser]    = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users/me')
      .then(r => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const isAdmin       = user?.role === 'OWNER' || user?.role === 'ADMIN'
  const trialEndsAt   = user?.organization?.trialEndsAt ? new Date(user.organization.trialEndsAt) : null
  const trialActive   = trialEndsAt ? new Date() < trialEndsAt : false
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : 0

  return { user, loading, isAdmin, trialActive, trialDaysLeft }
}
