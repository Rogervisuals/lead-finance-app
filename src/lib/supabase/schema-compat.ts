import type { SupabaseClient } from "@supabase/supabase-js";

/** Client row shape when company FK may or may not exist in DB */
export type ClientRowCompat = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  company_id?: string | null;
  created_at?: string;
};

/**
 * Load clients for the current user. If `company_id` is not in the schema yet,
 * falls back to a legacy select so the app still works before migrations.
 */
export async function selectClientsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ clients: ClientRowCompat[]; hasCompanyLink: boolean }> {
  const full = await supabase
    .from("clients")
    .select("id,name,email,company,notes,company_id,created_at")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (!full.error) {
    return {
      clients: (full.data ?? []) as ClientRowCompat[],
      hasCompanyLink: true,
    };
  }

  const legacy = await supabase
    .from("clients")
    .select("id,name,email,company,notes,created_at")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  return {
    clients: (legacy.data ?? []) as ClientRowCompat[],
    hasCompanyLink: false,
  };
}

export async function selectCompaniesForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; name: string }[]> {
  const res = await supabase
    .from("companies")
    .select("id,name")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (res.error) return [];
  return (res.data ?? []) as { id: string; name: string }[];
}

export async function selectClientByIdForUser(
  supabase: SupabaseClient,
  userId: string,
  clientId: string
): Promise<{ client: ClientRowCompat | null; hasCompanyLink: boolean }> {
  const full = await supabase
    .from("clients")
    .select("id,name,email,company,notes,company_id")
    .eq("id", clientId)
    .eq("user_id", userId)
    .maybeSingle();

  if (full.data) {
    return { client: full.data as ClientRowCompat, hasCompanyLink: true };
  }

  const legacy = await supabase
    .from("clients")
    .select("id,name,email,company,notes")
    .eq("id", clientId)
    .eq("user_id", userId)
    .maybeSingle();

  if (legacy.data) {
    return { client: legacy.data as ClientRowCompat, hasCompanyLink: false };
  }

  return { client: null, hasCompanyLink: false };
}
