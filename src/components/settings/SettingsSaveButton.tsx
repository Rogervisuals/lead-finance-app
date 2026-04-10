"use client";

import { useI18n } from "@/contexts/I18nContext";

/**
 * Submit control associated with a form via the `form` attribute (may sit outside the &lt;form&gt;).
 */
export function SettingsSaveButton({
  formId,
  label,
}: {
  formId: string;
  /** When omitted, uses locale string from I18nProvider. */
  label?: string;
}) {
  const ui = useI18n();
  const text = label ?? ui.components.saveChanges;
  return (
    <button
      type="submit"
      form={formId}
      className="inline-flex min-w-[140px] items-center justify-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
    >
      {text}
    </button>
  );
}
