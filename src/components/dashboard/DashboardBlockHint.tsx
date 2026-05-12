"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

const HOVER_CLOSE_DELAY_MS = 160;

/**
 * Hint control: no panel in the DOM until opened (no ghost hover target).
 *
 * - **Hover** the icon (or focus it): panel opens; leaving icon + panel closes after a short delay
 *   unless **pinned**.
 * - **Primary click** on the icon: pins the panel so it stays open after the pointer leaves.
 * - **Click outside** the hint (or Escape): closes and unpins.
 *
 * Do not place this `button` inside an implicit `<label>` that also wraps other controls — label
 * clicks can focus the first labelable descendant (this button) and incorrectly open the hint.
 *
 * - `panelAlign="end"` (default): panel grows left from the icon.
 * - `panelAlign="start"`: panel grows right from the icon.
 */
export function DashboardBlockHint({
  children,
  ariaLabel = "About this metric",
  panelClassName,
  panelAlign = "end",
}: {
  children: ReactNode;
  ariaLabel?: string;
  panelClassName?: string;
  panelAlign?: "start" | "end";
}) {
  const panelWidth =
    panelClassName ?? "w-[min(18rem,calc(100vw-2.5rem))]";

  const positionClass = panelAlign === "start" ? "left-0" : "right-0";

  const [pinned, setPinned] = useState(false);
  const [hoverInside, setHoverInside] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const visible = pinned || hoverInside;

  const cancelClose = useCallback(() => {
    if (closeTimer.current != null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleHoverEnd = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setHoverInside(false);
    }, HOVER_CLOSE_DELAY_MS);
  }, [cancelClose]);

  const enterHint = useCallback(() => {
    cancelClose();
    setHoverInside(true);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  useEffect(() => {
    if (!visible) return;

    function onPointerDown(e: PointerEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (rootRef.current?.contains(t)) return;
      cancelClose();
      setPinned(false);
      setHoverInside(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cancelClose();
        setPinned(false);
        setHoverInside(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [visible, cancelClose]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={visible}
        aria-haspopup="true"
        aria-controls={visible ? tooltipId : undefined}
        className="relative z-10 flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950/40 text-zinc-500 outline-none transition-colors hover:border-zinc-700 hover:bg-zinc-950/60 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-sky-500/35"
        onPointerEnter={enterHint}
        onPointerLeave={scheduleHoverEnd}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          setPinned(true);
        }}
        onFocus={() => {
          enterHint();
        }}
        onBlur={(e) => {
          const next = e.relatedTarget;
          if (next instanceof Node && rootRef.current?.contains(next)) return;
          if (!pinned) {
            cancelClose();
            setHoverInside(false);
          }
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-4"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
          />
        </svg>
      </button>

      {visible ? (
        <div
          role="tooltip"
          id={tooltipId}
          className={`absolute ${positionClass} top-full z-50 -mt-px max-w-[calc(100vw-1.5rem)] rounded-lg border border-zinc-700/90 bg-zinc-950 px-3 py-2.5 text-left text-xs leading-relaxed text-zinc-300 shadow-xl ring-1 ring-black/20 transition-opacity duration-150 motion-reduce:transition-none ${panelWidth}`}
          onPointerEnter={enterHint}
          onPointerLeave={scheduleHoverEnd}
        >
          <div className="space-y-1.5 pt-0.5 [&_a]:text-sky-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-sky-300">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
