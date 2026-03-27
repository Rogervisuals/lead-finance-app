export default function RootLoading() {
  return (
    <div className="mx-auto min-h-[60vh] w-full max-w-6xl px-4 py-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-zinc-800/70" />
        <div className="h-4 w-72 rounded bg-zinc-800/50" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/30" />
          <div className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/30" />
          <div className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/30" />
        </div>
        <div className="h-64 rounded-xl border border-zinc-800 bg-zinc-900/30" />
      </div>
    </div>
  );
}
