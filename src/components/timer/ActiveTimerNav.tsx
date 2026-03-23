"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { ActiveTimerRow } from "@/lib/active-timer";
import {
  startActiveTimerAction,
  stopActiveTimerAction,
} from "@/app/(app)/server-actions/active-timer";

type ClientOpt = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
};
type ProjectOpt = { id: string; name: string; client_id: string };

function clientOptionLabel(c: ClientOpt, all: ClientOpt[]) {
  const sameName = all.filter((x) => x.name === c.name).length > 1;
  if (sameName) {
    const email = c.email?.trim();
    if (email) return `${c.name} (${email})`;
    const company = c.company?.trim();
    if (company) return `${c.name} (${company})`;
    return `${c.name} (${String(c.id).slice(0, 8)}…)`;
  }
  return c.name;
}

function formatHMS(totalSeconds: number) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function ActiveTimerNav({
  initialTimer: timer,
  clients,
  projects,
}: {
  initialTimer: ActiveTimerRow | null;
  clients: ClientOpt[];
  projects: ProjectOpt[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [returnTo, setReturnTo] = useState(() => pathname || "/dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setReturnTo(window.location.pathname + window.location.search);
    }
  }, [pathname]);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!timer) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const elapsedSeconds = useMemo(() => {
    if (!timer) return 0;
    const start = new Date(timer.start_time).getTime();
    return Math.max(0, (now - start) / 1000);
  }, [timer, now]);

  const clientIdFromPath = useMemo(() => {
    const m = pathname?.match(/^\/clients\/([0-9a-f-]{36})/i);
    const id = m?.[1];
    return id && clients.some((c) => c.id === id) ? id : null;
  }, [pathname, clients]);

  const [clientId, setClientId] = useState(() => {
    const first = clients[0]?.id ?? "";
    if (clientIdFromPath) return clientIdFromPath;
    return first;
  });

  useEffect(() => {
    if (clientIdFromPath) setClientId(clientIdFromPath);
  }, [clientIdFromPath]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((p) => String(p.client_id) === String(clientId)),
    [projects, clientId]
  );

  const timerError = searchParams?.get("timer_error");

  function openModal() {
    if (typeof window !== "undefined") {
      setReturnTo(window.location.pathname + window.location.search);
    }
    setOpen(true);
  }

  return (
    <>
      <div className="flex min-h-9 min-w-0 items-center gap-2">
        {timer ? (
          <>
            <button
              type="button"
              onClick={openModal}
              className="flex max-w-[6.5rem] truncate rounded-md border border-emerald-900/50 bg-emerald-950/30 px-2 py-1 font-mono text-xs text-emerald-200 hover:bg-emerald-950/50 sm:hidden"
              title="Timer running"
            >
              🟢 {formatHMS(elapsedSeconds)}
            </button>
            <button
              type="button"
              onClick={openModal}
              className="hidden max-w-[min(100%,18rem)] truncate rounded-md border border-emerald-900/50 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-950/50 sm:inline-flex sm:items-center"
              title="Timer running — click to manage"
            >
              🟢{" "}
              {timer.projectName !== "—"
                ? `${timer.clientName} - ${timer.projectName}`
                : timer.clientName}{" "}
              ({formatHMS(elapsedSeconds)})
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={openModal}
          aria-label="Time tracker"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/30 text-lg leading-none text-zinc-100 transition-colors hover:bg-zinc-900/50"
        >
          🕐
        </button>
      </div>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center p-4">
              <button
                type="button"
                className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm"
                aria-label="Close"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="timer-dialog-title"
                className="relative z-10 my-auto w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/95 p-5 shadow-2xl shadow-black/50"
              >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="timer-dialog-title" className="text-lg font-semibold text-white">
                Timer
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-zinc-700 bg-zinc-950/40 px-2 py-1 text-xs text-white hover:bg-zinc-950/60"
              >
                Close
              </button>
            </div>

            {timerError ? (
              <div className="mb-3 rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-200">
                {timerError === "already_running"
                  ? "A timer is already running."
                  : timerError === "missing_client"
                    ? "Select a client."
                    : timerError === "invalid_project"
                      ? "Invalid client or project."
                      : timerError === "save_failed"
                        ? "Could not start timer. Try again."
                        : timerError === "zero_duration"
                          ? "Duration too short."
                          : "Something went wrong."}
              </div>
            ) : null}

            {!timer ? (
              <form action={startActiveTimerAction} className="grid gap-3">
                <input type="hidden" name="return_to" value={returnTo} />
                <label className="space-y-1">
                  <span className="text-sm font-medium text-white">Client *</span>
                  <select
                    required
                    name="client_id"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="[color-scheme:dark] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                    disabled={!clients.length}
                  >
                    {clients.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-zinc-950 text-white"
                      >
                        {clientOptionLabel(c, clients)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-white">Project (optional)</span>
                  <select
                    name="project_id"
                    className="[color-scheme:dark] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                    defaultValue=""
                    key={clientId}
                  >
                    <option value="">No project</option>
                    {filteredProjects.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="bg-zinc-950 text-white"
                      >
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!filteredProjects.length ? (
                  <p className="text-xs text-zinc-400">
                    No projects for this client — you can still track time for the
                    client only.
                  </p>
                ) : null}
                <label className="space-y-1">
                  <span className="text-sm font-medium text-white">Notes (optional)</span>
                  <textarea
                    name="notes"
                    rows={3}
                    className="placeholder:text-zinc-400 [color-scheme:dark] w-full resize-none rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                    placeholder="What are you working on?"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!clients.length}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  Start timer
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-white">Client / project</div>
                  <div className="mt-1 text-base font-medium text-white">
                    {timer.projectName !== "—"
                      ? `${timer.clientName} — ${timer.projectName}`
                      : timer.clientName}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Elapsed</div>
                  <div className="mt-1 font-mono text-3xl font-semibold text-sky-300">
                    {formatHMS(elapsedSeconds)}
                  </div>
                </div>
                {timer.notes ? (
                  <div>
                    <div className="text-sm font-medium text-white">Notes</div>
                    <div className="mt-1 text-sm text-white">{timer.notes}</div>
                  </div>
                ) : null}
                <form action={stopActiveTimerAction}>
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950/50"
                  >
                    Stop timer
                  </button>
                </form>
              </div>
            )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
