"use client";

import type { FullUi } from "@/lib/i18n/get-ui";

const linkClass =
  "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200";

export function Footer({ footer }: { footer: FullUi["footer"] }) {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-center text-xs text-gray-500 dark:text-gray-400 md:flex-row md:items-center md:justify-between md:text-left">
        <div>{footer.rights}</div>

        <nav className="flex flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1 md:justify-end">
          <a href="mailto:business@rogervisuals.com" className={linkClass}>
            {footer.contact}
          </a>
          <a
            href="/privacy"
            className={linkClass}
            target="_blank"
            rel="noopener noreferrer"
          >
            {footer.privacy}
          </a>
          <a
            href="/terms"
            className={linkClass}
            target="_blank"
            rel="noopener noreferrer"
          >
            {footer.terms}
          </a>
        </nav>
      </div>
    </footer>
  );
}

