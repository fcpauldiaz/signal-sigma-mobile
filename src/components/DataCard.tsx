import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PerformanceResponse, PositionsResponse } from "../api";
import { money } from "../format";
import { colors, fonts, space } from "../theme";
import { PlText } from "./Typography";

export function DataCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function MetaLine({ children }: { children: ReactNode }) {
  return <Text style={styles.meta}>{children}</Text>;
}

export function BrokerPositionCard({
  position: p,
}: {
  position: PositionsResponse["brokerPositions"][number];
}) {
  return (
    <DataCard
      title={p.symbol}
      right={<PlText value={p.openPl}>{money(p.openPl)}</PlText>}
    >
      <MetaLine>
        {p.strategy || "—"} · Qty {p.quantity} · Avg {money(p.avgCost)} · Last{" "}
        {money(p.lastPrice)}
      </MetaLine>
      <MetaLine>
        Mkt {money(p.marketValue)} ·{" "}
        {p.openPlPercent == null ? "—" : `${p.openPlPercent.toFixed(1)}%`}
        {p.dateAcquired ? ` · ${p.dateAcquired.slice(0, 10)}` : ""}
      </MetaLine>
    </DataCard>
  );
}

export function ClosedTradeCard({
  trade: t,
}: {
  trade: PerformanceResponse["recentClosed"][number];
}) {
  return (
    <DataCard
      title={t.symbol}
      right={<PlText value={t.gainLoss}>{money(t.gainLoss)}</PlText>}
    >
      <MetaLine>
        {t.closeDate.slice(0, 10)} · Qty {t.quantity} · {money(t.proceeds)}
      </MetaLine>
      <MetaLine>
        {t.gainLossPercent?.toFixed?.(1) ?? t.gainLossPercent}%
      </MetaLine>
    </DataCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.rule,
    paddingVertical: space[12],
    gap: space[4],
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[8],
  },
  title: {
    fontFamily: fonts.monoSemi,
    fontSize: 15,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.muted,
  },
});
