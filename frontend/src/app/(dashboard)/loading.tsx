// Route segment loading UI — shown immediately during any navigation within the dashboard.
// No 'use client' needed: static skeleton, renders server-side, gets prefetched automatically.
export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <div className="w-14 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
        <div className="w-px h-3.5 bg-[var(--fin-border)]" />
        <div className="w-20 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
        <div className="flex-1" />
        <div className="w-24 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
      </div>

      {/* Indices strip */}
      <div className="flex border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-[120px] h-12 border-r border-[var(--fin-border)] bg-[var(--fin-surface)] animate-pulse" />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 h-60 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
          <div className="h-60 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 h-44 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
          <div className="h-44 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
        </div>
      </div>
    </div>
  )
}
