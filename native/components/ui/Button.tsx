import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost";
  dangerOutline?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
};

export function Button({
  label,
  onPress,
  loading,
  variant = "primary",
  dangerOutline,
  disabled,
  size = "md",
}: Props) {
  const theme = useTheme();
  const outlineColor = dangerOutline ? theme.destructive : theme.foreground;
  const isLg = size === "lg";

  const handlePress = () => {
    if (disabled || loading) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  if (variant === "primary") {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.primary,
          isLg && styles.primaryLg,
          {
            backgroundColor: theme.accent,
            borderRadius: theme.radiusLg,
          },
          pressed && styles.pressed,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.accentForeground} />
        ) : (
          <Text
            style={[
              styles.primaryLabel,
              isLg && styles.primaryLabelLg,
              { color: theme.accentForeground },
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    );
  }

  if (variant === "outline") {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.outline,
          isLg && styles.outlineLg,
          {
            borderColor: outlineColor,
            borderRadius: theme.radiusLg,
          },
          pressed && styles.pressed,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={outlineColor} />
        ) : (
          <Text style={[styles.outlineLabel, { color: outlineColor }]}>{label}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.ghost,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.foreground} />
      ) : (
        <Text style={[styles.ghostLabel, { color: theme.foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    width: "100%",
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLg: {
    minHeight: 52,
    paddingVertical: 16,
  },
  primaryLabel: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  primaryLabelLg: {
    fontSize: 16,
  },
  outline: {
    width: "100%",
    minHeight: 44,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  outlineLg: {
    minHeight: 52,
    paddingVertical: 16,
  },
  outlineLabel: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  ghost: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostLabel: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
});
