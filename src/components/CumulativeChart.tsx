import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Polygon,
  Polyline,
  Text as SvgText,
} from "react-native-svg";
import type { PerformanceResponse } from "../api";
import { money } from "../format";
import { colors, fonts, space } from "../theme";
import { PlText } from "./Typography";

const W = 640;
const H = 220;
const PAD = { t: 16, r: 16, b: 28, l: 52 };

type CumulativePoint = PerformanceResponse["cumulativeSeries"][number];

export function CumulativeChart({ series }: { series: CumulativePoint[] }) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [series]);

  const points = useMemo(() => {
    if (!series.length) return null;
    const ys = series.map((p) => p.cumulative);
    const minY = Math.min(0, ...ys);
    const maxY = Math.max(0, ...ys);
    const span = maxY - minY || 1;
    const coords = series.map((p, i) => {
      const x = PAD.l + (i / Math.max(series.length - 1, 1)) * innerW;
      const y = PAD.t + ((maxY - p.cumulative) / span) * innerH;
      return { x, y, ...p };
    });
    const zeroY = PAD.t + ((maxY - 0) / span) * innerH;
    const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
    const area = `${PAD.l},${zeroY} ${line} ${coords[coords.length - 1].x},${zeroY}`;
    return { coords, line, area, zeroY, minY, maxY };
  }, [series, innerH, innerW]);

  const togglePoint = (i: number) => {
    setSelectedIndex((cur) => (cur === i ? null : i));
  };

  if (!points) return null;

  const ticks = [points.minY, 0, points.maxY].filter(
    (v, i, a) => a.indexOf(v) === i
  );
  const selected =
    selectedIndex != null && selectedIndex < points.coords.length
      ? points.coords[selectedIndex]
      : undefined;

  return (
    <View style={styles.wrap}>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={180}>
        {ticks.map((t) => {
          const span = points.maxY - points.minY || 1;
          const y = PAD.t + ((points.maxY - t) / span) * innerH;
          return (
            <G key={String(t)}>
              <Line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={y}
                y2={y}
                stroke={colors.rule}
                strokeWidth={1}
              />
              <SvgText
                x={PAD.l - 8}
                y={y + 3}
                fill={colors.faint}
                fontSize={10}
                textAnchor="end"
              >
                {money(t)}
              </SvgText>
            </G>
          );
        })}
        <Polygon points={points.area} fill={colors.accentMuted} />
        <Polyline
          points={points.line}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2}
        />
        {points.coords.map((c, i) => {
          const isSelected = selectedIndex === i;
          return (
            <G key={`${c.symbol}-${c.closeDate}-${i}`}>
              <Circle
                cx={c.x}
                cy={c.y}
                r={isSelected ? 5 : 3}
                fill={isSelected ? colors.ink : colors.accent}
              />
              <Circle
                cx={c.x}
                cy={c.y}
                r={14}
                fill="transparent"
                onPress={() => togglePoint(i)}
              />
            </G>
          );
        })}
        <SvgText x={PAD.l} y={H - 6} fill={colors.faint} fontSize={10}>
          {series[0]?.date}
        </SvgText>
        <SvgText
          x={W - PAD.r}
          y={H - 6}
          fill={colors.faint}
          fontSize={10}
          textAnchor="end"
        >
          {series[series.length - 1]?.date}
        </SvgText>
      </Svg>
      {selected ? (
        <View style={styles.detail}>
          <View style={styles.detailHead}>
            <Text style={styles.detailTitle}>
              {selected.symbol} · closed {selected.date}
              {selected.openDate
                ? ` · opened ${selected.openDate.slice(0, 10)}`
                : ""}
            </Text>
            <Pressable onPress={() => setSelectedIndex(null)} hitSlop={8}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.stats}>
            <Stat label="Qty" value={String(selected.quantity)} />
            <Stat label="Cost" value={money(selected.cost)} />
            <Stat label="Proceeds" value={money(selected.proceeds)} />
            <Stat
              label="Trade P&L"
              value={money(selected.gainLoss)}
              pl={selected.gainLoss}
            />
            <Stat
              label="P&L %"
              value={`${selected.gainLossPercent?.toFixed?.(1) ?? selected.gainLossPercent}%`}
              pl={selected.gainLossPercent}
            />
            <Stat
              label="Cumulative"
              value={money(selected.cumulative)}
              pl={selected.cumulative}
            />
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>Tap a close to inspect P&L</Text>
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  pl,
}: {
  label: string;
  value: string;
  pl?: number | null;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      {pl != null ? (
        <PlText value={pl}>{value}</PlText>
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    minWidth: 0,
    gap: space[8],
  },
  hint: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.faint,
  },
  detail: {
    gap: space[8],
    paddingTop: space[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.rule,
  },
  detailHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space[8],
  },
  detailTitle: {
    flex: 1,
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.ink,
  },
  clear: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.muted,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[12],
  },
  stat: {
    minWidth: "28%",
    gap: 2,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontFamily: fonts.monoMedium,
    fontSize: 13,
    color: colors.ink,
  },
});
