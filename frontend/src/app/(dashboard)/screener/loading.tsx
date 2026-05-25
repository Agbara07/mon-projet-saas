export default function ScreenerLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <div className="w-16 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
        <div className="flex-1" />
        <div className="w-32 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Filter presets */}
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-7 w-24 rounded-lg bg-[var(--fin-panel)] border border-[var(--fin-border)] animate-pulse" />
          ))}
        </div>
        {/* Table */}
        <div className="rounded-lg border border-[var(--fin-border)] bg-[var(--fin-panel)] overflow-hidden">
          <div className="h-9 border-b border-[var(--fin-border)] bg-[var(--fin-surface)] animate-pulse" />
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex items-center px-4 h-10 gap-4 border-b border-[var(--fin-border)] last:border-0">
              <div className="w-14 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
              <div className="flex-1 h-2 rounded bg-[var(--fin-hover)] animate-pulse opacity-50" />
              <div className="w-16 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
              <div className="w-14 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
              <div className="w-12 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
