import type {
  AssetFilter,
  PerformanceResponse,
  PositionsResponse,
  SchwabPerformanceResponse,
} from "./api";
import { money, pct, plClass } from "./format";

const OCC_OPTION = /^[A-Z]{1,6}\s*\d{6}[CP]\d{8}$/i;

export function isOptionSymbol(symbol: string): boolean {
  return OCC_OPTION.test(symbol.trim());
}

export function matchesAssetFilter(
  symbol: string,
  filter: AssetFilter
): boolean {
  if (filter === "all") return true;
  return isOptionSymbol(symbol) === (filter === "options");
}

export function filteredOpenPl(
  filter: AssetFilter,
  accountOpenPl: number | null | undefined,
  brokerPositions: PositionsResponse["brokerPositions"] | undefined
): number | null | undefined {
  if (filter === "all") return accountOpenPl;
  if (!brokerPositions) return undefined;
  return brokerPositions
    .filter((p) => matchesAssetFilter(p.symbol, filter))
    .reduce((sum, p) => sum + (p.openPl ?? 0), 0);
}

export function calendarYearEt(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
  }).format(new Date());
}

export function realizedYtdFromTrades(
  trades: Array<{ closeDate: string; gainLoss: number }>
): number {
  const year = calendarYearEt();
  return trades.reduce(
    (sum, trade) =>
      trade.closeDate.slice(0, 4) === year ? sum + trade.gainLoss : sum,
    0
  );
}

export function ytdTotal(
  realizedYtd: number | undefined,
  openPl: number | null | undefined
): number {
  return (realizedYtd ?? 0) + (openPl ?? 0);
}

export function ytdReturnPct(
  ytdPl: number,
  equity: number | null | undefined
): number | null {
  if (equity == null || Number.isNaN(equity)) return null;
  const startEquity = equity - ytdPl;
  if (startEquity === 0) return null;
  return ytdPl / startEquity;
}

export function formatYtd(
  realizedYtd: number | undefined,
  openPl: number | null | undefined,
  equity: number | null | undefined
): { pl: number; value: string; tone: "" | "pos" | "neg" } {
  const pl = ytdTotal(realizedYtd, openPl);
  const percent = ytdReturnPct(pl, equity);
  return {
    pl,
    value: `${money(pl)} · ${pct(percent)}`,
    tone: plClass(pl),
  };
}

export function isCashBookRow(row: {
  symbol: string;
  strategy: string | null;
  systemClassification?: string | null;
}): boolean {
  if (row.systemClassification?.trim().toLowerCase() === "cash") return true;
  if ((row.strategy || "").trim().toLowerCase() === "cash") return true;
  const symbol = row.symbol.trim().toUpperCase();
  return symbol.startsWith("TOTAL ");
}

type ClosedTrade = PerformanceResponse["recentClosed"][number];

const CLOSED_CSV_HEADERS = [
  "close_date",
  "symbol",
  "quantity",
  "cost",
  "proceeds",
  "gain_loss",
  "gain_loss_percent",
  "open_date",
] as const;

function csvCell(value: string | number): string {
  const raw = String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function closedTradesToCsv(trades: ClosedTrade[]): string {
  const rows = trades.map((t) =>
    [
      t.closeDate.slice(0, 10),
      t.symbol,
      t.quantity,
      t.cost,
      t.proceeds,
      t.gainLoss,
      t.gainLossPercent,
      t.openDate.slice(0, 10),
    ]
      .map(csvCell)
      .join(",")
  );
  return [CLOSED_CSV_HEADERS.join(","), ...rows].join("\n");
}

export function closedCsvFilename(
  mode: string,
  accountId: string,
  assetFilter: AssetFilter
): string {
  const suffix = assetFilter === "all" ? "" : `-${assetFilter}`;
  return `closes-${mode}-${accountId || "account"}${suffix}.csv`;
}

export function performanceForFilter<
  T extends PerformanceResponse | SchwabPerformanceResponse,
>(data: T, filter: AssetFilter): T {
  if (filter === "all") return data;

  const trades = data.recentClosed.filter((t) =>
    matchesAssetFilter(t.symbol, filter)
  );
  const sorted = trades
    .slice()
    .sort((a, b) => a.closeDate.localeCompare(b.closeDate));

  const monthlyMap = new Map<string, number>();
  let cumulative = 0;
  const cumulativeSeries: PerformanceResponse["cumulativeSeries"] = sorted.map(
    (trade) => {
      const month = trade.closeDate.slice(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + trade.gainLoss);
      cumulative += trade.gainLoss;
      return {
        date: trade.closeDate.slice(0, 10),
        cumulative,
        gainLoss: trade.gainLoss,
        symbol: trade.symbol,
        quantity: trade.quantity,
        cost: trade.cost,
        proceeds: trade.proceeds,
        gainLossPercent: trade.gainLossPercent,
        openDate: trade.openDate,
        closeDate: trade.closeDate,
      };
    }
  );

  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, gainLoss]) => ({ month, gainLoss }));
  const winners = sorted.filter((t) => t.gainLoss > 0).length;
  const losers = sorted.filter((t) => t.gainLoss < 0).length;

  return {
    ...data,
    totals: {
      realizedPl: cumulative,
      realizedYtd: realizedYtdFromTrades(sorted),
      tradeCount: sorted.length,
      winners,
      losers,
      winRate: sorted.length ? winners / sorted.length : 0,
    },
    monthly,
    cumulativeSeries,
    recentClosed: sorted.slice().reverse(),
  };
}
