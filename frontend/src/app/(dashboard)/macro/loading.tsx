export default function MacroLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <div className="w-20 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
        <div className="flex-1" />
        <div className="flex gap-1.5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="w-14 h-5 rounded-full bg-[var(--fin-hover)] animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" style={{ opacity: 1 - (i % 4) * 0.08 }} />
          ))}
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="h-52 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
          <div className="h-52 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse opacity-80" />
        </div>
      </div>
    </div>
  )
}
