import { View } from "react-native";
import { CumulativeChart } from "../../src/components/CumulativeChart";
import { ClosedTradeCard } from "../../src/components/DataCard";
import { MetricCard, MetricGrid } from "../../src/components/MetricCard";
import { MonthlyBars } from "../../src/components/MonthlyBars";
import { Panel } from "../../src/components/Panel";
import { ListScreen } from "../../src/components/Screen";
import { ShareCsvButton } from "../../src/components/ShareCsvButton";
import {
  ErrorText,
  Muted,
  ScreenHeader,
} from "../../src/components/Typography";
import {
  calendarYearEt,
  filteredOpenPl,
  formatYtd,
  realizedYtdFromTrades,
} from "../../src/desk";
import { money, pct, plClass } from "../../src/format";
import { useDeskQueries } from "../../src/hooks";
import { space } from "../../src/theme";

export default function PerformanceScreen() {
  const { perfQ, positionsQ, assetFilter, filteredPerformance } =
    useDeskQueries();
  const data = filteredPerformance;

  const onRefresh = () => {
    void perfQ.refetch();
    void positionsQ.refetch();
  };

  if (perfQ.isError) {
    return (
      <ListScreen
        data={[]}
        keyExtractor={() => "err"}
        renderItem={() => null}
        onRefresh={onRefresh}
        refreshing={perfQ.isRefetching}
        header={<ErrorText>{(perfQ.error as Error).message}</ErrorText>}
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
        header={<Muted>Loading performance…</Muted>}
      />
    );
  }

  const openPl = filteredOpenPl(
    assetFilter,
    data.balances.openPl ?? positionsQ.data?.balances.openPl,
    positionsQ.data?.brokerPositions
  );
  const ytd = formatYtd(
    data.totals.realizedYtd ?? realizedYtdFromTrades(data.recentClosed),
    openPl,
    data.balances.totalEquity
  );

  return (
    <ListScreen
      data={data.recentClosed}
      keyExtractor={(t, i) => `${t.symbol}-${t.closeDate}-${i}`}
      onRefresh={onRefresh}
      refreshing={perfQ.isRefetching}
      empty={<Muted>No closed trades yet.</Muted>}
      header={
        <View style={{ gap: space[16], marginBottom: space[12] }}>
          <ScreenHeader kicker="Closed trades · Tradier" title="Performance">
            {data.mode} · {data.accountId}
          </ScreenHeader>
          <MetricGrid>
            <MetricCard
              label="Open P&L"
              value={money(openPl)}
              tone={plClass(openPl)}
            />
            <MetricCard
              label="Realized P&L"
              value={money(data.totals.realizedPl)}
              tone={plClass(data.totals.realizedPl)}
            />
            <MetricCard
              label={`YTD P&L · ${calendarYearEt()}`}
              value={ytd.value}
              tone={ytd.tone}
            />
            <MetricCard label="Trades" value={String(data.totals.tradeCount)} />
            <MetricCard label="Win rate" value={pct(data.totals.winRate)} />
            <MetricCard
              label="W / L"
              value={`${data.totals.winners} / ${data.totals.losers}`}
            />
          </MetricGrid>
          <Panel
            title={`Last ${data.recentClosed.length} closes`}
            meta={
              <ShareCsvButton
                trades={data.recentClosed}
                mode={data.mode}
                accountId={data.accountId}
                assetFilter={assetFilter}
              />
            }
          >
            <Muted>Share CSV, or scroll the blotter below.</Muted>
          </Panel>
          <Panel title="Cumulative">
            {data.cumulativeSeries.length > 0 ? (
              <CumulativeChart series={data.cumulativeSeries} />
            ) : (
              <Muted>No closed trades yet.</Muted>
            )}
          </Panel>
          <Panel title="Monthly P&L">
            {data.monthly.length > 0 ? (
              <MonthlyBars monthly={data.monthly} />
            ) : (
              <Muted>No monthly P&L yet.</Muted>
            )}
          </Panel>
        </View>
      }
      renderItem={({ item: t }) => <ClosedTradeCard trade={t} />}
    />
  );
}
