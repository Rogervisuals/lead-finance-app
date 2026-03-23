import { createServerClient } from "@supabase/ssr";
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

export function createSupabaseServerClient() {
  // Server Components: MUST NOT set cookies (Next.js restriction).
  // Cookie writes are handled in `middleware.ts`.
  assertEnv();

  const cookieStore = cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () =>
        cookieStore.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
    },
  });
}

export function createSupabaseServerActionClient() {
  // Server Actions: allowed to set cookies.
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
          options: Record<string, unknown>;
        }>,
      ) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          (cookieStore as any).set({ name, value, ...options });
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

