import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { storage } from "../lib/storage";
import { useTheme } from "../lib/theme";

export default function Index() {
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await storage.waitForInit();
      if (cancelled) return;
      if (await storage.isAuthenticated()) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.logo, { color: theme.text }]}>KlinikIQ</Text>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontFamily: Platform.select({
      ios: "Inter_900Black",
      android: "Inter_900Black",
      default: "Inter_900Black",
    }),
    fontSize: 28,
    marginBottom: 16,
  },
});
