import { render, screen, act, fireEvent } from '@testing-library/react'
import StockPage from './page'
import api from '@/lib/api'

/* ── Mocks ──────────────────────────────────────────────────────── */
jest.mock('@/lib/api', () => ({
  get:    jest.fn(),
  post:   jest.fn(),
  delete: jest.fn(),
}))

// Next.js params
jest.mock('next/navigation', () => ({
  useParams:   () => ({ symbol: 'AAPL' }),
  usePathname: () => '/stock/AAPL',
  useRouter:   () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}))

// lightweight-charts needs ResizeObserver + canvas
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn(),
}))

// TradingChart uses canvas — mock it
jest.mock('@/components/charts/TradingChart', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown[] }) => (
    <div data-testid="trading-chart" data-points={data.length} />
  ),
}))

jest.mock('@/components/charts/TechnicalIndicators', () => ({
  __esModule: true,
  default: () => <div data-testid="technical-indicators" />,
}))

/* ── Fixtures ───────────────────────────────────────────────────── */
const mockQuote = {
  symbol: 'AAPL', name: 'Apple Inc.', price: 213.50,
  change: 2.34, changePercent: 1.11, volume: 52_300_000,
  marketCap: 3_280_000_000_000, pe: 32.1,
  week52High: 237.23, week52Low: 164.08,
  currency: 'USD',
}

const mockProfile = {
  ...mockQuote,
  sector: 'Technology', industry: 'Consumer Electronics',
  description: 'Apple Inc. designs consumer electronics.',
  website: 'https://apple.com', employees: 164_000, country: 'US',
  beta: 1.24, dividendYield: 0.53, eps: 6.57,
}

const mockHistorical = Array.from({ length: 30 }, (_, i) => ({
  date: `2024-${String(Math.floor(i/30*12)+1).padStart(2,'0')}-${String((i%28)+1).padStart(2,'0')}`,
  open: 200 + i, high: 205 + i, low: 198 + i, close: 213 + i * 0.1, volume: 1_000_000,
}))

const mockDCF = { symbol: 'AAPL', date: '2024-12-31', dcf: 245.00, stockPrice: 213.50, upside: 14.75 }

/* ── Helpers ────────────────────────────────────────────────────── */
function setupMocks() {
  (api.get as jest.Mock)
    .mockResolvedValueOnce({ data: mockQuote })      // /market/AAPL/quote
    .mockResolvedValueOnce({ data: mockProfile })    // /market/AAPL/profile
    .mockResolvedValueOnce({ data: mockHistorical }) // /market/AAPL/historical
    .mockResolvedValueOnce({ data: mockDCF })        // /market/AAPL/dcf (OverviewTab)
}

/* ── Tests ──────────────────────────────────────────────────────── */
describe('StockPage (/stock/[symbol])', () => {

  beforeEach(() => { jest.clearAllMocks() })

  it('affiche le spinner pendant le chargement', () => {
    // api.get never resolves → stays in loading state
    (api.get as jest.Mock).mockReturnValue(new Promise(() => {}))
    const { container } = render(<StockPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it("affiche le prix et le symbole après chargement", async () => {
    setupMocks()
    render(<StockPage />)
    await act(async () => {})
    // AAPL apparaît plusieurs fois (status bar + header) — au moins 1 occurrence
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0)
    // $213.50 peut apparaître dans le header et dans le DCF
    expect(screen.getAllByText('$213.50').length).toBeGreaterThan(0)
  })

  it("affiche le badge de variation en hausse", async () => {
    setupMocks()
    render(<StockPage />)
    await act(async () => {})
    // PctBadge renders "+1.11%"
    expect(screen.getByText(/\+1\.11%/)).toBeInTheDocument()
  })

  it("affiche les 4 onglets de navigation", async () => {
    setupMocks()
    render(<StockPage />)
    await act(async () => {})
    expect(screen.getByText("Vue d'ensemble")).toBeInTheDocument()
    expect(screen.getByText('Fondamentaux')).toBeInTheDocument()
    expect(screen.getByText('Technique')).toBeInTheDocument()
    expect(screen.getByText('Actualités')).toBeInTheDocument()
  })

  it("affiche le chart avec les données historiques", async () => {
    setupMocks()
    render(<StockPage />)
    await act(async () => {})
    const chart = screen.getByTestId('trading-chart')
    expect(chart).toBeInTheDocument()
    expect(chart.getAttribute('data-points')).toBe('30')
  })

  it("affiche un état d'erreur si quote introuvable", async () => {
    (api.get as jest.Mock)
      .mockResolvedValueOnce({ data: null })  // quote → null
      .mockResolvedValueOnce({ data: null })  // profile
      .mockResolvedValueOnce({ data: [] })    // historical
    render(<StockPage />)
    await act(async () => {})
    expect(screen.getByText(/introuvable/i)).toBeInTheDocument()
  })

  it("affiche les indicateurs dans l'onglet Technique", async () => {
    setupMocks()
    render(<StockPage />)
    await act(async () => {})

    // Cliquer sur l'onglet Technique et attendre le rendu
    fireEvent.click(screen.getByText('Technique'))
    await act(async () => {})
    // TechnicalIndicators mock doit être présent
    expect(screen.getByTestId('technical-indicators')).toBeInTheDocument()
  })

  /* ── Régression : double fetch sur navigation symbole ── */
  it('ne double-fetch pas l\'historique quand le symbole change', async () => {
    setupMocks()
    render(<StockPage />)
    await act(async () => {})

    // 4 appels : quote + profile + historical + dcf (OverviewTab)
    // PAS de 5ème appel historique (le period effect doit être skippé au chargement)
    expect(api.get).toHaveBeenCalledTimes(4)
    expect(api.get).toHaveBeenCalledWith('/market/AAPL/quote')
    expect(api.get).toHaveBeenCalledWith('/market/AAPL/profile')
    expect(api.get).toHaveBeenCalledWith('/market/AAPL/historical?period=1mo')
    expect(api.get).toHaveBeenCalledWith('/market/AAPL/dcf')
  })

  it('refetch l\'historique quand la période change', async () => {
    // Mocks initiaux stricts + catch-all pour les requêtes de période
    ;(api.get as jest.Mock)
      .mockResolvedValueOnce({ data: mockQuote })
      .mockResolvedValueOnce({ data: mockProfile })
      .mockResolvedValueOnce({ data: mockHistorical })
      .mockResolvedValueOnce({ data: mockDCF })
      .mockResolvedValue({ data: mockHistorical })  // catch-all pour changements de période

    render(<StockPage />)
    await act(async () => {})

    const initialCalls = (api.get as jest.Mock).mock.calls.length

    // Cliquer sur le bouton 3M
    fireEvent.click(screen.getByText('3M'))
    await act(async () => {})

    // Un seul appel supplémentaire pour historical?period=3mo
    const newCalls = (api.get as jest.Mock).mock.calls.length
    expect(newCalls).toBe(initialCalls + 1)
    expect(api.get).toHaveBeenLastCalledWith('/market/AAPL/historical?period=3mo')
  })
})
