import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as
  | string
  | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as
  | string
  | undefined;

function assertEnv() {
  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in environment.");
  }
  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  }
}

/**
 * Server Components, `getUserOrNull`, and route handlers.
 * `setAll` must exist for @supabase/ssr; in RSC-only contexts it may not be able
 * to write cookies (caught) — session refresh is handled in `middleware.ts`.
 */
export function createSupabaseServerClient() {
  assertEnv();
  const cookieStore = cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () =>
        cookieStore.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
      setAll: (
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component: cookie writes are not allowed; middleware refreshes session.
        }
      },
    },
  });
}

/**
 * Server Actions — cookie store is mutable; writes must succeed for auth refresh.
 */
export function createSupabaseServerActionClient() {
  assertEnv();
  const cookieStore = cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () =>
        cookieStore.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
      setAll: (
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

export async function getUserOrNull() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/**
 * Server-only: bypasses RLS. Use for trusted server tasks with no user session
 * (e.g. Stripe webhooks). Requires `SUPABASE_SERVICE_ROLE_KEY` in env.
 */
export function createSupabaseServiceRoleClient() {
  assertEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY (required for Stripe webhooks and other server-to-server updates)."
    );
  }
  return createClient(supabaseUrl!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
