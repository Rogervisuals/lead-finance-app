import { DEFAULT_VAT_RATE } from "./format";

export function getVatBreakdown(
  incomeInclVat: number,
  vatEnabled: boolean,
  vatRate: number = DEFAULT_VAT_RATE
) {
  const gross = Number.isFinite(incomeInclVat) ? incomeInclVat : 0;

  if (!vatEnabled) {
    return {
      incomeInclVat: gross,
      netIncome: gross,
      vatAmount: 0,
      vatRate,
    };
  }

  const netIncome = gross / (1 + vatRate);
  const vatAmount = gross - netIncome;

  return {
    incomeInclVat: gross,
    netIncome,
    vatAmount,
    vatRate,
  };
}

