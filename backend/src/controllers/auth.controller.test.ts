import request from 'supertest'
import express from 'express'
import authRoutes from '../routes/auth.routes'
import prisma from '../config/prisma'
import bcrypt from 'bcryptjs'

jest.mock('../config/prisma', () => ({
  organization: { create: jest.fn(), findUnique: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
}))

const app = express()
app.use(express.json())
app.use('/auth', authRoutes)

const mockOrg = { id: 'org1', name: 'Acme', slug: 'acme', plan: 'FREE' }
const mockUser = {
  id: 'user1',
  email: 'test@test.com',
  password: '',
  name: 'Test User',
  role: 'OWNER',
  organizationId: 'org1',
  refreshToken: null,
}

beforeAll(async () => {
  mockUser.password = await bcrypt.hash('password123', 10)
})

afterEach(() => jest.clearAllMocks())

describe('POST /auth/register', () => {
  it('crée un utilisateur et retourne des tokens', async () => {
    ;(prisma.organization.create as jest.Mock).mockResolvedValue({
      ...mockOrg,
      users: [mockUser],
    })
    ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

    const res = await request(app).post('/auth/register').send({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User',
      orgName: 'Acme',
    })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('refreshToken')
    expect(res.body.user.email).toBe('test@test.com')
  })
})

describe('POST /auth/login', () => {
  it('connecte un utilisateur valide', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.user.update as jest.Mock).mockResolvedValue(mockUser)

    const res = await request(app).post('/auth/login').send({
      email: 'test@test.com',
      password: 'password123',
    })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
  })

  it('rejette un mot de passe incorrect', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const res = await request(app).post('/auth/login').send({
      email: 'test@test.com',
      password: 'mauvais_mdp',
    })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Identifiants invalides')
  })

  it('rejette un utilisateur inexistant', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const res = await request(app).post('/auth/login').send({
      email: 'inconnu@test.com',
      password: 'password123',
    })

    expect(res.status).toBe(401)
  })
})
