import type { TradingMode } from "../api";
import { SegmentedSwitch } from "./SegmentedSwitch";

export function ModeSwitch({
  mode,
  onChange,
}: {
  mode: TradingMode;
  onChange: (mode: TradingMode) => void;
}) {
  return (
    <SegmentedSwitch
      value={mode}
      onChange={onChange}
      accentFor="live"
      accessibilityLabel="Trading mode"
      options={[
        { id: "paper", label: "Paper" },
        { id: "live", label: "Live" },
      ]}
    />
  );
}
