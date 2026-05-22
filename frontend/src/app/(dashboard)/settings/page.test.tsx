import { render, screen, waitFor, act } from '@testing-library/react'
import SettingsPage from './page'
import api from '@/lib/api'

jest.mock('@/lib/api', () => ({ get: jest.fn(), patch: jest.fn() }))
jest.mock('@/lib/theme', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: jest.fn(), toggle: jest.fn() }),
}))

const mockUser = {
  name: 'Marie Dupont', email: 'marie@acme.com', role: 'OWNER',
  organization: { name: 'Acme Capital', plan: 'PRO' },
}

describe('SettingsPage', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => { jest.clearAllMocks(); jest.useRealTimers() })

  it('affiche les 4 onglets de paramètres', () => {
    ;(api.get as jest.Mock).mockReturnValue(new Promise(() => {}))
    render(<SettingsPage />)
    expect(screen.getByText('Profil')).toBeInTheDocument()
    expect(screen.getByText('Sécurité')).toBeInTheDocument()
    expect(screen.getByText('Apparence')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
  })

  it('affiche les données utilisateur chargées', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockUser })
    render(<SettingsPage />)
    await act(async () => {})
    await waitFor(() => expect(screen.getByDisplayValue('Marie Dupont')).toBeInTheDocument())
  })

  it('affiche le plan et l\'organisation (multiples occurrences)', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockUser })
    render(<SettingsPage />)
    await act(async () => {})
    // "Acme Capital" apparaît dans la status bar ET dans le profil
    await waitFor(() =>
      expect(screen.getAllByText(/Acme Capital/i).length).toBeGreaterThanOrEqual(1)
    )
    expect(screen.getAllByText(/PRO/i).length).toBeGreaterThanOrEqual(1)
  })
})
