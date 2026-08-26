import { StyleSheet, Text, View } from "react-native";
import type { PositionsResponse } from "../../src/api";
import { DataCard, MetaLine, BrokerPositionCard } from "../../src/components/DataCard";
import { MetricCard, MetricGrid } from "../../src/components/MetricCard";
import { ListScreen } from "../../src/components/Screen";
import {
  ErrorText,
  Muted,
  ScreenHeader,
} from "../../src/components/Typography";
import {
  filteredOpenPl,
  isCashBookRow,
  matchesAssetFilter,
} from "../../src/desk";
import { money, plClass } from "../../src/format";
import { useDeskQueries } from "../../src/hooks";
import { colors, fonts, space } from "../../src/theme";

type Broker = PositionsResponse["brokerPositions"][number];
type Signal = PositionsResponse["signalPositions"][number];
type Row =
  | { kind: "head"; id: string; title: string; meta: string }
  | { kind: "empty"; id: string; message: string }
  | { kind: "broker"; id: string; payload: Broker }
  | { kind: "signal"; id: string; payload: Signal; cash?: boolean };

export default function PositionsScreen() {
  const { positionsQ, assetFilter } = useDeskQueries();
  const data = positionsQ.data;

  const onRefresh = () => {
    void positionsQ.refetch();
  };

  if (positionsQ.isError) {
    return (
      <ListScreen
        data={[]}
        keyExtractor={() => "err"}
        renderItem={() => null}
        onRefresh={onRefresh}
        refreshing={positionsQ.isRefetching}
        header={<ErrorText>{(positionsQ.error as Error).message}</ErrorText>}
      />
    );
  }

  if (!data) {
    return (
      <ListScreen
        data={[]}
        keyExtractor={() => "load"}
        renderItem={() => null}
        onRefresh={onRefresh}
        refreshing
        header={<Muted>Loading positions…</Muted>}
      />
    );
  }

  const brokerPositions = data.brokerPositions.filter((p) =>
    matchesAssetFilter(p.symbol, assetFilter)
  );
  const holdings = data.signalPositions
    .filter((t) => !isCashBookRow(t))
    .filter((t) => matchesAssetFilter(t.symbol, assetFilter));
  const cashRows =
    assetFilter === "all"
      ? data.signalPositions.filter((t) => isCashBookRow(t))
      : [];
  const marketValue =
    assetFilter === "all"
      ? data.balances.marketValue
      : brokerPositions.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
  const openPl = filteredOpenPl(
    assetFilter,
    data.balances.openPl,
    data.brokerPositions
  );
  const signalValue =
    assetFilter === "all"
      ? data.signalPortfolioValue
      : holdings.reduce((sum, t) => sum + (t.value || 0), 0);

  const rows: Row[] = [
    {
      kind: "head",
      id: "head-broker",
      title: "Broker",
      meta: `${brokerPositions.length} symbols`,
    },
    ...(brokerPositions.length === 0
      ? [
          {
            kind: "empty" as const,
            id: "empty-broker",
            message:
              assetFilter === "all"
                ? "No open broker positions (cash)."
                : `No open ${assetFilter} positions.`,
          },
        ]
      : brokerPositions.map((p) => ({
          kind: "broker" as const,
          id: `b-${p.symbol}`,
          payload: p,
        }))),
    {
      kind: "head",
      id: "head-signal",
      title: "Signal Sigma book",
      meta: `${holdings.length} · ${money(signalValue)} · ${data.pendingOrderCount} pending`,
    },
    ...(holdings.length === 0
      ? [
          {
            kind: "empty" as const,
            id: "empty-signal",
            message:
              assetFilter === "all"
                ? "No Signal Sigma positions."
                : `No ${assetFilter} in the Signal Sigma book.`,
          },
        ]
      : holdings.map((t) => ({
          kind: "signal" as const,
          id: `s-${t.symbol}`,
          payload: t,
        }))),
    ...cashRows.map((t) => ({
      kind: "signal" as const,
      id: `c-${t.symbol}`,
      payload: t,
      cash: true,
    })),
  ];

  return (
    <ListScreen
      data={rows}
      keyExtractor={(item) => item.id}
      onRefresh={onRefresh}
      refreshing={positionsQ.isRefetching}
      header={
        <View style={{ gap: space[16], marginBottom: space[8] }}>
          <ScreenHeader kicker="Broker · Signal Sigma" title="Positions">
            {data.mode} · {data.accountId}
          </ScreenHeader>
          <MetricGrid>
            <MetricCard
              label="Equity"
              value={money(data.balances.totalEquity)}
            />
            <MetricCard label="Cash" value={money(data.balances.totalCash)} />
            <MetricCard label="Market value" value={money(marketValue)} />
            <MetricCard
              label="Open P&L"
              value={money(openPl)}
              tone={plClass(openPl)}
            />
          </MetricGrid>
        </View>
      }
      renderItem={({ item }) => {
        if (item.kind === "head") {
          return (
            <View style={styles.head}>
              <Text style={styles.headTitle}>{item.title}</Text>
              <Muted>{item.meta}</Muted>
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
        const t = item.payload;
        return (
          <DataCard
            title={t.symbol}
            right={
              <Muted>
                {item.cash
                  ? "Cash"
                  : `${t.percent?.toFixed?.(1) ?? t.percent}%`}
              </Muted>
            }
          >
            <MetaLine>
              {t.strategy || (item.cash ? "Cash" : "—")} · {t.amount} /{" "}
              {t.targetAmount} sh
            </MetaLine>
            <MetaLine>
              Own {money(t.ownershipPrice)} · Last {money(t.lastPrice)} ·{" "}
              {money(t.value)}
            </MetaLine>
          </DataCard>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: space[20],
    paddingBottom: space[8],
  },
  headTitle: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.ink,
  },
  empty: {
    paddingVertical: space[12],
  },
});
