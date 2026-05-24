/**
 * BRVM Data Refresh Cron
 * Sources (par ordre de priorité) :
 *   1. SikaFinance  — agrégateur africain, IPs cloud généralement non bloquées
 *   2. brvm.org     — source officielle, peut bloquer Railway
 *   3. Statique     — liste complète sans prix (fallback de dernier recours)
 *
 * Schedule :
 *   - Pendant séance BRVM (lun-ven 09h00-15h30 UTC/GMT) : toutes les 15 min
 *   - Hors séance                                        : toutes les heures
 *   - Déclenchement manuel via POST /market/brvm/refresh (GitHub Actions)
 */
import cron     from 'node-cron'
import prisma   from '../config/prisma'
import { BRVM_COMPANIES } from './market/providers/brvm.provider'

const CACHE_KEY = 'quotes'
const TIMEOUT   = 12_000

/* ── Helpers ────────────────────────────────────────────── */
function isMarketOpen(): boolean {
  const now  = new Date()
  const day  = now.getUTCDay()          // 0=dim, 6=sam
  if (day === 0 || day === 6) return false
  const min  = now.getUTCHours() * 60 + now.getUTCMinutes()
  return min >= 9 * 60 && min <= 15 * 60 + 30  // 09:00–15:30 UTC (Abidjan/GMT)
}

function nextMarketOpen(): string {
  const now = new Date()
  const day = now.getUTCDay()
  if (day === 0) return 'Lundi 09:00 UTC'
  if (day === 6) return 'Lundi 09:00 UTC'
  const min = now.getUTCHours() * 60 + now.getUTCMinutes()
  if (min < 9 * 60) return 'Aujourd\'hui 09:00 UTC'
  if (min > 15 * 60 + 30) {
    const days = ['', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Lundi']
    return `${days[day] ?? 'Prochain jour ouvré'} 09:00 UTC`
  }
  return 'Marché ouvert maintenant'
}

/* ── Parsers HTML ───────────────────────────────────────── */
function htmlText(cell: string): string {
  return cell.replace(/<[^>]+>/g, '').trim()
}
function parseNum(s: string): number {
  return parseFloat(s.replace(/[\s ]/g, '').replace(',', '.')) || 0
}
function parseVol(s: string): number {
  return parseInt(s.replace(/[\s ,]/g, '')) || 0
}

function parseTableRows(html: string): { cells: string[] }[] {
  const rows: { cells: string[] }[] = []
  const parts = html.split(/<tr[\s>]/i)
  for (const row of parts) {
    if (!row.includes('<td')) continue
    const cells: string[] = []
    const rx = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let m: RegExpExecArray | null
    while ((m = rx.exec(row)) !== null) cells.push(htmlText(m[1]))
    if (cells.length >= 4) rows.push({ cells })
  }
  return rows
}

/** Parse le tableau brvm.org/sikafinance — colonnes : [ticker/nom, cours, variation, volume, ...] */
function rowsToQuotes(rows: { cells: string[] }[]): any[] {
  const results: any[] = []
  for (const { cells } of rows) {
    // Trouver le ticker BRVM dans l'une des premières cellules
    let symbol = ''
    for (let i = 0; i < Math.min(3, cells.length); i++) {
      const m = /\b([A-Z]{2,8})\b/.exec(cells[i])
      if (m && BRVM_COMPANIES[m[1]]) { symbol = m[1]; break }
    }
    if (!symbol) continue

    const price = parseNum(cells[1])
    if (price <= 0) continue

    const changePct  = parseNum(cells[2].replace('%', ''))
    const volume     = parseVol(cells[3])
    const marketCap  = cells.length >= 5 ? parseNum(cells[4]) || undefined : undefined
    const info       = BRVM_COMPANIES[symbol]

    results.push({
      symbol,
      name:          info.name,
      price,
      change:        Math.round(price * changePct / 100),
      changePercent: changePct,
      volume,
      marketCap,
      sector:        info.sector,
      country:       info.country,
      currency:      'XOF',
    })
  }
  return results
}

/* ── Sources ────────────────────────────────────────────── */
async function fetchFromSikaFinance(): Promise<any[]> {
  const r = await fetch('https://www.sikafinance.com/marches/cotations', {
    headers: {
      'Accept':          'text/html,application/xhtml+xml',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      'Referer':         'https://www.sikafinance.com/',
    },
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!r.ok) throw new Error(`SikaFinance HTTP ${r.status}`)
  const html = await r.text()
  const rows = parseTableRows(html)
  return rowsToQuotes(rows)
}

async function fetchFromBRVMOrg(): Promise<any[]> {
  const r = await fetch('https://www.brvm.org/fr/cours-des-actions/0/tableau', {
    headers: {
      'Accept':          'text/html',
      'Accept-Language': 'fr-FR,fr;q=0.9',
      'User-Agent':      'Mozilla/5.0 (compatible; InvestSaaS/2.0)',
    },
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!r.ok) throw new Error(`brvm.org HTTP ${r.status}`)
  const html = await r.text()
  const rows = parseTableRows(html)
  return rowsToQuotes(rows)
}

/* ── Refresh principal ──────────────────────────────────── */
export interface RefreshResult {
  success:   boolean
  source:    string
  count:     number
  durationMs: number
  error?:    string
  marketOpen: boolean
}

async function saveDailySnapshots(quotes: any[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const ops = quotes
    .filter(q => q.symbol && typeof q.price === 'number' && q.price > 0)
    .map(q => prisma.bRVMPriceHistory.upsert({
      where:  { symbol_date: { symbol: q.symbol, date: today } },
      update: { close: q.price, volume: q.volume ?? 0 },
      create: { symbol: q.symbol, date: today, close: q.price, volume: q.volume ?? 0 },
    }))
  if (ops.length > 0) await Promise.allSettled(ops)
}

export async function refreshBRVMData(): Promise<RefreshResult> {
  const t0 = Date.now()
  const sources = [
    { name: 'sikafinance', fn: fetchFromSikaFinance },
    { name: 'brvm.org',    fn: fetchFromBRVMOrg    },
  ]

  for (const { name, fn } of sources) {
    try {
      const data = await fn()
      if (data.length >= 10) {
        await prisma.bRVMCache.upsert({
          where:  { id: CACHE_KEY },
          update: { data: data as any, source: name, itemCount: data.length },
          create: { id: CACHE_KEY, data: data as any, source: name, itemCount: data.length },
        })
        await saveDailySnapshots(data)
        const ms = Date.now() - t0
        console.log(`[BRVM cron] ✅ ${data.length} quotes — source: ${name} — ${ms}ms`)
        return { success: true, source: name, count: data.length, durationMs: ms, marketOpen: isMarketOpen() }
      }
      console.warn(`[BRVM cron] ⚠️ ${name}: seulement ${data.length} items (<10), ignoré`)
    } catch (e: any) {
      console.warn(`[BRVM cron] ⚠️ ${name} échoué: ${e.message}`)
    }
  }

  const ms = Date.now() - t0
  console.warn('[BRVM cron] ❌ Toutes les sources ont échoué — données statiques maintenues')
  return { success: false, source: 'none', count: 0, durationMs: ms, error: 'All sources failed', marketOpen: isMarketOpen() }
}

/* ── Lecture du cache DB ────────────────────────────────── */
export async function getCachedQuotes(): Promise<any[] | null> {
  try {
    const row = await prisma.bRVMCache.findUnique({ where: { id: CACHE_KEY } })
    if (!row || !Array.isArray(row.data) || (row.data as any[]).length === 0) return null
    return row.data as any[]
  } catch { return null }
}

/* ── Statut du cache ────────────────────────────────────── */
export async function getCacheStatus() {
  const row = await prisma.bRVMCache.findUnique({ where: { id: CACHE_KEY } }).catch(() => null)
  const ageMs  = row ? Date.now() - new Date(row.updatedAt).getTime() : null
  const ageMin = ageMs !== null ? Math.round(ageMs / 60_000) : null

  return {
    hasCachedData:  !!row,
    source:         row?.source       ?? 'aucun',
    itemCount:      row?.itemCount    ?? 0,
    updatedAt:      row?.updatedAt    ?? null,
    ageMinutes:     ageMin,
    isFresh:        ageMin !== null && ageMin < 20,
    isMarketOpen:   isMarketOpen(),
    nextMarketOpen: nextMarketOpen(),
    schedule:       'Séance: toutes les 15min | Hors séance: toutes les heures',
  }
}

/* ── Démarrage du cron ──────────────────────────────────── */
export function startBRVMCron(): void {
  // Pendant les séances : chaque quart d'heure lun–ven
  cron.schedule('*/15 * * * 1-5', async () => {
    if (isMarketOpen()) {
      await refreshBRVMData()
    }
  })

  // Hors séance et week-end : une fois par heure (maintient données fraîches)
  cron.schedule('0 * * * *', async () => {
    if (!isMarketOpen()) {
      await refreshBRVMData()
    }
  })

  // Premier chargement 3s après le démarrage (laisse le temps à Prisma)
  setTimeout(() => {
    refreshBRVMData().catch(err =>
      console.warn('[BRVM cron] init refresh failed:', err.message)
    )
  }, 3_000)

  console.log('[BRVM cron] Démarré — séances: 15min | hors séance: 1h')
}
