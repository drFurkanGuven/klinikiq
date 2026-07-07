import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../lib/theme";

type Props = {
  label: string;
  masteryPct: number;
  seen: number;
};

export function TopicRing({ label, masteryPct, seen }: Props) {
  const theme = useTheme();
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (masteryPct / 100) * c;

  return (
    <View style={styles.wrap}>
      <Svg width={48} height={48} style={styles.svg}>
        <Circle
          cx={24}
          cy={24}
          r={r}
          stroke={theme.surfaceMuted}
          strokeWidth={4}
          fill="none"
        />
        <Circle
          cx={24}
          cy={24}
          r={r}
          stroke={theme.foreground}
          strokeWidth={4}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={seen > 0 ? offset : c}
          strokeLinecap="round"
          rotation={-90}
          origin="24, 24"
        />
      </Svg>
      <Text style={[styles.label, { color: theme.text }]} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.pct, { color: theme.textMuted }]}>
        {seen > 0 ? `${Math.round(masteryPct)}%` : "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    minWidth: 72,
    gap: 2,
  },
  svg: {
    transform: [{ rotate: "-90deg" }],
  },
  label: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 10,
    textAlign: "center",
    maxWidth: 80,
    lineHeight: 13,
    opacity: 0.85,
  },
  pct: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 9,
    opacity: 0.6,
  },
});
