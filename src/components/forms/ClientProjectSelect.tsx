"use client";

import { useMemo, useState } from "react";

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; client_id: string };

export function ClientProjectSelect({
  clients,
  projects,
  initialClientId,
  initialProjectId,
  clientLabel = "Client *",
  projectLabel = "Project (optional)",
}: {
  clients: ClientOption[];
  projects: ProjectOption[];
  initialClientId?: string;
  initialProjectId?: string | null;
  clientLabel?: string;
  projectLabel?: string;
}) {
  const defaultClientId = initialClientId ?? clients[0]?.id ?? "";
  const [clientId, setClientId] = useState(defaultClientId);

  const filteredProjects = useMemo(
    () => projects.filter((p) => p.client_id === clientId),
    [projects, clientId]
  );

  const safeInitialProjectId =
    initialProjectId &&
    filteredProjects.some((p) => p.id === initialProjectId)
      ? initialProjectId
      : "";

  return (
    <>
      <label className="min-w-0 space-y-1 sm:col-span-2">
        <span className="text-sm text-zinc-300">{clientLabel}</span>
        <select
          required
          name="client_id"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          disabled={!clients.length}
        >
          {clients.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-0 space-y-1">
        <span className="text-sm text-zinc-300">{projectLabel}</span>
        <select
          name="project_id"
          defaultValue={safeInitialProjectId}
          key={clientId} // reset selection on client change
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        >
          <option value="">No project</option>
          {filteredProjects.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

