import { Platform, StyleSheet, Text, View } from "react-native";
import { Stethoscope } from "lucide-react-native";
import type { ReactNode } from "react";
import { useTheme } from "../../lib/theme";

type Props = {
  title: string;
  subtitle: string;
  children?: ReactNode;
};

export function AuthHeader({ title, subtitle }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <View style={[styles.iconBox, { backgroundColor: theme.accent }]}>
        <Stethoscope size={22} color={theme.accentForeground} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.sub, { color: theme.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 24,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  sub: {
    marginTop: 6,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
