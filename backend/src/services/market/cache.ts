interface CacheEntry<T> { data: T; ts: number; ttl: number }

class MarketCache {
  private store = new Map<string, CacheEntry<any>>()

  set<T>(key: string, data: T, ttlMs: number) {
    this.store.set(key, { data, ts: Date.now(), ttl: ttlMs })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() - entry.ts > entry.ttl) { this.store.delete(key); return null }
    return entry.data as T
  }

  del(key: string)  { this.store.delete(key) }
  has(key: string)  { return !!this.get(key) }
  size()            { return this.store.size }

  // Nettoyage périodique des entrées expirées
  purge() {
    const now = Date.now()
    for (const [k, v] of this.store) {
      if (now - v.ts > v.ttl) this.store.delete(k)
    }
  }
}

export const cache = new MarketCache()

// Nettoyage toutes les 10 minutes
setInterval(() => cache.purge(), 10 * 60_000)

// TTL par type de donnée (en ms)
export const TTL = {
  QUOTE:       30_000,       // 30s  — quotes
  OVERVIEW:    60_000,       // 1min — indices
  HISTORICAL:  5 * 60_000,   // 5min — historique
  PROFILE:    15 * 60_000,   // 15min — profil entreprise
  NEWS:        5 * 60_000,   // 5min  — actualités
  EARNINGS:   30 * 60_000,   // 30min — calendrier résultats
  SEARCH:     10 * 60_000,   // 10min — recherche
  TECHNICAL:   5 * 60_000,   // 5min  — indicateurs
}
