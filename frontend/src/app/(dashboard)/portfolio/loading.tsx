export default function PortfolioLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <div className="w-16 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
        <div className="w-px h-3.5 bg-[var(--fin-border)]" />
        <div className="w-24 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
          ))}
        </div>
        {/* Chart + pie */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 h-52 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
          <div className="h-52 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
        </div>
        {/* Holdings table */}
        <div className="rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] overflow-hidden">
          <div className="h-8 border-b border-[var(--fin-border)] bg-[var(--fin-surface)] animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 border-b border-[var(--fin-border)] last:border-0 animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
