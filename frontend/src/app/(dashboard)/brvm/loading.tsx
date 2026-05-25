export default function BRVMLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <div className="w-12 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
        <div className="w-px h-3.5 bg-[var(--fin-border)]" />
        <div className="w-24 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
        <div className="flex-1" />
        <div className="w-20 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
      </div>
      {/* Indices strip */}
      <div className="flex border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-36 h-12 border-r border-[var(--fin-border)] animate-pulse bg-[var(--fin-surface)]" />
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
          ))}
        </div>
        {/* Main table */}
        <div className="rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] overflow-hidden">
          <div className="h-9 border-b border-[var(--fin-border)] bg-[var(--fin-surface)] animate-pulse" />
          {[...Array(15)].map((_, i) => (
            <div key={i} className="flex items-center px-4 h-9 gap-4 border-b border-[var(--fin-border)] last:border-0">
              <div className="w-14 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
              <div className="flex-1 h-2 rounded bg-[var(--fin-hover)] animate-pulse opacity-40" />
              <div className="w-16 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
              <div className="w-14 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
