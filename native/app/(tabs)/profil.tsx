import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { router } from "expo-router";
import { ChevronRight, Settings, Users } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import type { HistoryItem } from "../../lib/api";
import { leaderboardApi, sessionsApi, usersApi } from "../../lib/api";
import { logout, useAuth } from "../../lib/auth";
import { useTheme, useThemeMode } from "../../lib/theme";

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
}

function fontBold() {
  return Platform.select({
    ios: "Inter_700Bold",
    android: "Inter_700Bold",
    default: "Inter_700Bold",
  });
}

function fontReg() {
  return Platform.select({
    ios: "Inter_400Regular",
    android: "Inter_400Regular",
    default: "Inter_400Regular",
  });
}

function fontSemi() {
  return Platform.select({
    ios: "Inter_600SemiBold",
    android: "Inter_600SemiBold",
    default: "Inter_600SemiBold",
  });
}

function formatSessionDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ProfilScreen() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(false);
  const [restartingId, setRestartingId] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ["users", "history"],
    queryFn: async () => (await usersApi.history()).data,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await leaderboardApi.list()).data,
  });

  const stats = useMemo(() => {
    const items = history ?? [];
    const totalCases = items.length;
    const scores = items
      .map((h) => h.score)
      .filter((s): s is number => typeof s === "number");
    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10
        : 0;
    const me = user?.name?.trim();
    let rank: number | null = null;
    if (me && leaderboard?.length) {
      const idx = leaderboard.findIndex((r) => r.name.trim() === me);
      if (idx >= 0) rank = idx + 1;
    }
    return { totalCases, avgScore, rank };
  }, [history, leaderboard, user?.name]);

  const lastSessions = useMemo(() => {
    const items = [...(history ?? [])];
    items.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    return items.slice(0, 5);
  }, [history]);

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
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  const segment = (value: "system" | "light" | "dark", label: string) => {
    const active = mode === value;
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void Haptics.selectionAsync();
          setMode(value);
        }}
        style={[
          styles.segBtn,
          {
            backgroundColor: active ? theme.card : "transparent",
            borderColor: active ? theme.accent : theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.segText,
            { color: active ? theme.accent : theme.textMuted },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const openLeaderboard = () => {
    void Haptics.selectionAsync();
    router.push("/leaderboard");
  };

  const onHistoryPress = async (item: HistoryItem) => {
    const st = String(item.status);
    if (st === "active") {
      void Haptics.selectionAsync();
      router.push({
        pathname: "/simulasyon/vaka",
        params: { session_id: item.session_id },
      });
      return;
    }
    if (st === "completed") {
      void Haptics.selectionAsync();
      router.push({
        pathname: "/simulasyon/vaka",
        params: { report_session_id: item.session_id },
      });
      return;
    }
    if (st === "abandoned") {
      if (restartingId) return;
      void Haptics.selectionAsync();
      setRestartingId(item.session_id);
      try {
        const res = await sessionsApi.getSession(item.session_id);
        const caseId = res.data.case.id;
        const newS = await sessionsApi.create(caseId);
        router.push({
          pathname: "/simulasyon/vaka",
          params: { session_id: newS.data.id },
        });
      } catch {
        Alert.alert("Hata", "Oturum yeniden başlatılamadı.");
      } finally {
        setRestartingId(null);
      }
      return;
    }
    void Haptics.selectionAsync();
    router.push({
      pathname: "/simulasyon/vaka",
      params: { session_id: item.session_id },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarText}>{initials(displayName)}</Text>
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

        <Card style={styles.navCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Haptics.selectionAsync();
              router.push("/ayarlar");
            }}
            style={({ pressed }) => [
              styles.navRow,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Settings size={20} color={theme.accent} />
            <Text style={[styles.navRowLabel, { color: theme.text }]}>
              Hesap ve ayarlar
            </Text>
            <ChevronRight size={20} color={theme.textMuted} />
          </Pressable>
          <View style={[styles.navDivider, { backgroundColor: theme.border }]} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Haptics.selectionAsync();
              router.push("/topluluk");
            }}
            style={({ pressed }) => [
              styles.navRow,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Users size={20} color={theme.accent} />
            <Text style={[styles.navRowLabel, { color: theme.text }]}>Topluluk</Text>
            <ChevronRight size={20} color={theme.textMuted} />
          </Pressable>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statVal, { color: theme.text }]}>
              {stats.totalCases}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>
              Toplam Vaka
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statVal, { color: theme.accent }]}>
              {stats.avgScore}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>
              Ort. Skor
            </Text>
          </Card>
          <Pressable
            accessibilityRole="button"
            onPress={openLeaderboard}
            style={({ pressed }) => [
              styles.statCardPress,
              pressed && { opacity: 0.88 },
            ]}
          >
            <Card style={styles.statCardInner}>
              <Text style={[styles.statVal, { color: theme.text }]}>
                {stats.rank != null ? `#${stats.rank}` : "—"}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                Sıralama
              </Text>
            </Card>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Vaka Geçmişim
        </Text>
        <Card style={styles.historyCard}>
          {lastSessions.length === 0 ? (
            <Text style={[styles.emptyHist, { color: theme.textMuted }]}>
              Henüz tamamlanmış oturum yok.
            </Text>
          ) : (
            lastSessions.map((h: HistoryItem, i) => {
              const busy = restartingId === h.session_id;
              return (
                <Pressable
                  key={h.session_id}
                  accessibilityRole="button"
                  onPress={() => void onHistoryPress(h)}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.histRow,
                    i < lastSessions.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border,
                    },
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <View style={styles.histLeft}>
                    <Text
                      style={[styles.histTitle, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {h.case_title}
                    </Text>
                    <Text style={[styles.histDate, { color: theme.textMuted }]}>
                      {formatSessionDate(h.started_at)}
                      {typeof h.score === "number" ? ` · ${h.score} puan` : ""}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator color={theme.accent} />
                  ) : (
                    <ChevronRight size={20} color={theme.textMuted} />
                  )}
                </Pressable>
              );
            })
          )}
        </Card>

        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            Görünüm
          </Text>
          <View style={styles.segmentRow}>
            {segment("system", "Sistem")}
            {segment("light", "Açık")}
            {segment("dark", "Koyu")}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.rowBetween}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>
              Bildirimler
            </Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor={Platform.OS === "android" ? theme.surface : undefined}
            />
          </View>
        </Card>

        <Button
          variant="outline"
          dangerOutline
          label="Çıkış Yap"
          onPress={onLogout}
        />

        <Text style={[styles.version, { color: theme.textMuted }]}>
          Sürüm {version}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 18,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 18,
  },
  userEmail: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  navCard: {
    paddingVertical: 4,
    overflow: "hidden",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  navRowLabel: {
    flex: 1,
    fontFamily: fontSemi(),
    fontSize: 16,
  },
  navDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 32,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    minHeight: 88,
    justifyContent: "center",
  },
  statCardPress: {
    flex: 1,
  },
  statCardInner: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    minHeight: 88,
    justifyContent: "center",
  },
  statVal: {
    fontFamily: fontBold(),
    fontSize: 22,
  },
  statLabel: {
    fontFamily: fontSemi(),
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: fontBold(),
    fontSize: 17,
    marginBottom: -4,
  },
  historyCard: {
    paddingVertical: 4,
    overflow: "hidden",
  },
  emptyHist: {
    fontFamily: fontReg(),
    fontSize: 14,
    paddingVertical: 16,
    textAlign: "center",
  },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  histLeft: {
    flex: 1,
    paddingRight: 8,
  },
  histTitle: {
    fontFamily: fontSemi(),
    fontSize: 15,
  },
  histDate: {
    fontFamily: fontReg(),
    fontSize: 12,
    marginTop: 4,
  },
  settingsCard: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    textTransform: "uppercase",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  segText: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  rowLabel: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
  },
});
