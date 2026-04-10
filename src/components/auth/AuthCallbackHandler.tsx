"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function parseAuthParams(href: string) {
  const url = new URL(href);
  const hash = url.hash.replace(/^#/, "") || "";
  const hashParams = new URLSearchParams(hash);
  const search = url.searchParams;
  const get = (key: string) => search.get(key) ?? hashParams.get(key);
  return {
    type: get("type"),
    code: get("code"),
    tokenHash: get("token_hash") ?? get("token"),
    accessToken: get("access_token"),
    refreshToken: get("refresh_token"),
  };
}

function stripAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  const keys = [
    "code",
    "type",
    "token_hash",
    "token",
    "access_token",
    "refresh_token",
    "error",
    "error_code",
    "error_description",
  ];
  keys.forEach((k) => url.searchParams.delete(k));
  url.hash = "";
  const q = url.searchParams.toString();
  return `${url.pathname}${q ? `?${q}` : ""}`;
}

/**
 * Handles Supabase auth redirects (email change, PKCE code, implicit tokens) that
 * are not always applied by the client init alone (e.g. token_hash / email_change).
 */
export function AuthCallbackHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.getSession();

      const { type, code, tokenHash, accessToken, refreshToken } =
        parseAuthParams(window.location.href);

      const hasParams = Boolean(
        type || code || tokenHash || accessToken || refreshToken
      );
      if (!hasParams) return;

      if (pathname === "/reset-password" && type === "recovery") {
        return;
      }

      const lockKey = `supabase-auth-callback:${window.location.href}`;
      if (sessionStorage.getItem(lockKey)) return;
      sessionStorage.setItem(lockKey, "1");

      let handled = false;
      let redirectToProfile = false;

      if (type === "recovery") {
        sessionStorage.removeItem(lockKey);
        return;
      }

      if (accessToken && refreshToken && type === "email_change") {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          handled = true;
          redirectToProfile = true;
        }
      }

      if (!handled && tokenHash && type === "email_change") {
        const { error } = await supabase.auth.verifyOtp({
          type: "email_change",
          token_hash: tokenHash,
        });
        if (!error) {
          handled = true;
          redirectToProfile = true;
        }
      }

      if (!handled && code && type !== "recovery") {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          handled = true;
          redirectToProfile = type === "email_change";
        }
      }

      if (!handled && code && !type) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          handled = true;
        }
      }

      if (!handled) {
        sessionStorage.removeItem(lockKey);
        return;
      }

      ran.current = true;
      const cleanPath = stripAuthParamsFromUrl();
      window.history.replaceState({}, document.title, cleanPath);
      router.refresh();

      if (redirectToProfile) {
        router.replace("/profile");
      } else if (pathname === "/" || pathname === "/login") {
        router.replace("/dashboard");
      }
    })();
  }, [router, pathname]);

  return null;
}
