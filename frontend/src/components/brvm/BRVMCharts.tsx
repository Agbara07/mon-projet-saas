'use client'

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import CountUp from 'react-countup'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveRadar } from '@nivo/radar'
import { ResponsivePie } from '@nivo/pie'
import 'react-circular-progressbar/dist/styles.css'

/* ── Couleurs score ─────────────────────────────────────── */
function scorePathColor(s: number) {
  if (s >= 80) return '#16a34a'
  if (s >= 60) return '#2563eb'
  if (s >= 40) return '#d97706'
  if (s >= 20) return '#ea580c'
  return '#dc2626'
}
function scoreTextColor(s: number) {
  if (s >= 80) return '#15803d'
  if (s >= 60) return '#1d4ed8'
  if (s >= 40) return '#b45309'
  if (s >= 20) return '#c2410c'
  return '#b91c1c'
}

/* ── Jauge circulaire ───────────────────────────────────── */
export function ScoreGauge({
  value, max = 100, label, size = 80,
}: {
  value: number; max?: number; label?: string; size?: number
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{ width: size, height: size }}>
        <CircularProgressbar
          value={pct}
          text={`${Math.round(value)}`}
          styles={buildStyles({
            pathColor:        scorePathColor(pct),
            trailColor:       '#e5e7eb',
            textColor:        scoreTextColor(pct),
            textSize:         '26px',
            pathTransitionDuration: 0.8,
          })}
        />
      </div>
      {label && <p className="text-xs text-gray-500 font-medium text-center leading-tight">{label}</p>}
    </div>
  )
}

/* ── Mini jauge 4 composantes ───────────────────────────── */
export function GovernanceGauge({
  total, audit, transparency, dividend, parent,
}: {
  total: number; audit: number; transparency: number; dividend: number; parent: number
}) {
  return (
    <div className="flex items-center gap-4">
      <ScoreGauge value={total} size={72} label="Score global" />
      <div className="grid grid-cols-2 gap-2 flex-1">
        {[
          { label: 'Audit', val: audit,        max: 25 },
          { label: 'Transp.', val: transparency, max: 25 },
          { label: 'Dividende', val: dividend,  max: 25 },
          { label: 'Actionnaire', val: parent,  max: 25 },
        ].map(({ label, val, max }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-500">{label}</span>
              <span className="font-bold" style={{ color: scorePathColor((val/max)*100) }}>{val}/{max}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(val/max)*100}%`, backgroundColor: scorePathColor((val/max)*100) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── CountUp KPI ────────────────────────────────────────── */
export function KPICounter({
  value, decimals = 0, suffix = '', prefix = '', label, sub, color = 'text-gray-900',
}: {
  value: number; decimals?: number; suffix?: string; prefix?: string
  label: string; sub?: string; color?: string
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-xl font-black mt-0.5 tabular-nums ${color}`}>
        {prefix}
        <CountUp end={value} decimals={decimals} duration={1.4} separator=" " useEasing />
        {suffix}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/* ── Bar chart dividendes ───────────────────────────────── */
export function DividendBarChart({
  history,
  height = 160,
}: {
  history: { year: number; amount: number }[]
  height?: number
}) {
  const data = [...history].reverse().map(h => ({ year: String(h.year), dividende: h.amount }))
  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-4">Pas d'historique</p>
  return (
    <div style={{ height }}>
      <ResponsiveBar
        data={data}
        keys={['dividende']}
        indexBy="year"
        margin={{ top: 8, right: 8, bottom: 28, left: 52 }}
        padding={0.35}
        colors={['#2563eb']}
        borderRadius={3}
        axisLeft={{ tickSize: 0, tickPadding: 6, format: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v) }}
        axisBottom={{ tickSize: 0, tickPadding: 6 }}
        enableLabel={false}
        enableGridY
        gridYValues={4}
        theme={{
          axis: { ticks: { text: { fontSize: 10, fill: '#9ca3af' } } },
          grid: { line: { stroke: '#f3f4f6' } },
        }}
        tooltip={({ value, indexValue }) => (
          <div className="bg-white shadow-lg border border-gray-100 rounded-lg px-3 py-1.5 text-xs">
            <span className="font-bold text-gray-900">{indexValue}</span> — {Number(value).toLocaleString('fr-FR')} XOF
          </div>
        )}
      />
    </div>
  )
}

/* ── Radar comparateur africain ─────────────────────────── */
export function AfricaRadarChart({
  markets,
}: {
  markets: { market: string; peRatio?: number; dividendYield?: number; ytdReturn?: number }[]
}) {
  // Normaliser chaque métrique sur 100 pour le radar
  const maxPE   = Math.max(...markets.map(m => m.peRatio   ?? 0)) || 1
  const maxYield = Math.max(...markets.map(m => m.dividendYield ?? 0)) || 1
  const maxYTD  = Math.max(...markets.map(m => Math.abs(m.ytdReturn ?? 0))) || 1

  const radarData = [
    {
      metric: 'P/E attractif',
      ...Object.fromEntries(markets.map(m => [m.market, m.peRatio ? Math.round((1 - m.peRatio/maxPE) * 100) : 0])),
    },
    {
      metric: 'Rendement div.',
      ...Object.fromEntries(markets.map(m => [m.market, m.dividendYield ? Math.round((m.dividendYield/maxYield)*100) : 0])),
    },
    {
      metric: 'Perf. YTD',
      ...Object.fromEntries(markets.map(m => [m.market, m.ytdReturn ? Math.round((Math.max(0,m.ytdReturn)/maxYTD)*100) : 0])),
    },
  ]

  const keys = markets.map(m => m.market)
  const COLORS = ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2','#db2777']

  return (
    <div style={{ height: 300 }}>
      <ResponsiveRadar
        data={radarData}
        keys={keys}
        indexBy="metric"
        maxValue={100}
        margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
        curve="linearClosed"
        borderWidth={2}
        borderColor={{ from: 'color' }}
        gridLevels={4}
        gridShape="circular"
        gridLabelOffset={16}
        enableDots
        dotSize={6}
        dotColor={{ from: 'color' }}
        dotBorderWidth={0}
        fillOpacity={0.1}
        blendMode="normal"
        animate
        colors={COLORS}
        theme={{
          axis: { ticks: { text: { fontSize: 11, fill: '#6b7280' } } },
        }}
        legends={[{
          anchor: 'top-left', direction: 'column', justify: false,
          translateX: -60, translateY: -30,
          itemWidth: 80, itemHeight: 14, itemTextColor: '#6b7280',
          symbolSize: 8, symbolShape: 'circle',
        }]}
      />
    </div>
  )
}

/* ── Pie chart répartition sectorielle ──────────────────── */
export function SectorPieChart({
  sectors,
}: {
  sectors: { sector: string; marketCap: number }[]
}) {
  const COLORS = ['#16a34a','#2563eb','#7c3aed','#ea580c','#d97706','#dc2626','#0891b2','#6b7280','#0d9488']
  const total = sectors.reduce((s, x) => s + x.marketCap, 0) || 1
  const data = sectors.filter(s => s.marketCap > 0).map((s, i) => ({
    id:    s.sector,
    label: s.sector,
    value: parseFloat(((s.marketCap/total)*100).toFixed(1)),
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div style={{ height: 280 }}>
      <ResponsivePie
        data={data}
        margin={{ top: 16, right: 80, bottom: 16, left: 80 }}
        innerRadius={0.55}
        padAngle={1.5}
        cornerRadius={3}
        colors={{ datum: 'data.color' }}
        borderWidth={0}
        enableArcLinkLabels
        arcLinkLabelsSkipAngle={8}
        arcLinkLabelsTextColor="#6b7280"
        arcLinkLabelsThickness={1.5}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={12}
        arcLabelsTextColor="#fff"
        arcLabelsRadiusOffset={0.6}
        animate
        tooltip={({ datum }) => (
          <div className="bg-white shadow-lg border border-gray-100 rounded-lg px-3 py-1.5 text-xs">
            <span className="font-bold" style={{ color: datum.color }}>{datum.id}</span> — {datum.value}%
          </div>
        )}
        legends={[{
          anchor: 'right', direction: 'column', justify: false,
          translateX: 70, translateY: 0,
          itemsSpacing: 4, itemWidth: 70, itemHeight: 14,
          itemTextColor: '#6b7280', itemDirection: 'left-to-right',
          symbolSize: 10, symbolShape: 'circle',
        }]}
      />
    </div>
  )
}

/* ── Heatmap corrélations ───────────────────────────────── */
export function CorrelationHeatmap({
  correlations,
}: {
  correlations: { symbol: string; primaryCommodity: string; correlation90d: number }[]
}) {
  if (correlations.length === 0) return null

  const commodities = Array.from(new Set(correlations.map(c => c.primaryCommodity)))
  const data = correlations.map(c => ({
    id: c.symbol,
    data: commodities.map(comm => ({
      x:    comm,
      y:    c.primaryCommodity === comm ? c.correlation90d : null,
    })),
  }))

  return (
    <div style={{ height: Math.max(200, correlations.length * 36 + 60) }}>
      <ResponsiveBar
        data={correlations.map(c => ({
          symbol:      c.symbol,
          corrélation: parseFloat((c.correlation90d * 100).toFixed(0)),
        }))}
        keys={['corrélation']}
        indexBy="symbol"
        layout="horizontal"
        margin={{ top: 8, right: 24, bottom: 8, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear', min: -100, max: 100 }}
        colors={(bar: any) => bar.value >= 0 ? '#16a34a' : '#dc2626'}
        borderRadius={3}
        axisLeft={{ tickSize: 0, tickPadding: 8 }}
        axisBottom={null}
        enableLabel
        label={(d: any) => `${d.value}%`}
        labelTextColor="#fff"
        enableGridX
        gridXValues={[-50, 0, 50]}
        theme={{
          axis: { ticks: { text: { fontSize: 11, fill: '#6b7280', fontWeight: 700 } } },
          grid: { line: { stroke: '#f3f4f6' } },
        }}
        tooltip={({ indexValue, value }) => (
          <div className="bg-white shadow-lg border border-gray-100 rounded-lg px-3 py-1.5 text-xs">
            <span className="font-bold text-gray-900">{indexValue}</span> — corrélation {value}%
          </div>
        )}
      />
    </div>
  )
}
