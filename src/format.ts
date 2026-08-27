export function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function plClass(n: number | null | undefined): "" | "pos" | "neg" {
  if (n == null || n === 0) return "";
  return n > 0 ? "pos" : "neg";
}

export function ownershipPlPercent(
  ownershipPrice: number | null | undefined,
  marketPrice: number | null | undefined
): number | null {
  if (
    ownershipPrice == null ||
    marketPrice == null ||
    !(ownershipPrice > 0) ||
    Number.isNaN(marketPrice)
  ) {
    return null;
  }
  return ((marketPrice - ownershipPrice) / ownershipPrice) * 100;
}
