import { Share, StyleSheet, Text } from "react-native";
import type { AssetFilter, PerformanceResponse } from "../api";
import { closedCsvFilename, closedTradesToCsv } from "../desk";
import { colors, fonts, radius, space } from "../theme";
import { PressableScale } from "./PressableScale";

export function ShareCsvButton({
  trades,
  mode,
  accountId,
  assetFilter,
}: {
  trades: PerformanceResponse["recentClosed"];
  mode: string;
  accountId: string;
  assetFilter: AssetFilter;
}) {
  if (!trades.length) return null;

  return (
    <PressableScale
      onPress={() => {
        const filename = closedCsvFilename(mode, accountId, assetFilter);
        void Share.share({
          title: filename,
          message: closedTradesToCsv(trades),
        });
      }}
      style={styles.btn}
    >
      <Text style={styles.label}>Share CSV</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    borderRadius: radius.sm,
    paddingHorizontal: space[8],
    paddingVertical: space[4],
  },
  label: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.ink,
  },
});
