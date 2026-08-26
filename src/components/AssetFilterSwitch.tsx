import type { AssetFilter } from "../api";
import { SegmentedSwitch } from "./SegmentedSwitch";

const OPTIONS = [
  { id: "all" as const, label: "All" },
  { id: "stocks" as const, label: "Stocks" },
  { id: "options" as const, label: "Options" },
];

export function AssetFilterSwitch({
  value,
  onChange,
}: {
  value: AssetFilter;
  onChange: (value: AssetFilter) => void;
}) {
  return (
    <SegmentedSwitch
      value={value}
      onChange={onChange}
      accessibilityLabel="Asset filter"
      options={OPTIONS}
    />
  );
}
