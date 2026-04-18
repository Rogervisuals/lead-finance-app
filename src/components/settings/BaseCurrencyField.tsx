"use client";

import { useCallback, useEffect, useId, useState } from "react";

type Props = {
  initialCurrency: string;
  options: readonly string[];
  label: string;
  hint: string;
  warningTitle: string;
  warningBody: string;
  warningSubtext: string;
  confirmTitle: string;
  confirmBody: string;
  confirmCancel: string;
  confirmContinue: string;
  inputClass: string;
  labelClass: string;
  hintClass: string;
};

export function BaseCurrencyField({
  initialCurrency,
  options,
  label,
  hint,
  warningTitle,
  warningBody,
  warningSubtext,
  confirmTitle,
  confirmBody,
  confirmCancel,
  confirmContinue,
  inputClass,
  labelClass,
  hintClass,
}: Props) {
  const selectId = useId();
  const cardTitleId = useId();
  const modalHeadingId = useId();
  const [currency, setCurrency] = useState(initialCurrency);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);

  useEffect(() => {
    setCurrency(initialCurrency);
  }, [initialCurrency]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setPendingCurrency(null);
  }, []);

  const confirmChange = useCallback(() => {
    if (pendingCurrency != null) {
      setCurrency(pendingCurrency);
    }
    setModalOpen(false);
    setPendingCurrency(null);
  }, [pendingCurrency]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  return (
    <div className="block">
      <label htmlFor={selectId} className={labelClass}>
        {label}
      </label>
      <select
        id={selectId}
        name="base_currency"
        value={currency}
        onChange={(e) => {
          const next = e.target.value;
          if (next === currency) return;
          setPendingCurrency(next);
          setModalOpen(true);
        }}
        className={`${inputClass} mt-2`}
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <span className={hintClass}>{hint}</span>

      <div
        className="mt-4 rounded-xl border border-amber-600/35 bg-gradient-to-br from-amber-950/70 via-orange-950/55 to-amber-950/50 p-4 shadow-sm ring-1 ring-amber-800/30"
        role="note"
        aria-labelledby={cardTitleId}
      >
        <div className="flex gap-3">
          <span className="select-none text-xl leading-none" aria-hidden>
            ⚠️
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p id={cardTitleId} className="text-base font-semibold text-zinc-50">
              {warningTitle}
            </p>
            <p className="text-sm font-medium leading-relaxed text-amber-100">{warningBody}</p>
            <p className="text-xs leading-relaxed text-amber-200/75">{warningSubtext}</p>
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalHeadingId}
            className="relative z-10 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl ring-1 ring-black/40"
          >
            <h2 id={modalHeadingId} className="text-lg font-semibold text-zinc-100">
              {confirmTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{confirmBody}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-zinc-600 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                {confirmCancel}
              </button>
              <button
                type="button"
                onClick={confirmChange}
                className="rounded-lg border border-amber-700/80 bg-amber-950/80 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-900/80"
              >
                {confirmContinue}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
