import { render, screen, waitFor, act } from '@testing-library/react'
import CalendarPage from './page'
import api from '@/lib/api'

jest.mock('@/lib/api', () => ({ get: jest.fn() }))
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }))

const mockEvents = [
  { symbol: 'AAPL', company: 'Apple Inc.', date: '2026-06-01', epsEstimate: 2.18, epsActual: 2.36, surprisePct: 8.3 },
  { symbol: 'MSFT', company: 'Microsoft', date: '2026-06-15', epsEstimate: 3.10, epsActual: null },
]

describe('CalendarPage', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => { jest.clearAllMocks(); jest.useRealTimers() })

  it('affiche le spinner pendant le chargement', () => {
    ;(api.get as jest.Mock).mockReturnValue(new Promise(() => {}))
    const { container } = render(<CalendarPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('affiche les événements de résultats', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: mockEvents })
    render(<CalendarPage />)
    await act(async () => {})
    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument()
      expect(screen.getByText('MSFT')).toBeInTheDocument()
    })
  })

  it('affiche l\'état vide si aucun événement', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: [] })
    render(<CalendarPage />)
    await act(async () => {})
    await waitFor(() =>
      expect(screen.getByText(/aucun résultat|calendrier vide|Aucun/i)).toBeInTheDocument()
    )
  })

  it('appelle le bon endpoint API', async () => {
    ;(api.get as jest.Mock).mockResolvedValue({ data: [] })
    render(<CalendarPage />)
    await act(async () => {})
    expect(api.get).toHaveBeenCalledWith('/market/earnings')
  })
})
