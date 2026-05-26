import { cache } from './cache'

// ── Contrôle du temps ─────────────────────────────────────────
let fakeNow = 1_700_000_000_000
const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNow)

beforeEach(() => {
  fakeNow = 1_700_000_000_000
  ;(cache as any)['store'].clear()
})

afterAll(() => dateSpy.mockRestore())

// ═══════════════════════════════════════════════════════════════
// set / get
// ═══════════════════════════════════════════════════════════════
describe('cache.set / cache.get', () => {
  it('retourne la donnée avant expiration du TTL', () => {
    cache.set('key', 'value', 5_000)
    fakeNow += 4_000
    expect(cache.get('key')).toBe('value')
  })

  it('retourne null après expiration du TTL', () => {
    cache.set('key', 'value', 5_000)
    fakeNow += 5_001
    expect(cache.get('key')).toBeNull()
  })

  it('retourne null pour une clé inexistante', () => {
    expect(cache.get<string>('ghost')).toBeNull()
  })

  it('supporte les types complexes (objet, tableau)', () => {
    cache.set('obj', { a: 1, b: [2, 3] }, 10_000)
    expect(cache.get('obj')).toEqual({ a: 1, b: [2, 3] })
  })

  it('écrase une valeur existante', () => {
    cache.set('k', 'v1', 10_000)
    cache.set('k', 'v2', 10_000)
    expect(cache.get('k')).toBe('v2')
  })
})

// ═══════════════════════════════════════════════════════════════
// has
// ═══════════════════════════════════════════════════════════════
describe('cache.has', () => {
  it('retourne true pour une entrée valide', () => {
    cache.set('alive', 42, 5_000)
    expect(cache.has('alive')).toBe(true)
  })

  it('retourne false pour une entrée expirée', () => {
    cache.set('expired', 42, 5_000)
    fakeNow += 5_001
    expect(cache.has('expired')).toBe(false)
  })

  it('retourne false pour une clé absente', () => {
    expect(cache.has('absent')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// del
// ═══════════════════════════════════════════════════════════════
describe('cache.del', () => {
  it('supprime immédiatement une entrée valide', () => {
    cache.set('todelete', 'x', 10_000)
    cache.del('todelete')
    expect(cache.get('todelete')).toBeNull()
  })

  it('ne lève pas d\'erreur sur une clé inexistante', () => {
    expect(() => cache.del('nope')).not.toThrow()
  })
})

// ═══════════════════════════════════════════════════════════════
// size
// ═══════════════════════════════════════════════════════════════
describe('cache.size', () => {
  it('retourne 0 sur un store vide', () => {
    expect(cache.size()).toBe(0)
  })

  it('compte les entrées insérées', () => {
    cache.set('a', 1, 10_000)
    cache.set('b', 2, 10_000)
    expect(cache.size()).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// purge
// ═══════════════════════════════════════════════════════════════
describe('cache.purge', () => {
  it('supprime les entrées expirées sans toucher les valides', () => {
    cache.set('valid',   'keep',   10_000)
    cache.set('expired', 'remove',  1_000)
    fakeNow += 2_000
    cache.purge()
    expect(cache.get('valid')).toBe('keep')
    expect(cache.get('expired')).toBeNull()
    expect(cache.size()).toBe(1)
  })

  it('ne plante pas sur un store vide', () => {
    expect(() => cache.purge()).not.toThrow()
  })
})
