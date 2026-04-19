import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../lib/theme";

type Props = {
  label: string;
  color?: "accent" | "success" | "error" | "muted";
};

export function Badge({ label, color = "accent" }: Props) {
  const theme = useTheme();

  const fg =
    color === "success"
      ? theme.success
      : color === "error"
        ? theme.error
        : color === "muted"
          ? theme.textMuted
          : theme.accent;

  return (
    <View style={[styles.pill, { backgroundColor: `${fg}22` }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
  },
});
