"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as
  | string
  | undefined;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as
  | string
  | undefined;

function assertEnv() {
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  if (!supabaseAnonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserSupabaseClient | null = null;
let inFlightSession: Promise<Awaited<ReturnType<BrowserSupabaseClient["auth"]["getSession"]>>> | null =
  null;
let inFlightUser: Promise<Awaited<ReturnType<BrowserSupabaseClient["auth"]["getUser"]>>> | null =
  null;

export function createSupabaseBrowserClient() {
  assertEnv();
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }
  return browserClient;
}

/**
 * Dedupe concurrent calls that would otherwise trigger parallel refresh attempts.
 * Safe: resolves to the underlying auth call result, with no behavior changes.
 */
export async function getBrowserSessionOnce() {
  const supabase = createSupabaseBrowserClient();
  if (!inFlightSession) {
    inFlightSession = supabase.auth
      .getSession()
      .finally(() => {
        inFlightSession = null;
      });
  }
  return inFlightSession;
}

export async function getBrowserUserOnce() {
  const supabase = createSupabaseBrowserClient();
  if (!inFlightUser) {
    inFlightUser = supabase.auth
      .getUser()
      .finally(() => {
        inFlightUser = null;
      });
  }
  return inFlightUser;
}

