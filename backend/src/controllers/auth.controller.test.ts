import request from 'supertest'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import authRoutes from '../routes/auth.routes'
import prisma from '../config/prisma'

// ── Secrets de test ──────────────────────────────────────────
process.env.JWT_SECRET         = 'test-jwt-secret-32chars-minimum!!'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-min!!'

jest.mock('../config/prisma', () => ({
  organization: { create: jest.fn() },
  user:         { findUnique: jest.fn(), update: jest.fn() },
}))

const app = express()
app.use(express.json())
app.use('/auth', authRoutes)

// ── Fixtures ─────────────────────────────────────────────────
const mockUser = {
  id:             'user-1',
  email:          'alice@acme.com',
  password:       '',
  name:           'Alice',
  role:           'OWNER',
  organizationId: 'org-1',
  refreshToken:   null,
}

const mockOrg = { id: 'org-1', name: 'Acme', slug: 'acme', plan: 'FREE', trialEndsAt: null }

beforeAll(async () => {
  mockUser.password = await bcrypt.hash('Password123!', 10)
})

afterEach(() => jest.clearAllMocks())

// ═══════════════════════════════════════════════════════════
// POST /auth/register
// ═══════════════════════════════════════════════════════════
describe('POST /auth/register', () => {
  it('crée un utilisateur avec des données valides → 201 + tokens', async () => {
    ;(prisma.organization.create as jest.Mock).mockResolvedValue({
      ...mockOrg, users: [mockUser],
    })
    ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

    const res = await request(app).post('/auth/register').send({
      email:   'alice@acme.com',
      password: 'Password123!',
      name:    'Alice',
      orgName: 'Acme',
    })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('refreshToken')
    expect(res.body.user.email).toBe('alice@acme.com')
    expect(res.body.user).not.toHaveProperty('password')
  })

  it('rejette un email mal formé → 400', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'pas-un-email', password: 'Password123!', name: 'Alice', orgName: 'Acme',
    })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('message')
  })

  it('rejette un mot de passe < 8 caractères → 400', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'alice@acme.com', password: '123', name: 'Alice', orgName: 'Acme',
    })
    expect(res.status).toBe(400)
  })

  it('rejette un body vide → 400', async () => {
    const res = await request(app).post('/auth/register').send({})
    expect(res.status).toBe(400)
  })

  it('rejette un nom vide → 400', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'alice@acme.com', password: 'Password123!', name: '', orgName: 'Acme',
    })
    expect(res.status).toBe(400)
  })
})

// ═══════════════════════════════════════════════════════════
// POST /auth/login
// ═══════════════════════════════════════════════════════════
describe('POST /auth/login', () => {
  it('connecte un utilisateur avec des identifiants valides → 200 + tokens', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.user.update   as jest.Mock).mockResolvedValue(mockUser)

    const res = await request(app).post('/auth/login').send({
      email: 'alice@acme.com', password: 'Password123!',
    })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('refreshToken')
    expect(res.body.user.email).toBe('alice@acme.com')
  })

  it('rejette un mot de passe incorrect → 401 (timing-safe : même délai)', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const res = await request(app).post('/auth/login').send({
      email: 'alice@acme.com', password: 'mauvais_password',
    })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Identifiants invalides')
  })

  it('rejette un email inconnu → 401 (même message pour éviter user enumeration)', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(app).post('/auth/login').send({
      email: 'inconnu@acme.com', password: 'Password123!',
    })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Identifiants invalides')
  })

  it('rejette un email invalide sans interroger la BDD → 400', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'pas-un-email', password: 'Password123!',
    })

    expect(res.status).toBe(400)
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════
// POST /auth/refresh
// ═══════════════════════════════════════════════════════════
describe('POST /auth/refresh', () => {
  it('retourne un nouvel accessToken avec un refresh token valide → 200', async () => {
    const refreshToken = jwt.sign({ userId: 'user-1' }, process.env.JWT_REFRESH_SECRET!)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockUser, refreshToken })

    const res = await request(app).post('/auth/refresh').send({ refreshToken })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
  })

  it('rejette un refresh token absent → 401', async () => {
    const res = await request(app).post('/auth/refresh').send({})
    expect(res.status).toBe(401)
  })

  it('rejette un refresh token forgé (mauvaise signature) → 401', async () => {
    const res = await request(app).post('/auth/refresh').send({
      refreshToken: 'forgé.token.invalide',
    })
    expect(res.status).toBe(401)
  })

  it('rejette un refresh token valide mais révoqué (non concordant en BDD) → 401', async () => {
    const refreshToken = jwt.sign({ userId: 'user-1' }, process.env.JWT_REFRESH_SECRET!)
    // BDD contient un token différent (déjà révoqué ou remplacé)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser, refreshToken: 'autre-token-en-bdd',
    })

    const res = await request(app).post('/auth/refresh').send({ refreshToken })
    expect(res.status).toBe(401)
  })
})

// ═══════════════════════════════════════════════════════════
// POST /auth/logout
// ═══════════════════════════════════════════════════════════
describe('POST /auth/logout', () => {
  it('déconnecte avec un JWT valide dans Authorization → 200', async () => {
    const accessToken = jwt.sign(
      { userId: 'user-1', orgId: 'org-1', role: 'OWNER' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    )
    ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { refreshToken: null } })
    )
  })

  it('[SEC-001] logout sans Authorization header → 401, ne touche pas la BDD', async () => {
    const res = await request(app).post('/auth/logout').send({ userId: 'user-1' })

    expect(res.status).toBe(401)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('[SEC-001] logout avec userId forgé dans le body → 401 (userId ignoré)', async () => {
    // Avant le fix, cet appel réussissait et déconnectait n'importe quel userId
    const res = await request(app).post('/auth/logout').send({ userId: 'victim-user-id' })

    expect(res.status).toBe(401)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
