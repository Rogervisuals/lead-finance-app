import { Suspense } from "react";
import type { ActiveTimerRow } from "@/lib/active-timer";
import { ActiveTimerNav } from "./ActiveTimerNav";

type ClientOpt = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
};
type ProjectOpt = { id: string; name: string; client_id: string };

export function ActiveTimerNavWithSuspense({
  initialTimer,
  clients,
  projects,
}: {
  initialTimer: ActiveTimerRow | null;
  clients: ClientOpt[];
  projects: ProjectOpt[];
}) {
  return (
    <Suspense
      fallback={
        <div
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/30"
          aria-hidden
        />
      }
    >
      <ActiveTimerNav
        initialTimer={initialTimer}
        clients={clients}
        projects={projects}
      />
    </Suspense>
  );
}
