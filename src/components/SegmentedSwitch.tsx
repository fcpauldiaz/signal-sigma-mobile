import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, space } from "../theme";

export function SegmentedSwitch<T extends string>({
  value,
  options,
  onChange,
  accentFor,
  accessibilityLabel,
}: {
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (value: T) => void;
  accentFor?: T;
  accessibilityLabel: string;
}) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const active = value === option.id;
        const warning = active && option.id === accentFor;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(option.id);
            }}
            style={[styles.btn, active && styles.active]}
          >
            <Text
              style={[
                styles.label,
                active && styles.activeLabel,
                warning && styles.warningLabel,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    gap: 2,
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.rule,
    borderRadius: radius.pill,
    backgroundColor: colors.elevated,
  },
  btn: {
    paddingHorizontal: space[12],
    paddingVertical: space[4],
    borderRadius: radius.pill,
  },
  active: {
    backgroundColor: colors.surface,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.muted,
  },
  activeLabel: {
    color: colors.ink,
  },
  warningLabel: {
    color: colors.warning,
  },
});
