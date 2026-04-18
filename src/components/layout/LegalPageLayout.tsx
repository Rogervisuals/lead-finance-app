import type { ReactNode } from "react";

/** Placeholder until you set a real contact address. */
export const LEGAL_CONTACT_EMAIL = "contact@example.com";

export function legalLastUpdatedLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function LegalEmailLink({ className }: { className?: string }) {
  return (
    <a
      href={`mailto:${LEGAL_CONTACT_EMAIL}`}
      className={
        className ??
        "font-medium text-sky-400 underline decoration-sky-400/40 underline-offset-2 transition-colors hover:text-sky-300 hover:decoration-sky-300/60"
      }
    >
      {LEGAL_CONTACT_EMAIL}
    </a>
  );
}

export function LegalPageLayout({
  title,
  lastUpdated,
  lastUpdatedIso,
  children,
}: {
  title: string;
  /** Human-readable date for display. */
  lastUpdated: string;
  /** ISO date (YYYY-MM-DD) for the `<time>` element. */
  lastUpdatedIso: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-[800px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <header className="border-b border-zinc-800 pb-8 sm:pb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-[2rem] sm:leading-tight">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          <span className="font-semibold text-zinc-200">Last updated:</span>{" "}
          <time dateTime={lastUpdatedIso} className="text-zinc-300">
            {lastUpdated}
          </time>
        </p>
      </header>
      <div className="mt-10 sm:mt-12">{children}</div>
    </article>
  );
}

/** Numbered major section (h2). */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-zinc-800/80 py-10 first:border-t-0 first:pt-0 sm:py-12">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-50 sm:text-xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-zinc-300 sm:text-base sm:leading-[1.7] [&_strong]:font-semibold [&_strong]:text-zinc-100">
        {children}
      </div>
    </section>
  );
}

/** Subsection title (h3), e.g. “3.1 Account Data”. */
export function LegalSubheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-8 text-base font-semibold tracking-tight text-zinc-100 sm:text-[1.05rem]">
      {children}
    </h3>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2.5 pl-5 marker:text-zinc-500 [&>li]:pl-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
