export default function BillingLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-9 flex-shrink-0 border-b border-[var(--fin-border)] bg-[var(--fin-panel)]">
        <div className="w-20 h-2 rounded bg-[var(--fin-hover)] animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Current plan banner */}
        <div className="h-20 rounded-xl border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" />
        {/* Pricing grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-72 rounded-xl border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse" style={{ opacity: 1 - i * 0.08 }} />
          ))}
        </div>
        {/* FAQ / info */}
        <div className="h-32 rounded-xl border border-[var(--fin-border)] bg-[var(--fin-panel)] animate-pulse opacity-60" />
      </div>
    </div>
  )
}
