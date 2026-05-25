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
  return parseFloat(s.replace(/[\s ]/g, '').replace(',', '.')) || 0
}
function parseVol(s: string): number {
  return parseInt(s.replace(/[\s ,]/g, '')) || 0
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

/* ══════════════════════════════════════════════════════════
   BACKFILL — Seed 90 jours d'historique en une seule passe
   Sources (cascade) :
     1. SikaFinance — scraping HTML par symbole, URL correcte avec suffixe pays
     2. BRVM Bulletins mensuels — Excel BRVM officiel (fallback)
   ══════════════════════════════════════════════════════════ */

export interface BackfillResult {
  success:    boolean
  sources:    Array<{ name: string; symbols: number; rows: number; error?: string }>
  total:      { symbols: number; rows: number }
  durationMs: number
}

type DayRow = { date: string; close: number; volume?: number }

async function upsertRows(map: Map<string, DayRow[]>): Promise<number> {
  let count = 0
  for (const [symbol, rows] of map) {
    const ops = rows
      .filter(r => r.close > 0)
      .map(r => prisma.bRVMPriceHistory.upsert({
        where:  { symbol_date: { symbol, date: r.date } },
        update: { close: r.close, volume: r.volume ?? 0 },
        create: { symbol,         date: r.date, close: r.close, volume: r.volume ?? 0 },
      }))
    if (ops.length) { await Promise.allSettled(ops); count += ops.length }
  }
  return count
}

/* ── Source 1 : SikaFinance historique ─────────────────────
   URL : https://www.sikafinance.com/marches/historiques/{SYM}.{cc}
   Colonnes : Date | Clôture | Plus bas | Plus haut | Ouverture | Volume Titres | ...
   &#xA0; (U+00A0) utilisé comme séparateur de milliers — décoder avant parseFloat */

const SIKA_COUNTRY: Record<string, string> = {
  "Côte d'Ivoire": 'ci',
  'Sénégal':       'sn',
  'Burkina Faso':  'bf',
  'Bénin':         'bj',
  'Togo':          'tg',
  'Mali':          'ml',
  'Niger':         'ne',
  'Guinée-Bissau': 'gw',
}

function parseSikaHistoriques(html: string): DayRow[] {
  const rows: DayRow[] = []
  for (const part of html.split(/<tr[\s>]/i)) {
    if (!part.includes('<td')) continue
    const cells: string[] = []
    const rx = /<td[^>]*>([\s\S]*?)<\/td>/gi
    let m: RegExpExecArray | null
    while ((m = rx.exec(part)) !== null) {
      const text = m[1]
        .replace(/&#xA0;/gi, ' ')
        .replace(/&nbsp;/gi,  ' ')
        .replace(/&#160;/g,   ' ')
        .replace(/<[^>]+>/g,  '')
        .trim()
      cells.push(text)
    }
    if (cells.length < 2) continue
    const dm = /(\d{2})\/(\d{2})\/(\d{4})/.exec(cells[0])
    if (!dm) continue
    const date  = `${dm[3]}-${dm[2]}-${dm[1]}`
    const close = parseFloat(cells[1].replace(/[\s ,]/g, '').replace(',', '.'))
    if (close > 0) {
      const volume = cells.length >= 6
        ? parseInt(cells[5].replace(/[\s ,]/g, '')) || 0
        : 0
      rows.push({ date, close, volume })
    }
  }
  return rows
}

async function backfillSikaFinance(
  symbols: string[],
): Promise<{ data: Map<string, DayRow[]>; failed: string[] }> {
  const data:   Map<string, DayRow[]> = new Map()
  const failed: string[]              = []

  for (const sym of symbols) {
    const info   = BRVM_COMPANIES[sym]
    const suffix = info ? (SIKA_COUNTRY[info.country] ?? 'ci') : 'ci'
    try {
      const url = `https://www.sikafinance.com/marches/historiques/${sym}.${suffix}`
      const r   = await fetch(url, {
        headers: {
          'Accept':          'text/html,application/xhtml+xml',
          'Accept-Language': 'fr-FR,fr;q=0.9',
          'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
          'Referer':         'https://www.sikafinance.com/marches/cotations',
        },
        signal: AbortSignal.timeout(10_000),
      })
      // Délai avant continue pour ne jamais le sauter
      await new Promise(res => setTimeout(res, 300))
      if (!r.ok) { failed.push(sym); continue }
      const rows = parseSikaHistoriques(await r.text())
      rows.length > 0 ? data.set(sym, rows) : failed.push(sym)
    } catch { failed.push(sym) }
  }

  return { data, failed }
}

/* ── Source 2 : Bulletins mensuels BRVM (Excel) ────────────
   https://www.brvm.org/fr/bulletins-mensuels
   Fallback : bulletins disponibles si SikaFinance ne couvre pas un symbole */
async function backfillBRVMBulletins(
  symbols: string[],
): Promise<{ data: Map<string, DayRow[]>; failed: string[] }> {
  let XLSX: typeof import('xlsx')
  try { XLSX = await import('xlsx') }
  catch { return { data: new Map(), failed: [...symbols] } }

  const data:   Map<string, DayRow[]> = new Map()
  const symSet  = new Set(symbols)

  try {
    const listPage = await fetch('https://www.brvm.org/fr/bulletins-mensuels', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(12_000),
    })
    if (!listPage.ok) throw new Error(`HTTP ${listPage.status}`)
    const html = await listPage.text()

    // Extraire les 3 premiers liens .xlsx/.xls trouvés
    const linkRx = /href="([^"]+\.xlsx?)"/gi
    const links: string[] = []
    let lm: RegExpExecArray | null
    while ((lm = linkRx.exec(html)) !== null && links.length < 3) {
      links.push(lm[1].startsWith('http') ? lm[1] : `https://www.brvm.org${lm[1]}`)
    }

    for (const link of links) {
      try {
        const resp = await fetch(link, { signal: AbortSignal.timeout(20_000) })
        if (!resp.ok) continue
        const wb   = XLSX.read(new Uint8Array(await resp.arrayBuffer()), { type: 'array' })

        for (const sheetName of wb.SheetNames) {
          const rows = XLSX.utils.sheet_to_json<string[]>(
            wb.Sheets[sheetName], { header: 1, raw: false }
          )
          for (const row of rows) {
            if (!row || row.length < 3) continue
            const sym   = String(row[0] ?? '').trim()
            if (!symSet.has(sym)) continue
            const dm    = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(row[1] ?? ''))
            if (!dm) continue
            const date  = `${dm[3]}-${dm[2]}-${dm[1]}`
            const close = parseFloat(String(row[2] ?? '').replace(/[\s,]/g, '').replace(',', '.'))
            if (close <= 0) continue
            const existing = data.get(sym) ?? []
            existing.push({ date, close })
            data.set(sym, existing)
          }
        }
      } catch { continue }
    }
  } catch (e: any) {
    console.warn('[BRVM backfill bulletins]', e.message)
  }

  return { data, failed: symbols.filter(s => !data.has(s)) }
}

/* ── Orchestrateur principal ────────────────────────────────
   Waterfall : SikaFinance → Bulletins BRVM
   Seuls les symboles échoués sont transmis à la source suivante */
export async function runBackfill(): Promise<BackfillResult> {
  const t0     = Date.now()

  const allSymbols = Object.keys(BRVM_COMPANIES)
  let   remaining  = [...allSymbols]
  const report:    BackfillResult['sources'] = []
  let   totalRows  = 0

  // ── Source 1 : SikaFinance ────────────────────────────────
  try {
    const { data, failed } = await backfillSikaFinance(remaining)
    const rows = await upsertRows(data)
    report.push({ name: 'sikafinance', symbols: data.size, rows })
    totalRows += rows; remaining = failed
    console.log(`[BRVM backfill] SikaFinance: ${data.size} symboles, ${rows} rows`)
  } catch (e: any) {
    report.push({ name: 'sikafinance', symbols: 0, rows: 0, error: e.message })
  }

  // ── Source 2 : Bulletins BRVM Excel (symboles restants) ──
  if (remaining.length > 0) {
    try {
      const { data, failed } = await backfillBRVMBulletins(remaining)
      const rows = await upsertRows(data)
      report.push({ name: 'brvm-bulletins', symbols: data.size, rows })
      totalRows += rows; remaining = failed
      console.log(`[BRVM backfill] Bulletins: ${data.size} symboles, ${rows} rows`)
    } catch (e: any) {
      report.push({ name: 'brvm-bulletins', symbols: 0, rows: 0, error: e.message })
    }
  }

  const covered = allSymbols.length - remaining.length
  console.log(`[BRVM backfill] Terminé — ${covered}/${allSymbols.length} symboles, ${totalRows} rows, ${Date.now()-t0}ms`)
  return {
    success:    totalRows > 0,
    sources:    report,
    total:      { symbols: covered, rows: totalRows },
    durationMs: Date.now() - t0,
  }
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
    isFresh:        ageMin !== null && ageMin < (isMarketOpen() ? 20 : 70),
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
