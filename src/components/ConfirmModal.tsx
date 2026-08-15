import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { TradingMode } from "../api";
import { colors, fonts, radius, space } from "../theme";
import { PressableScale } from "./PressableScale";

export type DeskAction = "rebalance" | "place" | "both";

function deskActionCopy(action: DeskAction, mode: TradingMode) {
  switch (action) {
    case "rebalance":
      return {
        title: "Rebalance",
        confirm: "Rebalance",
        body: `Recalculate ${mode} targets. No orders are sent.`,
      };
    case "place":
      return {
        title: "Place orders",
        confirm: "Place orders",
        body: `Send eligible pending orders to Tradier ${mode}.`,
      };
    case "both":
      return {
        title: "Rebalance + place",
        confirm: "Rebalance + place",
        body: `Recalculate ${mode} targets, then send eligible orders to Tradier.`,
      };
  }
}

export function ConfirmModal({
  action,
  mode,
  onConfirm,
  onClose,
}: {
  action: DeskAction | null;
  mode: TradingMode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const copy = action ? deskActionCopy(action, mode) : null;
  const live = mode === "live";

  return (
    <Modal
      visible={copy != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        {copy ? (
          <View
            style={styles.panel}
            accessibilityViewIsModal
            accessibilityLabel={copy.title}
          >
            <Text style={[styles.kicker, live && styles.kickerLive]}>
              {mode}
            </Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.body}>{copy.body}</Text>
            <View style={styles.actions}>
              <PressableScale
                onPress={onConfirm}
                style={[styles.button, live && styles.buttonLive]}
              >
                <Text style={[styles.buttonText, live && styles.buttonLiveText]}>
                  {copy.confirm}
                </Text>
              </PressableScale>
              <PressableScale onPress={onClose} style={styles.button}>
                <Text style={styles.buttonText}>Cancel</Text>
              </PressableScale>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: space[24],
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    borderRadius: radius.md,
    padding: space[24],
    gap: space[8],
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.accent,
  },
  kickerLive: {
    color: colors.warning,
  },
  title: {
    fontFamily: fonts.monoMedium,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: space[8],
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[8],
    marginTop: space[8],
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    borderRadius: radius.sm,
    paddingHorizontal: space[12],
    paddingVertical: space[8],
  },
  buttonLive: {
    borderColor: colors.warning,
  },
  buttonText: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.ink,
  },
  buttonLiveText: {
    color: colors.warning,
  },
});
