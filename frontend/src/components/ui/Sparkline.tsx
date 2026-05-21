'use client'

/**
 * Sparkline — mini graphique de tendance inline (Koyfin-style).
 * SVG pur, aucune dépendance. Gradient sous la courbe.
 * Couleur automatique selon la tendance (premier → dernier point).
 */

interface SparklineProps {
  data:        number[]
  width?:      number
  height?:     number
  color?:      string           // override auto-color
  strokeWidth?:number
  showGradient?:boolean
  className?:  string
}

// Identifiant unique pour les gradients SVG (évite les collisions)
let _uid = 0
function uid() { return `spk${++_uid}` }

export function Sparkline({
  data,
  width       = 72,
  height      = 26,
  color,
  strokeWidth = 1.4,
  showGradient= true,
  className,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center"
        aria-hidden="true"
      >
        <div className="w-full h-px opacity-20" style={{ background: 'var(--fin-t3)' }}/>
      </div>
    )
  }

  const min  = Math.min(...data)
  const max  = Math.max(...data)
  const span = max - min || 1
  const pad  = strokeWidth + 0.5     // avoid clipping stroke at edges

  const px   = (i: number) => (i / (data.length - 1)) * width
  const py   = (v: number) => pad + ((max - v) / span) * (height - pad * 2)

  // Smooth cubic bezier curve (Koyfin-style rounded lines)
  const linePath = data.map((v, i) => {
    if (i === 0) return `M${px(0).toFixed(2)},${py(v).toFixed(2)}`
    const x0 = px(i - 1), y0 = py(data[i - 1])
    const x1 = px(i),     y1 = py(v)
    const cx  = (x0 + x1) / 2
    return `C${cx.toFixed(2)},${y0.toFixed(2)} ${cx.toFixed(2)},${y1.toFixed(2)} ${x1.toFixed(2)},${y1.toFixed(2)}`
  }).join('')

  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  const isUp   = data[data.length - 1] >= data[0]
  const stroke = color ?? (isUp ? 'var(--fin-green)' : 'var(--fin-red)')
  const gid    = uid()

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      style={{ overflow: 'visible', display: 'block' }}
    >
      {showGradient && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={stroke} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={stroke} stopOpacity="0"/>
          </linearGradient>
        </defs>
      )}
      {showGradient && <path d={areaPath} fill={`url(#${gid})`}/>}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ── Génère des données pseudo-sparkline à partir du % de variation ── */
export function generateSparkline(
  symbol:         string,
  changePercent:  number,
  currentPrice:   number,
  points          = 20,
): number[] {
  // Générateur pseudo-aléatoire déterministe (même seed = même courbe)
  let h = 0
  const seed = symbol + changePercent.toFixed(2)
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  const rand = () => {
    h ^= h >>> 17; h = Math.imul(h, 0xed5ad4bb) | 0
    h ^= h >>> 11; h = Math.imul(h, 0xac4c1b51) | 0
    h ^= h >>> 15
    return (h >>> 0) / 4294967296
  }

  const trend = changePercent / 100
  const base  = currentPrice / (1 + trend)
  const result: number[] = []

  for (let i = 0; i < points; i++) {
    const p = i / (points - 1)
    const t = base * trend * p
    const n = base * 0.018 * (rand() - 0.5) * (1 - p * 0.4)
    result.push(base + t + n)
  }
  result[result.length - 1] = currentPrice
  return result
}
