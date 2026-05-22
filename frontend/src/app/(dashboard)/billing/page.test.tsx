import { render, screen, waitFor, act } from '@testing-library/react'
import BillingPage from './page'
import api from '@/lib/api'

jest.mock('@/lib/api', () => ({ get: jest.fn(), post: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const mockBillingInfo = {
  plan: 'FREE', effectivePlan: 'PRO',
  trialActive: true, trialDaysLeft: 11, trialEndsAt: '2026-06-05T00:00:00.000Z',
  subscription: null,
  stripePriceIds: { STARTER: null, PRO: null, ADVISOR: null },
}

describe('BillingPage', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => { jest.clearAllMocks(); jest.useRealTimers() })

  it('affiche les 4 noms de plans', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockBillingInfo })
    render(<BillingPage />)
    await act(async () => {})
    await waitFor(() => {
      expect(screen.getAllByText('Gratuit').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Starter')).toBeInTheDocument()
      expect(screen.getByText('Pro')).toBeInTheDocument()
      expect(screen.getByText('Advisor')).toBeInTheDocument()
    })
  })

  it('affiche les tarifs des 3 plans payants', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockBillingInfo })
    render(<BillingPage />)
    await act(async () => {})
    // Les prix sont rendus comme chiffre brut + /mois dans un span séparé
    await waitFor(() => {
      const text = document.body.textContent ?? ''
      expect(text).toContain('9')   // Starter $9
      expect(text).toContain('29')  // Pro $29
      expect(text).toContain('79')  // Advisor $79
    })
  })

  it('affiche le banner trial quand trial actif', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockBillingInfo })
    render(<BillingPage />)
    await act(async () => {})
    await waitFor(() => expect(screen.getByText(/Trial Pro/i)).toBeInTheDocument())
  })

  it('appelle GET /billing/info au chargement', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockBillingInfo })
    render(<BillingPage />)
    await act(async () => {})
    expect(api.get).toHaveBeenCalledWith('/billing/info')
  })
})
