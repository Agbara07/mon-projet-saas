export default function EuronextLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Status bar skeleton */}
      <div className="flex-shrink-0 bg-[var(--fin-panel)] border-b border-[var(--fin-border)] px-4 py-2">
        <div className="flex items-center gap-4">
          {[100, 80, 70, 60].map(w => (
            <div key={w} className="h-4 rounded bg-[var(--fin-hover)] animate-pulse" style={{ width: w }} />
          ))}
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className="flex-shrink-0 bg-[var(--fin-panel)] border-b border-[var(--fin-border)] px-4 py-2 flex gap-4">
        {[80, 100, 70, 120, 90].map(w => (
          <div key={w} className="h-4 rounded bg-[var(--fin-hover)] animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="bg-[var(--fin-panel)] rounded-lg border border-[var(--fin-border)] p-4 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-[var(--fin-hover)] rounded" />
              {Array(5).fill(0).map((_, j) => <div key={j} className="h-8 bg-[var(--fin-hover)] rounded" />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
