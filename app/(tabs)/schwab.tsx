import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, Text, View } from "react-native";
import type { PerformanceResponse, PositionsResponse } from "../../src/api";
import { fetchSchwabAuthUrl } from "../../src/api";
import {
  BrokerPositionCard,
  ClosedTradeCard,
} from "../../src/components/DataCard";
import { CumulativeChart } from "../../src/components/CumulativeChart";
import { MetricCard, MetricGrid } from "../../src/components/MetricCard";
import { MonthlyBars } from "../../src/components/MonthlyBars";
import { Panel } from "../../src/components/Panel";
import { PressableScale } from "../../src/components/PressableScale";
import { ListScreen } from "../../src/components/Screen";
import { ShareCsvButton } from "../../src/components/ShareCsvButton";
import { StatusDot } from "../../src/components/StatusDot";
import {
  ErrorText,
  Muted,
  ScreenHeader,
} from "../../src/components/Typography";
import {
  calendarYearEt,
  filteredOpenPl,
  formatYtd,
  matchesAssetFilter,
  realizedYtdFromTrades,
} from "../../src/desk";
import { money, pct, plClass } from "../../src/format";
import { useDeskQueries, useInvalidateDesk } from "../../src/hooks";
import { colors, fonts, radius, space } from "../../src/theme";

type Broker = PositionsResponse["brokerPositions"][number];
type Trade = PerformanceResponse["recentClosed"][number];
type Row =
  | { kind: "head"; id: string; title: string; meta: string }
  | { kind: "empty"; id: string; message: string }
  | { kind: "broker"; id: string; payload: Broker }
  | { kind: "trade"; id: string; payload: Trade };

export default function SchwabScreen() {
  const {
    schwabPositionsQ,
    schwabPerfQ,
    assetFilter,
    filteredSchwabPerformance,
  } = useDeskQueries();
  const invalidateAll = useInvalidateDesk();
  const positions = schwabPositionsQ.data;
  const performance = filteredSchwabPerformance;
  const connected = Boolean(positions?.connected);
  const brokerPositions = (positions?.brokerPositions ?? []).filter((p) =>
    matchesAssetFilter(p.symbol, assetFilter)
  );
  const openPl = filteredOpenPl(
    assetFilter,
    positions?.balances.openPl,
    positions?.brokerPositions
  );
  const ytd = formatYtd(
    performance?.totals.realizedYtd ??
      (performance ? realizedYtdFromTrades(performance.recentClosed) : 0),
    openPl,
    positions?.balances.totalEquity
  );
  const historyFrom = schwabPerfQ.data?.historyFrom?.slice(0, 10);
  const historyTo = schwabPerfQ.data?.historyTo?.slice(0, 10);

  const authorizeMut = useMutation({
    mutationFn: fetchSchwabAuthUrl,
    onSuccess: async (data) => {
      await WebBrowser.openBrowserAsync(data.url);
      invalidateAll();
    },
  });

  const onRefresh = () => {
    void schwabPositionsQ.refetch();
    void schwabPerfQ.refetch();
  };

  const refreshing =
    schwabPositionsQ.isRefetching || schwabPerfQ.isRefetching;
  const loadError =
    (schwabPositionsQ.error as Error | null)?.message ||
    (schwabPerfQ.error as Error | null)?.message;

  if (schwabPositionsQ.isError && !positions) {
    return (
      <ListScreen
        data={[]}
        keyExtractor={() => "err"}
        renderItem={() => null}
        onRefresh={onRefresh}
        refreshing={refreshing}
        header={<ErrorText>{loadError}</ErrorText>}
      />
    );
  }

  if (schwabPositionsQ.isLoading && !positions) {
    return (
      <ListScreen
        data={[]}
        keyExtractor={() => "load"}
        renderItem={() => null}
        onRefresh={onRefresh}
        refreshing
        header={<Muted>Loading Schwab…</Muted>}
      />
    );
  }

  const statusLabel = connected
    ? "Schwab connected"
    : positions?.configured
      ? "Schwab disconnected"
      : "Schwab not configured";

  const trades = performance?.recentClosed ?? [];
  const rows: Row[] = connected
    ? [
        {
          kind: "head",
          id: "head-broker",
          title: "Broker positions",
          meta: `${brokerPositions.length} symbols`,
        },
        ...(brokerPositions.length === 0
          ? [
              {
                kind: "empty" as const,
                id: "empty-broker",
                message:
                  assetFilter === "all"
                    ? "No open Schwab positions (cash)."
                    : `No open Schwab ${assetFilter} positions.`,
              },
            ]
          : brokerPositions.map((p) => ({
              kind: "broker" as const,
              id: `b-${p.symbol}`,
              payload: p,
            }))),
        {
          kind: "head",
          id: "head-closes",
          title: `Last ${trades.length} closes`,
          meta: "",
        },
        ...(trades.length === 0
          ? [
              {
                kind: "empty" as const,
                id: "empty-closes",
                message: "No closed trades yet.",
              },
            ]
          : trades.map((t, i) => ({
              kind: "trade" as const,
              id: `t-${t.symbol}-${t.closeDate}-${i}`,
              payload: t,
            }))),
      ]
    : [];

  return (
    <ListScreen
      data={rows}
      keyExtractor={(item) => item.id}
      onRefresh={onRefresh}
      refreshing={refreshing}
      header={
        <View style={{ gap: space[16], marginBottom: space[8] }}>
          <ScreenHeader kicker="Charles Schwab · read-only" title="Schwab">
            Separate strategy book
            {positions?.accountId ? ` · ${positions.accountId}` : ""}
            {historyFrom && historyTo
              ? ` · realized window ${historyFrom} → ${historyTo}`
              : ""}
          </ScreenHeader>

          <View style={styles.statusRow}>
            <StatusDot ok={connected} label={statusLabel} />
            {positions?.needsReauth ? (
              <StatusDot tone="warn" label="Re-authorize" />
            ) : null}
            <PressableScale
              onPress={() => authorizeMut.mutate()}
              disabled={
                authorizeMut.isPending || positions?.configured === false
              }
              style={styles.authBtn}
            >
              <Text style={styles.authLabel}>
                {authorizeMut.isPending
                  ? "Opening Schwab…"
                  : "Authorize Schwab"}
              </Text>
            </PressableScale>
          </View>

          {loadError ? <ErrorText>{loadError}</ErrorText> : null}
          {authorizeMut.isError ? (
            <ErrorText>{(authorizeMut.error as Error).message}</ErrorText>
          ) : null}
          {positions && !connected ? (
            <Muted>
              {positions.message ||
                "Set SCHWAB_APP_KEY, SCHWAB_APP_SECRET, and SCHWAB_CALLBACK_URL, then authorize."}
            </Muted>
          ) : null}

          {connected ? (
            <>
              <MetricGrid>
                <MetricCard
                  label="Equity"
                  value={money(positions?.balances.totalEquity)}
                />
                <MetricCard
                  label="Cash"
                  value={money(positions?.balances.totalCash)}
                />
                <MetricCard
                  label="Open P&L"
                  value={money(openPl)}
                  tone={plClass(openPl)}
                />
                <MetricCard
                  label="Realized P&L"
                  value={money(performance?.totals.realizedPl)}
                  tone={plClass(performance?.totals.realizedPl)}
                />
                <MetricCard
                  label={`YTD P&L · ${calendarYearEt()}`}
                  value={ytd.value}
                  tone={ytd.tone}
                />
                <MetricCard
                  label="Win rate"
                  value={pct(performance?.totals.winRate)}
                />
              </MetricGrid>
              {performance ? (
                <>
                  <Panel
                    title="Closes"
                    meta={
                      <ShareCsvButton
                        trades={trades}
                        mode="schwab"
                        accountId={performance.accountId}
                        assetFilter={assetFilter}
                      />
                    }
                  >
                    <Muted>Share CSV, or scroll the blotter below.</Muted>
                  </Panel>
                  <Panel title="Cumulative">
                    {performance.cumulativeSeries.length > 0 ? (
                      <CumulativeChart series={performance.cumulativeSeries} />
                    ) : (
                      <Muted>No closed trades yet.</Muted>
                    )}
                  </Panel>
                  <Panel title="Monthly P&L">
                    {performance.monthly.length > 0 ? (
                      <MonthlyBars monthly={performance.monthly} />
                    ) : (
                      <Muted>No monthly P&L yet.</Muted>
                    )}
                  </Panel>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        if (item.kind === "head") {
          return (
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              {item.meta ? <Muted>{item.meta}</Muted> : null}
            </View>
          );
        }
        if (item.kind === "empty") {
          return (
            <View style={styles.empty}>
              <Muted>{item.message}</Muted>
            </View>
          );
        }
        if (item.kind === "broker") {
          return <BrokerPositionCard position={item.payload} />;
        }
        return <ClosedTradeCard trade={item.payload} />;
      }}
    />
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space[8],
  },
  authBtn: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    borderRadius: radius.sm,
    paddingHorizontal: space[12],
    paddingVertical: space[8],
  },
  authLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.ink,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: space[20],
    paddingBottom: space[8],
  },
  sectionTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.ink,
  },
  empty: {
    paddingVertical: space[12],
  },
});
