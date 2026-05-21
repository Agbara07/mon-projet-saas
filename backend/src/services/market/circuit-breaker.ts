import { ProviderStatus } from './types'

const FAILURE_THRESHOLD  = 5     // erreurs consécutives avant désactivation
const RECOVERY_TIMEOUT   = 2 * 60_000  // 2 min avant de réessayer
const RATE_LIMIT_TIMEOUT = 60_000      // 1 min si rate limited

class CircuitBreaker {
  private state = new Map<string, {
    errors:       number
    lastError:    Date | null
    lastSuccess:  Date | null
    open:         boolean
    rateLimited:  boolean
    rateLimitedAt:Date | null
  }>()

  private init(name: string) {
    if (!this.state.has(name)) {
      this.state.set(name, {
        errors: 0, lastError: null, lastSuccess: null,
        open: false, rateLimited: false, rateLimitedAt: null,
      })
    }
    return this.state.get(name)!
  }

  isAvailable(name: string): boolean {
    const s = this.init(name)

    // Rate limited temporairement ?
    if (s.rateLimited && s.rateLimitedAt) {
      if (Date.now() - s.rateLimitedAt.getTime() > RATE_LIMIT_TIMEOUT) {
        s.rateLimited = false; s.rateLimitedAt = null
      } else return false
    }

    // Circuit ouvert (trop d'erreurs) ?
    if (s.open && s.lastError) {
      if (Date.now() - s.lastError.getTime() > RECOVERY_TIMEOUT) {
        s.open = false; s.errors = 0  // demi-ouverture
        console.log(`[circuit] ${name} → half-open, retry`)
      } else return false
    }

    return true
  }

  onSuccess(name: string) {
    const s = this.init(name)
    s.errors = 0; s.open = false; s.rateLimited = false
    s.lastSuccess = new Date()
  }

  onError(name: string, err: any) {
    const s = this.init(name)
    s.errors++
    s.lastError = new Date()

    if (err?.message?.includes('429') || err?.message?.toLowerCase().includes('rate limit')) {
      s.rateLimited = true
      s.rateLimitedAt = new Date()
      console.warn(`[circuit] ${name} → rate limited (1 min pause)`)
      return
    }

    if (s.errors >= FAILURE_THRESHOLD) {
      s.open = true
      console.warn(`[circuit] ${name} → OPEN after ${s.errors} failures`)
    }
  }

  getStatus(): ProviderStatus[] {
    return [...this.state.entries()].map(([name, s]) => ({
      name,
      healthy:     !s.open && !s.rateLimited,
      lastError:   s.lastError?.toISOString(),
      errorCount:  s.errors,
      lastSuccess: s.lastSuccess,
      rateLimited: s.rateLimited,
    }))
  }
}

export const circuitBreaker = new CircuitBreaker()
