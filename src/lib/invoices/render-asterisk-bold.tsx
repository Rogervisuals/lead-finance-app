import type { ReactNode } from "react";

/** Renders *segments* as <strong>; unmatched * stay as text. */
export function renderAsteriskBold(text: string, keyPrefix = "t"): ReactNode[] {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</strong>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}
