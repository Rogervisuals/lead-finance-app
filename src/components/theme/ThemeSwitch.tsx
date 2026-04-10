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

function getSnapshot(): ThemeMode {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function SunIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.93 19.07l1.41-1.41" />
      <path d="M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

export function ThemeSwitch({ serverTheme }: { serverTheme: ThemeMode }) {
  const getServerSnapshot = useCallback(() => serverTheme, [serverTheme]);
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useLayoutEffect(() => {
    syncThemeCookieToDocument();
  }, []);

  const isDark = mode === "dark";
  const toggle = useCallback(() => {
    applyThemeMode(isDark ? "light" : "dark");
  }, [isDark]);

  return (
    <button
      type="button"
      suppressHydrationWarning
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "relative inline-flex h-7 w-14 items-center rounded-full border",
        "transition-all duration-300",
        "focus:outline-none focus:ring-2 focus:ring-sky-500/50",
        isDark
          ? "border-zinc-700 bg-zinc-900/70"
          : "border-zinc-300 bg-white/70",
      ].join(" ")}
    >
      <span className="absolute left-2 text-amber-500/80">
        <SunIcon className="h-3.5 w-3.5" />
      </span>
      <span className="absolute right-2 text-indigo-300/80">
        <MoonIcon className="h-3.5 w-3.5" />
      </span>
      <span
        aria-hidden
        className={[
          "inline-block h-5 w-5 rounded-full bg-white shadow",
          "transition-all duration-300",
          isDark ? "translate-x-7 bg-zinc-100" : "translate-x-1 bg-white",
        ].join(" ")}
      />
    </button>
  );
}

