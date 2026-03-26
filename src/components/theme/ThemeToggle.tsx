"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import {
  THEME_CHANGE_EVENT,
  applyThemeMode,
  syncThemeCookieToDocument,
  type ThemeMode,
} from "@/lib/theme";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const run = () => onStoreChange();
  window.addEventListener(THEME_CHANGE_EVENT, run);
  window.addEventListener("storage", run);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, run);
    window.removeEventListener("storage", run);
  };
}

/** Reads live theme from <html> (set by head bootstrap before paint). */
function getSnapshot(): ThemeMode {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

/**
 * `serverTheme` must match the real theme on <html> (mirrored in `theme` cookie + localStorage).
 * If it always defaulted to "light", RSC re-renders briefly used the wrong snapshot and label
 * colors (e.g. text-zinc-200 vs html.light overrides) flickered when changing dashboard ?range=.
 */
export function ThemeToggle({ serverTheme }: { serverTheme: ThemeMode }) {
  const getServerSnapshot = useCallback(() => serverTheme, [serverTheme]);
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useLayoutEffect(() => {
    syncThemeCookieToDocument();
  }, []);

  const toggle = useCallback(() => {
    applyThemeMode(mode === "light" ? "dark" : "light");
  }, [mode]);

  const isLight = mode === "light";

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={toggle}
      className="shrink-0 rounded-md border border-zinc-800 bg-zinc-900/30 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-900/50 hover:text-white"
      aria-pressed={isLight}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Dark theme" : "Light theme"}
    >
      {isLight ? "Dark" : "Light"}
    </button>
  );
}
