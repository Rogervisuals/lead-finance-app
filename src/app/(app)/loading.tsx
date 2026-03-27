export default function AppLoading() {
  return (
    <div className="space-y-5">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-44 rounded bg-zinc-800/70" />
        <div className="h-4 w-64 rounded bg-zinc-800/50" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/30" />
        <div className="h-36 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/30" />
      </div>
      <div className="h-72 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/30" />
    </div>
  );
}
