import { StyleSheet, Text, View } from "react-native";
import { ActionBar } from "../../src/components/ActionBar";
import { CumulativeChart } from "../../src/components/CumulativeChart";
import { MetricCard, MetricGrid } from "../../src/components/MetricCard";
import { Panel } from "../../src/components/Panel";
import { Screen } from "../../src/components/Screen";
import { ShareCsvButton } from "../../src/components/ShareCsvButton";
import { StatusDot } from "../../src/components/StatusDot";
import { ErrorText, Muted } from "../../src/components/Typography";
import {
  calendarYearEt,
  filteredOpenPl,
  formatYtd,
  realizedYtdFromTrades,
  ytdReturnPct,
} from "../../src/desk";
import { money, pct, plClass } from "../../src/format";
import { useDeskQueries } from "../../src/hooks";
import { colors, fonts, space } from "../../src/theme";

export default function OverviewScreen() {
  const {
    statusQ,
    ordersQ,
    positionsQ,
    perfQ,
    schwabPositionsQ,
    schwabPerfQ,
    assetFilter,
    filteredPerformance,
    filteredSchwabPerformance,
    filteredOrders,
  } = useDeskQueries();
  const status = statusQ.data;
  const positions = positionsQ.data;
  const performance = filteredPerformance;
  const schwabPositions = schwabPositionsQ.data;
  const schwabPerformance = filteredSchwabPerformance;
  const refreshing =
    statusQ.isRefetching ||
    ordersQ.isRefetching ||
    positionsQ.isRefetching ||
    perfQ.isRefetching ||
    schwabPositionsQ.isRefetching ||
    schwabPerfQ.isRefetching;

  const onRefresh = () => {
    void statusQ.refetch();
    void ordersQ.refetch();
    void positionsQ.refetch();
    void perfQ.refetch();
    void schwabPositionsQ.refetch();
    void schwabPerfQ.refetch();
  };

  if (statusQ.isError) {
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <ErrorText>{(statusQ.error as Error).message}</ErrorText>
      </Screen>
    );
  }

  if (!status) {
    return (
      <Screen onRefresh={onRefresh} refreshing>
        <Muted>Loading overview…</Muted>
      </Screen>
    );
  }

  const equity = positions?.balances.totalEquity ?? status.tradier.totalEquity;
  const openPl = filteredOpenPl(
    assetFilter,
    positions?.balances.openPl,
    positions?.brokerPositions
  );
  const realized = performance?.totals.realizedPl;
  const mode = status.tradingMode || status.tradier.mode || "—";
  const tradierYtd = formatYtd(
    performance?.totals.realizedYtd ??
      (performance ? realizedYtdFromTrades(performance.recentClosed) : 0),
    openPl,
    equity
  );
  const schwabOpenPl = filteredOpenPl(
    assetFilter,
    schwabPositions?.balances.openPl,
    schwabPositions?.brokerPositions
  );
  const schwabEquity = schwabPositions?.balances.totalEquity;
  const schwabRealized = schwabPerformance?.totals.realizedPl;
  const combinedEquity =
    equity != null || schwabEquity != null
      ? (equity ?? 0) + (schwabEquity ?? 0)
      : null;
  const combinedOpen =
    openPl != null || schwabOpenPl != null
      ? (openPl ?? 0) + (schwabOpenPl ?? 0)
      : null;
  const combinedRealized =
    realized != null || schwabRealized != null
      ? (realized ?? 0) + (schwabRealized ?? 0)
      : null;
  const schwabYtd = formatYtd(
    schwabPerformance?.totals.realizedYtd ??
      (schwabPerformance
        ? realizedYtdFromTrades(schwabPerformance.recentClosed)
        : 0),
    schwabOpenPl,
    schwabEquity
  );
  const combinedYtdPl =
    tradierYtd.pl + (schwabPositions?.connected ? schwabYtd.pl : 0);
  const combinedYtd = {
    value: `${money(combinedYtdPl)} · ${pct(ytdReturnPct(combinedYtdPl, combinedEquity))}`,
    tone: plClass(combinedYtdPl),
  };
  const schwabLabel = status.schwab?.needsReauth
    ? "Schwab · re-auth"
    : status.schwab?.configured
      ? "Schwab"
      : "Schwab · off";

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View>
        <Text style={styles.kicker}>
          {mode} · {status.tradier.accountId || "—"}
          {status.signalSigma.portfolio
            ? ` · ${status.signalSigma.portfolio.title}`
            : ""}
        </Text>
        <Text style={styles.equity}>{money(equity)}</Text>
        <Text style={styles.equityLabel}>equity</Text>
      </View>

      <View style={styles.ticker}>
        <Ticker label="Open P&L" value={money(openPl)} tone={plClass(openPl)} />
        <Ticker
          label="Realized"
          value={money(realized)}
          tone={plClass(realized)}
        />
        <Ticker
          label={`YTD · ${calendarYearEt()}`}
          value={tradierYtd.value}
          tone={tradierYtd.tone}
        />
        <Ticker label="Orders" value={String(filteredOrders.length)} />
      </View>

      <View style={styles.stats}>
        <StatusDot ok={status.signalSigma.ok} label="Signal Sigma" />
        <StatusDot ok={status.tradier.ok} label="Tradier" />
        <StatusDot
          ok={Boolean(status.schwab?.ok)}
          tone={status.schwab?.needsReauth ? "warn" : undefined}
          label={schwabLabel}
        />
      </View>

      <ActionBar />

      {schwabPositions?.connected ? (
        <Panel title="Combined · Tradier + Schwab" meta="two strategies">
          <MetricGrid>
            <MetricCard label="Combined equity" value={money(combinedEquity)} />
            <MetricCard
              label="Combined open P&L"
              value={money(combinedOpen)}
              tone={plClass(combinedOpen)}
            />
            <MetricCard
              label="Combined realized"
              value={money(combinedRealized)}
              tone={plClass(combinedRealized)}
            />
            <MetricCard
              label={`Combined YTD · ${calendarYearEt()}`}
              value={combinedYtd.value}
              tone={combinedYtd.tone}
            />
          </MetricGrid>
        </Panel>
      ) : null}

      {performance && performance.cumulativeSeries.length > 0 && (
        <Panel
          title="Cumulative realized"
          meta={`${performance.totals.tradeCount} closes · win ${pct(performance.totals.winRate)}`}
        >
          <CumulativeChart series={performance.cumulativeSeries} />
        </Panel>
      )}

      {performance && performance.recentClosed.length > 0 && (
        <Panel
          title={`Last ${performance.recentClosed.length} closes`}
          meta={
            <ShareCsvButton
              trades={performance.recentClosed}
              mode={performance.mode}
              accountId={performance.accountId}
              assetFilter={assetFilter}
            />
          }
        >
          <Muted>Share the filtered close blotter as CSV.</Muted>
        </Panel>
      )}

      {status.job && (
        <Panel
          title={`Last job · ${status.job.kind}`}
          meta={
            <StatusDot
              tone={
                status.job.status === "success"
                  ? "ok"
                  : status.job.status === "error"
                    ? "warn"
                    : "off"
              }
              label={status.job.status}
            />
          }
        >
          <Muted>
            {status.job.message || "—"}
            {status.job.result
              ? ` · placed ${status.job.result.placedCount ?? 0} · confirmed ${status.job.result.confirmedCount ?? 0} · skipped ${status.job.result.skippedCount ?? 0}`
              : ""}
          </Muted>
        </Panel>
      )}
    </Screen>
  );
}

function Ticker({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "";
}) {
  return (
    <View style={styles.tick}>
      <Text style={styles.tickLabel}>{label}</Text>
      <Text
        style={[
          styles.tickValue,
          tone === "pos" && styles.pos,
          tone === "neg" && styles.neg,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  equity: {
    fontFamily: fonts.monoSemi,
    fontSize: 36,
    color: colors.ink,
    marginTop: space[8],
    letterSpacing: -0.6,
  },
  equityLabel: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.faint,
    marginTop: space[4],
  },
  ticker: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
  },
  tick: {
    width: "50%",
    paddingVertical: space[12],
    paddingRight: space[8],
  },
  tickLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: space[4],
  },
  tickValue: {
    fontFamily: fonts.monoMedium,
    fontSize: 14,
    color: colors.ink,
  },
  pos: { color: colors.positive },
  neg: { color: colors.negative },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[8],
    alignItems: "center",
  },
});
