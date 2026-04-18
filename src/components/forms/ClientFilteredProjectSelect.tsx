"use client";

import { useEffect, useMemo, useState } from "react";

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; client_id: string };

export function ClientFilteredProjectSelect({
  clients,
  projects,
  initialClientId,
  initialProjectId,
  clientLabel = "Client (filter)",
  projectLabel = "Project (optional)",
  allClientsLabel = "All clients",
  noProjectLabel = "No project",
}: {
  clients: ClientOption[];
  projects: ProjectOption[];
  initialClientId?: string;
  initialProjectId?: string | null;
  clientLabel?: string;
  projectLabel?: string;
  allClientsLabel?: string;
  noProjectLabel?: string;
}) {
  const [clientId, setClientId] = useState<string>(initialClientId ?? "");
  const [projectId, setProjectId] = useState<string>(initialProjectId ?? "");

  const filteredProjects = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((p) => p.client_id === clientId);
  }, [projects, clientId]);

  useEffect(() => {
    if (!projectId) return;
    if (clientId && !filteredProjects.some((p) => p.id === projectId)) {
      setProjectId("");
    }
  }, [clientId, filteredProjects, projectId]);

  return (
    <>
      <label className="min-w-0 space-y-1">
        <span className="text-sm text-zinc-300">{clientLabel}</span>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
          disabled={!clients.length}
        >
          <option value="">{allClientsLabel}</option>
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
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
        >
          <option value="">{noProjectLabel}</option>
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

