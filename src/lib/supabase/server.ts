import { createServerClient, type CookieOptions } from "@supabase/ssr";
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
