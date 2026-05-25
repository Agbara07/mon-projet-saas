export default function CalendarLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <div className="w-20 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
        <div className="flex-1" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-12 h-5 rounded-full bg-[var(--fin-hover)] animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Today's events */}
        <div className="h-14 rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
        {/* Table */}
        <div className="rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] overflow-hidden">
          <div className="h-9 border-b border-[var(--fin-border)] bg-[var(--fin-surface)] animate-pulse" />
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center px-4 h-11 gap-4 border-b border-[var(--fin-border)] last:border-0">
              <div className="w-10 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
              <div className="flex-1 h-2 rounded bg-[var(--fin-hover)] animate-pulse opacity-50" />
              <div className="w-16 h-2 rounded bg-[var(--fin-hover)] animate-pulse opacity-40" />
              <div className="w-14 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
              <div className="w-14 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
