export default function SettingsLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <div className="w-20 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto w-full space-y-5">
        {/* Avatar + name section */}
        <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--fin-border)] bg-[var(--fin-panel)]">
          <div className="w-16 h-16 rounded-full bg-[var(--fin-hover)] animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-36 h-3 rounded bg-[var(--fin-hover)] animate-pulse" />
            <div className="w-48 h-2 rounded bg-[var(--fin-hover)] animate-pulse opacity-60" />
          </div>
        </div>
        {/* Form sections */}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border border-[var(--fin-border)] bg-[var(--fin-panel)] space-y-3">
            <div className="w-28 h-2.5 rounded bg-[var(--fin-hover)] animate-pulse" />
            <div className="h-10 rounded-lg bg-[var(--fin-hover)] animate-pulse" />
            <div className="h-10 rounded-lg bg-[var(--fin-hover)] animate-pulse opacity-70" />
          </div>
        ))}
        <div className="h-10 w-32 rounded-lg bg-[var(--fin-hover)] animate-pulse" />
      </div>
    </div>
  )
}
