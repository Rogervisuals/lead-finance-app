/**
 * Single source of truth for theme persistence + inline head bootstrap.
 * Must stay in sync: localStorage key, cookie, class on <html>, data-theme attribute.
 */

export const THEME_STORAGE_KEY = "theme";

/** Readable on the server so RSC can match `useSyncExternalStore` getServerSnapshot to the client DOM. */
export const THEME_COOKIE_NAME = "theme";

export type ThemeMode = "light" | "dark";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // ~400d

function setThemeCookieClient(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.cookie = `${THEME_COOKIE_NAME}=${mode};path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax`;
}

/** Heals missing cookie after SPA navigations (bootstrap only runs on full page load). */
export function syncThemeCookieToDocument(): void {
  if (typeof document === "undefined") return;
  const mode: ThemeMode = document.documentElement.classList.contains("light")
    ? "light"
    : "dark";
  setThemeCookieClient(mode);
}

/** Dispatched when theme changes (same tab); useSyncExternalStore subscribes to this + `storage`. */
export const THEME_CHANGE_EVENT = "lead-finance-theme-change";

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Prevent UI flicker: disable transitions during the theme class swap.
  root.classList.add("theme-switching");
  if (mode === "light") {
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
  }
  // Force a reflow so the class takes effect immediately.
  void root.clientHeight;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  setThemeCookieClient(mode);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  window.setTimeout(() => {
    root.classList.remove("theme-switching");
  }, 80);
}

/** Runs synchronously before first paint — inline in root layout <head>. */
export function getThemeBootstrapInlineScript(): string {
  const k = THEME_STORAGE_KEY;
  const c = THEME_COOKIE_NAME;
  const maxAge = String(THEME_COOKIE_MAX_AGE);
  return `(function(){try{var t=localStorage.getItem("${k}");var m=t==="dark"?"dark":"light";if(m==="dark"){document.documentElement.classList.remove("light");document.documentElement.setAttribute("data-theme","dark");}else{document.documentElement.classList.add("light");document.documentElement.setAttribute("data-theme","light");}document.cookie="${c}="+m+";path=/;max-age=${maxAge};SameSite=Lax";}catch(e){document.documentElement.classList.add("light");document.documentElement.setAttribute("data-theme","light");document.cookie="${c}=light;path=/;max-age=${maxAge};SameSite=Lax";}})();`;
}
