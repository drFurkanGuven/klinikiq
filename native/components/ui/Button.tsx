import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost";
  /** outline: hata rengi kenarlık ve metin */
  dangerOutline?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  loading,
  variant = "primary",
  dangerOutline,
  disabled,
}: Props) {
  const theme = useTheme();
  const outlineColor = dangerOutline ? theme.error : theme.accent;

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
          styles.pressBase,
          pressed && styles.pressed,
          (disabled || loading) && styles.disabled,
        ]}
      >
        <LinearGradient
          colors={[theme.gradient[0], theme.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryLabel}>{label}</Text>
          )}
        </LinearGradient>
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
          styles.outlineWrap,
          {
            borderColor: outlineColor,
            backgroundColor: "transparent",
          },
          pressed && styles.pressed,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={outlineColor} />
        ) : (
          <Text style={[styles.outlineLabel, { color: outlineColor }]}>
            {label}
          </Text>
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
        styles.ghostWrap,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <Text style={[styles.ghostLabel, { color: theme.accent }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressBase: {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    overflow: "hidden",
  },
  gradient: {
    minHeight: 44,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  primaryLabel: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 15,
    color: "#FFFFFF",
  },
  outlineWrap: {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  outlineLabel: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 15,
  },
  ghostWrap: {
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
    opacity: 0.55,
  },
});
