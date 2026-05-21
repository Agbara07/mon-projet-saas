import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from './page'
import api from '@/lib/api'

jest.mock('@/lib/api', () => ({ post: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

describe('LoginPage', () => {
  it('affiche le formulaire de connexion', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: /content de vous revoir/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
  })

  it('affiche les erreurs de validation', async () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))
    await waitFor(() => {
      expect(screen.getByText('Email invalide')).toBeInTheDocument()
    })
  })

  it("appelle l'API avec les bonnes données", async () => {
    ;(api.post as jest.Mock).mockResolvedValue({
      data: { accessToken: 'token', refreshToken: 'refresh', user: {} },
    })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@test.com',
        password: 'password123',
      })
    })
  })
})
