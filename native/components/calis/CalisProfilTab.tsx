import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { router } from "expo-router";
import { ChevronRight, Settings } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SegmentedControl } from "../ui/SegmentedControl";
import { logout, useAuth } from "../../lib/auth";
import { useTheme, useThemeMode, type ThemeMode } from "../../lib/theme";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
}

const THEME_TABS = [
  { id: "system" as const, label: "Sistem" },
  { id: "light" as const, label: "Açık" },
  { id: "dark" as const, label: "Koyu" },
];

export function CalisProfilTab() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const { user } = useAuth();

  const displayName = user?.name?.trim() || "Kullanıcı";
  const displayEmail = user?.email ?? "—";
  const version =
    Constants.expoConfig?.version ??
    (Constants as { manifest?: { version?: string } }).manifest?.version ??
    "1.0.0";

  const onLogout = () => {
    Alert.alert("Çıkış", "Hesabınızdan çıkmak istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: () => void logout(),
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Profil bilgileri, güvenlik ve uygulama ayarları
      </Text>

      <Card>
        <View style={styles.userRow}>
          <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
            <Text style={[styles.avatarText, { color: theme.accentForeground }]}>
              {initials(displayName)}
            </Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {displayName}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textMuted }]}>
              {displayEmail}
            </Text>
          </View>
        </View>
      </Card>

      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          router.push("/ayarlar");
        }}
        style={({ pressed }) => [pressed && { opacity: 0.88 }]}
      >
        <Card style={styles.navCard}>
          <Settings size={18} color={theme.foreground} />
          <Text style={[styles.navLabel, { color: theme.text }]}>
            Hesap ve ayarlar
          </Text>
          <ChevronRight size={18} color={theme.textMuted} />
        </Card>
      </Pressable>

      <Card style={styles.themeCard}>
        <Text style={[styles.sectionLbl, { color: theme.textMuted }]}>
          Görünüm
        </Text>
        <SegmentedControl<ThemeMode>
          tabs={THEME_TABS}
          active={mode}
          onChange={setMode}
        />
      </Card>

      <Button variant="outline" dangerOutline label="Çıkış Yap" onPress={onLogout} />

      <Text style={[styles.version, { color: theme.textMuted }]}>
        Sürüm {version}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  hint: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 17,
  },
  userMeta: { flex: 1 },
  userName: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 17,
  },
  userEmail: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 13,
    marginTop: 2,
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  navLabel: {
    flex: 1,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  themeCard: { gap: 10 },
  sectionLbl: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
});
