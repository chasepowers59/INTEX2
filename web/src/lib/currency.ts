export const SITE_CURRENCY = "KRW";

export function formatSiteCurrency(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: SITE_CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

export function displayCurrencyCode(value: string | null | undefined) {
  if (!value || value === "PHP") return SITE_CURRENCY;
  return value;
}
