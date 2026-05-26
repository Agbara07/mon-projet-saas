import { circuitBreaker } from './circuit-breaker'

// ── Contrôle du temps (Date.now + new Date doivent être synchrones) ──
const BASE_TIME = new Date('2025-01-01T00:00:00.000Z')

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(BASE_TIME)
})

afterAll(() => jest.useRealTimers())

beforeEach(() => {
  ;(circuitBreaker as any)['state'].clear()
  jest.setSystemTime(BASE_TIME)
})

// ═══════════════════════════════════════════════════════════════
// isAvailable — comportement de base
// ═══════════════════════════════════════════════════════════════
describe('isAvailable — comportement de base', () => {
  it('retourne true pour un provider inconnu (init lazy)', () => {
    expect(circuitBreaker.isAvailable('nouveau-provider')).toBe(true)
  })

  it('reste disponible après 4 erreurs consécutives (seuil = 5)', () => {
    for (let i = 0; i < 4; i++) circuitBreaker.onError('p1', new Error('fail'))
    expect(circuitBreaker.isAvailable('p1')).toBe(true)
  })

  it('s\'ouvre à la 5ème erreur → isAvailable false', () => {
    for (let i = 0; i < 5; i++) circuitBreaker.onError('p1', new Error('fail'))
    expect(circuitBreaker.isAvailable('p1')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// onSuccess
// ═══════════════════════════════════════════════════════════════
describe('onSuccess', () => {
  it('réinitialise le compteur et ferme le circuit ouvert', () => {
    for (let i = 0; i < 5; i++) circuitBreaker.onError('p1', new Error('fail'))
    expect(circuitBreaker.isAvailable('p1')).toBe(false)
    circuitBreaker.onSuccess('p1')
    expect(circuitBreaker.isAvailable('p1')).toBe(true)
  })

  it('ne plante pas pour un provider jamais vu', () => {
    expect(() => circuitBreaker.onSuccess('brand-new')).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════
// Rate limiting (détection "429" ou "rate limit")
// ═══════════════════════════════════════════════════════════════
describe('rate limiting', () => {
  it('détecte le message "429" → marque rate-limited', () => {
    circuitBreaker.onError('p1', new Error('HTTP 429 Too Many Requests'))
    expect(circuitBreaker.isAvailable('p1')).toBe(false)
  })

  it('détecte "rate limit" (insensible à la casse)', () => {
    circuitBreaker.onError('p1', new Error('RATE LIMIT exceeded'))
    expect(circuitBreaker.isAvailable('p1')).toBe(false)
  })

  it('n\'ouvre pas le circuit sur rate limit (compteur d\'erreurs non incrémenté jusqu\'au seuil)', () => {
    circuitBreaker.onError('p1', new Error('429'))
    // Rate limited mais pas circuit-ouvert — un seul onError suffit à rate-limiter,
    // mais le compteur d'erreurs ne doit pas déclencher l'ouverture classique
    const status = circuitBreaker.getStatus().find(s => s.name === 'p1')!
    expect(status.rateLimited).toBe(true)
  })

  it('se rétablit après 1 min (RATE_LIMIT_TIMEOUT)', () => {
    circuitBreaker.onError('p1', new Error('429'))
    jest.advanceTimersByTime(60_001)
    expect(circuitBreaker.isAvailable('p1')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// Récupération automatique après RECOVERY_TIMEOUT (2 min)
// ═══════════════════════════════════════════════════════════════
describe('récupération automatique', () => {
  it('reste fermé avant la fin des 2 min', () => {
    for (let i = 0; i < 5; i++) circuitBreaker.onError('p1', new Error('fail'))
    jest.advanceTimersByTime(60_000) // 1 min seulement
    expect(circuitBreaker.isAvailable('p1')).toBe(false)
  })

  it('passe en demi-ouverture après 2 min + 1ms', () => {
    for (let i = 0; i < 5; i++) circuitBreaker.onError('p1', new Error('fail'))
    jest.advanceTimersByTime(2 * 60_000 + 1)
    expect(circuitBreaker.isAvailable('p1')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// getStatus
// ═══════════════════════════════════════════════════════════════
describe('getStatus', () => {
  it('retourne le shape attendu pour un provider sain', () => {
    circuitBreaker.onSuccess('p1')
    const s = circuitBreaker.getStatus().find(s => s.name === 'p1')!
    expect(s).toMatchObject({
      name:        'p1',
      healthy:     true,
      errorCount:  0,
      rateLimited: false,
    })
  })

  it('reflète un circuit ouvert dans healthy:false et errorCount', () => {
    for (let i = 0; i < 5; i++) circuitBreaker.onError('p2', new Error('fail'))
    const s = circuitBreaker.getStatus().find(s => s.name === 'p2')!
    expect(s.healthy).toBe(false)
    expect(s.errorCount).toBe(5)
  })

  it('retourne un tableau vide quand aucun provider n\'a été vu', () => {
    expect(circuitBreaker.getStatus()).toEqual([])
  })
})
