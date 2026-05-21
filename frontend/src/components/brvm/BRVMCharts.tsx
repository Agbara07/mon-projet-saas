'use client'

/**
 * BRVMCharts — composants graphiques Bloomberg-compatible
 * Tous les charts utilisent useTheme() pour adapter les couleurs dark/light.
 * CSS variables --fin-* partout, aucun hardcode.
 */
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import CountUp from 'react-countup'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveRadar } from '@nivo/radar'
import { ResponsivePie } from '@nivo/pie'
import 'react-circular-progressbar/dist/styles.css'
import { useTheme } from '@/lib/theme'

/* ── Résolution des CSS vars au runtime ─────────────────── */
function cssVar(name: string): string {
  if (typeof window === 'undefined') return '#888'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/* ── Thème Nivo adaptatif ───────────────────────────────── */
function useNivoTheme() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    axis: {
      ticks: { text: { fontSize: 9, fill: dark ? '#6A8098' : '#7A90A8', fontFamily: 'JetBrains Mono, monospace' } },
    },
    grid:    { line:    { stroke: dark ? 'rgba(255,255,255,0.07)' : '#E4ECF7', strokeWidth: 1 } },
    tooltip: { container: {
      background: dark ? '#1A2230' : '#FFFFFF',
      border:     `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#D0D8E4'}`,
      borderRadius: '4px',
      fontSize: '10px',
      fontFamily: 'JetBrains Mono, monospace',
      color: dark ? '#E2EAF4' : '#0A1929',
      padding: '6px 10px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }},
    legends: { text: { fill: dark ? '#6A8098' : '#7A90A8', fontSize: 10 } },
  }
}

/* ── Couleurs score ──────────────────────────────────── */
function scorePathColor(s: number) {
  if (s >= 80) return '#0ECB81'
  if (s >= 60) return '#3B8EF3'
  if (s >= 40) return '#F0B90B'
  if (s >= 20) return '#F6763A'
  return '#F6465D'
}

/* ── Jauge circulaire Bloomberg ─────────────────────────── */
export function ScoreGauge({ value, max = 100, label, size = 80 }: {
  value: number; max?: number; label?: string; size?: number
}) {
  const { theme } = useTheme()
  const dark  = theme === 'dark'
  const pct   = Math.min(100, (value / max) * 100)
  const color = scorePathColor(pct)

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }}>
        <CircularProgressbar
          value={pct}
          text={`${Math.round(value)}`}
          styles={buildStyles({
            pathColor:   color,
            trailColor:  dark ? 'rgba(255,255,255,0.08)' : '#E4ECF7',
            textColor:   color,
            textSize:    '26px',
            pathTransitionDuration: 0.6,
          })}
        />
      </div>
      {label && (
        <p className="text-[9px] text-[var(--fin-t3)] font-mono text-center leading-tight uppercase tracking-wide">
          {label}
        </p>
      )}
    </div>
  )
}

/* ── GovernanceGauge ──────────────────────────────────── */
export function GovernanceGauge({ total, audit, transparency, dividend, parent }: {
  total: number; audit: number; transparency: number; dividend: number; parent: number
}) {
  return (
    <div className="flex items-center gap-3">
      <ScoreGauge value={total} size={64} label="Total"/>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {[
          { label:'Audit',         val:audit,        max:25 },
          { label:'Transp.',       val:transparency,  max:25 },
          { label:'Dividende',     val:dividend,      max:25 },
          { label:'Actionnaire',   val:parent,        max:25 },
        ].map(({ label, val, max }) => {
          const color = scorePathColor((val/max)*100)
          return (
            <div key={label}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[9px] text-[var(--fin-t3)] font-mono uppercase tracking-wide">{label}</span>
                <span className="text-[9px] font-bold font-mono" style={{ color }}>{val}/{max}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'var(--fin-surface)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(val/max)*100}%`, backgroundColor: color }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── KPICounter ─────────────────────────────────────────── */
export function KPICounter({ value, decimals = 0, suffix = '', prefix = '', label, sub, color }: {
  value: number; decimals?: number; suffix?: string; prefix?: string
  label: string; sub?: string; color?: string
}) {
  return (
    <div>
      <p className="text-[9px] text-[var(--fin-t3)] font-bold uppercase tracking-widest">{label}</p>
      <p className={`text-base font-black mt-0.5 tabular-nums font-mono ${color ?? 'text-[var(--fin-t1)]'}`}>
        {prefix}
        <CountUp end={value} decimals={decimals} duration={1.2} separator=" " useEasing/>
        {suffix}
      </p>
      {sub && <p className="text-[9px] text-[var(--fin-t3)] mt-0.5 font-mono">{sub}</p>}
    </div>
  )
}

/* ── DividendBarChart — mini sparkline inline ───────────── */
export function DividendBarChart({ history, height = 36 }: {
  history: { year: number; amount: number }[]
  height?: number
}) {
  const nivoTheme = useNivoTheme()
  const { theme } = useTheme()
  const data = [...history].reverse().map(h => ({ year: String(h.year), dividende: h.amount }))
  if (!data.length) return null
  return (
    <div style={{ height, minWidth: 80 }}>
      <ResponsiveBar
        data={data} keys={['dividende']} indexBy="year"
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        padding={0.3}
        colors={[theme === 'dark' ? '#3B8EF3' : '#2563eb']}
        borderRadius={2}
        axisLeft={null} axisBottom={null}
        enableLabel={false} enableGridY={false}
        theme={nivoTheme}
        isInteractive={false}
      />
    </div>
  )
}

/* ── DividendBarChart — standalone (pleine hauteur) ────── */
export function DividendBarChartFull({ history, height = 160 }: {
  history: { year: number; amount: number }[]
  height?: number
}) {
  const nivoTheme = useNivoTheme()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const data = [...history].reverse().map(h => ({ year: String(h.year), dividende: h.amount }))
  if (!data.length) return (
    <p className="text-[10px] text-[var(--fin-t3)] text-center py-4 font-mono">— Pas d'historique</p>
  )
  return (
    <div style={{ height }}>
      <ResponsiveBar
        data={data} keys={['dividende']} indexBy="year"
        margin={{ top: 8, right: 8, bottom: 28, left: 52 }}
        padding={0.35}
        colors={[dark ? '#3B8EF3' : '#2563eb']}
        borderRadius={3}
        axisLeft={{ tickSize: 0, tickPadding: 6, format: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v) }}
        axisBottom={{ tickSize: 0, tickPadding: 6 }}
        enableLabel={false} enableGridY gridYValues={4}
        theme={nivoTheme}
        tooltip={({ value, indexValue }) => (
          <div style={nivoTheme.tooltip.container}>
            <span style={{ fontWeight: 700 }}>{indexValue}</span> — {Number(value).toLocaleString('fr-FR')} XOF
          </div>
        )}
      />
    </div>
  )
}

/* ── AfricaRadarChart ───────────────────────────────────── */
export function AfricaRadarChart({ markets }: {
  markets: { market: string; peRatio?: number; dividendYield?: number; ytdReturn?: number }[]
}) {
  const nivoTheme = useNivoTheme()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const maxPE    = Math.max(...markets.map(m => m.peRatio       ?? 0)) || 1
  const maxYield = Math.max(...markets.map(m => m.dividendYield ?? 0)) || 1
  const maxYTD   = Math.max(...markets.map(m => Math.abs(m.ytdReturn ?? 0))) || 1

  const radarData = [
    { metric:'P/E attractif',  ...Object.fromEntries(markets.map(m => [m.market, m.peRatio       ? Math.round((1 - m.peRatio/maxPE)*100) : 0])) },
    { metric:'Rdt div.',       ...Object.fromEntries(markets.map(m => [m.market, m.dividendYield ? Math.round((m.dividendYield/maxYield)*100) : 0])) },
    { metric:'Perf. YTD',      ...Object.fromEntries(markets.map(m => [m.market, m.ytdReturn     ? Math.round((Math.max(0,m.ytdReturn)/maxYTD)*100) : 0])) },
  ]

  const COLORS = dark
    ? ['#0ECB81','#3B8EF3','#F0B90B','#F6465D','#A78BFA','#00B8D9','#F97316']
    : ['#00875A','#0052CC','#C25100','#DE350B','#5B21B6','#008DA6','#EA580C']

  return (
    <div style={{ height: 280 }}>
      <ResponsiveRadar
        data={radarData} keys={markets.map(m => m.market)} indexBy="metric"
        maxValue={100}
        margin={{ top: 36, right: 72, bottom: 36, left: 72 }}
        curve="linearClosed"
        borderWidth={1.5}
        borderColor={{ from:'color' }}
        gridLevels={4} gridShape="circular" gridLabelOffset={14}
        enableDots dotSize={5} dotColor={{ from:'color' }} dotBorderWidth={0}
        fillOpacity={0.08}
        animate colors={COLORS}
        theme={{
          ...nivoTheme,
          grid: { line: { stroke: dark ? 'rgba(255,255,255,0.1)' : '#E4ECF7', strokeWidth: 1 } },
        }}
        legends={[{
          anchor:'top-left', direction:'column', justify:false,
          translateX:-55, translateY:-28,
          itemWidth:80, itemHeight:12,
          itemTextColor: dark ? '#6A8098' : '#7A90A8',
          symbolSize:7, symbolShape:'circle',
        }]}
      />
    </div>
  )
}

/* ── SectorPieChart ─────────────────────────────────────── */
export function SectorPieChart({ sectors }: {
  sectors: { sector: string; marketCap: number }[]
}) {
  const nivoTheme = useNivoTheme()
  const { theme } = useTheme()
  const dark  = theme === 'dark'
  const COLORS = dark
    ? ['#0ECB81','#3B8EF3','#A78BFA','#F6763A','#F0B90B','#F6465D','#00B8D9','#6A8098','#0ECB81']
    : ['#00875A','#0052CC','#7C3AED','#EA580C','#C25100','#DE350B','#008DA6','#5A6477','#0D9488']

  const total = sectors.reduce((s, x) => s + x.marketCap, 0) || 1
  const data  = sectors.filter(s => s.marketCap > 0).map((s, i) => ({
    id:    s.sector, label: s.sector,
    value: parseFloat(((s.marketCap/total)*100).toFixed(1)),
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div style={{ height: 260 }}>
      <ResponsivePie
        data={data}
        margin={{ top: 12, right: 72, bottom: 12, left: 72 }}
        innerRadius={0.58} padAngle={1.5} cornerRadius={2}
        colors={{ datum:'data.color' }} borderWidth={0}
        enableArcLinkLabels
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={dark ? '#6A8098' : '#7A90A8'}
        arcLinkLabelsThickness={1}
        arcLinkLabelsColor={{ from:'color' }}
        arcLabelsSkipAngle={14}
        arcLabelsTextColor="#fff"
        arcLabelsRadiusOffset={0.6}
        animate
        theme={nivoTheme}
        tooltip={({ datum }) => (
          <div style={nivoTheme.tooltip.container}>
            <span style={{ fontWeight:700, color:datum.color }}>{datum.id}</span> — {datum.value}%
          </div>
        )}
        legends={[{
          anchor:'right', direction:'column', justify:false,
          translateX:65, translateY:0,
          itemsSpacing:4, itemWidth:65, itemHeight:12,
          itemTextColor: dark ? '#6A8098' : '#7A90A8',
          itemDirection:'left-to-right', symbolSize:8, symbolShape:'circle',
        }]}
      />
    </div>
  )
}

/* ── CorrelationHeatmap — barres horizontales ───────────── */
export function CorrelationHeatmap({ correlations }: {
  correlations: { symbol: string; primaryCommodity: string; correlation90d: number }[]
}) {
  const nivoTheme = useNivoTheme()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  if (!correlations.length) return null

  return (
    <div style={{ height: Math.max(160, correlations.length * 32 + 40) }}>
      <ResponsiveBar
        data={correlations.map(c => ({ symbol:c.symbol, corrélation: parseFloat((c.correlation90d*100).toFixed(0)) }))}
        keys={['corrélation']} indexBy="symbol" layout="horizontal"
        margin={{ top:4, right:20, bottom:4, left:56 }}
        padding={0.28}
        valueScale={{ type:'linear', min:-100, max:100 }}
        colors={(bar: any) => bar.value >= 0 ? (dark?'#0ECB81':'#00875A') : (dark?'#F6465D':'#DE350B')}
        borderRadius={2}
        axisLeft={{ tickSize:0, tickPadding:8 }}
        axisBottom={null}
        enableLabel label={(d: any) => `${d.value}%`}
        labelTextColor="#fff"
        enableGridX gridXValues={[-50, 0, 50]}
        theme={nivoTheme}
        tooltip={({ indexValue, value }) => (
          <div style={nivoTheme.tooltip.container}>
            <span style={{ fontWeight:700 }}>{indexValue}</span> — {value}%
          </div>
        )}
      />
    </div>
  )
}
