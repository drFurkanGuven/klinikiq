import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Stethoscope,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaseQuickStart } from "../../components/CaseQuickStart";
import { Badge } from "../../components/ui/Badge";
import type { HistoryItem } from "../../lib/api";
import { sessionsApi, usersApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";

function formatRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m} dk önce`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} sa önce`;
    return `${Math.floor(h / 24)} gün önce`;
  } catch {
    return "";
  }
}

function difficultyLabel(d: string) {
  if (d === "easy") return "Kolay";
  if (d === "medium") return "Orta";
  if (d === "hard") return "Zor";
  return d;
}

export default function VakaTab() {
  const theme = useTheme();
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [section, setSection] = useState<"start" | "history">("start");

  const historyQuery = useQuery({
    queryKey: ["users", "history"],
    queryFn: async () => (await usersApi.history()).data,
  });

  const { activeSessions, recentSessions } = useMemo(() => {
    const items = historyQuery.data ?? [];
    const active = items.filter((h) => String(h.status) === "active");
    const rest = items
      .filter((h) => String(h.status) !== "active")
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      );
    return { activeSessions: active, recentSessions: rest };
  }, [historyQuery.data]);

  const openSession = useCallback((sessionId: string) => {
    void Haptics.selectionAsync();
    router.push({
      pathname: "/simulasyon/vaka",
      params: { session_id: sessionId },
    });
  }, []);

  const onRecentItem = useCallback(
    async (item: HistoryItem) => {
      const st = String(item.status);
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
      openSession(item.session_id);
    },
    [restartingId, openSession]
  );

  const header = (
    <View style={styles.headerBlock}>
      <Text style={[styles.title, { color: theme.text }]}>Vaka</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Rastgele veya önerilen klinik vaka simülasyonu
      </Text>

      <View
        style={[
          styles.sectionTabs,
          { borderColor: theme.border, backgroundColor: theme.surfaceMuted },
        ]}
      >
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            setSection("start");
          }}
          style={[
            styles.sectionTab,
            {
              backgroundColor: section === "start" ? theme.accent : "transparent",
              borderRadius: theme.radiusMd,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTabLbl,
              {
                color:
                  section === "start" ? theme.accentForeground : theme.textMuted,
              },
            ]}
          >
            Başlat
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            setSection("history");
          }}
          style={[
            styles.sectionTab,
            {
              backgroundColor:
                section === "history" ? theme.accent : "transparent",
              borderRadius: theme.radiusMd,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionTabLbl,
              {
                color:
                  section === "history"
                    ? theme.accentForeground
                    : theme.textMuted,
              },
            ]}
          >
            Geçmiş
          </Text>
        </Pressable>
      </View>

      {section === "start" && (
        <>
          {activeSessions.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLbl, { color: theme.textMuted }]}>
                DEVAM EDEN
              </Text>
              {activeSessions.map((item) => (
                <Pressable
                  key={item.session_id}
                  onPress={() => openSession(item.session_id)}
                  style={({ pressed }) => [
                    styles.activeCard,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <View style={styles.activeLeft}>
                    <Text
                      style={[styles.activeTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.case_title}
                    </Text>
                    <View style={styles.activeMeta}>
                      <Clock size={11} color={theme.textMuted} />
                      <Text style={[styles.activeTime, { color: theme.textMuted }]}>
                        {formatRelative(item.started_at)}
                      </Text>
                      <Badge label={item.specialty} color="muted" />
                    </View>
                  </View>
                  <View
                    style={[styles.resumeBtn, { backgroundColor: theme.accent }]}
                  >
                    <Text
                      style={[
                        styles.resumeTxt,
                        { color: theme.accentForeground },
                      ]}
                    >
                      Devam
                    </Text>
                    <ArrowRight size={12} color={theme.accentForeground} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <CaseQuickStart />

          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.push("/simulasyon/vakalar");
            }}
            style={({ pressed }) => [
              styles.listLink,
              {
                borderColor: theme.border,
                backgroundColor: theme.surface,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Stethoscope size={18} color={theme.foreground} />
            <Text style={[styles.listLinkTxt, { color: theme.text }]}>
              Vaka listesinden seç
            </Text>
            <ArrowRight size={16} color={theme.textMuted} />
          </Pressable>
        </>
      )}
    </View>
  );

  if (section === "start") {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={historyQuery.isRefetching && !historyQuery.isLoading}
              onRefresh={() => void historyQuery.refetch()}
              tintColor={theme.foreground}
            />
          }
        >
          {header}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <FlatList
        data={recentSessions}
        keyExtractor={(item) => item.session_id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={historyQuery.isRefetching && !historyQuery.isLoading}
            onRefresh={() => void historyQuery.refetch()}
            tintColor={theme.foreground}
          />
        }
        ListEmptyComponent={
          historyQuery.isLoading ? (
            <ActivityIndicator color={theme.foreground} style={{ marginTop: 24 }} />
          ) : (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              Henüz vaka geçmişi yok.
            </Text>
          )
        }
        renderItem={({ item }) => {
          const st = String(item.status);
          const isCompleted = st === "completed";
          const isAbandoned = st === "abandoned";
          const busy = restartingId === item.session_id;
          const chipLabel = isCompleted
            ? "Rapor"
            : isAbandoned
              ? "Yeniden"
              : "Aç";

          return (
            <Pressable
              onPress={() => void onRecentItem(item)}
              disabled={busy}
              style={({ pressed }) => [
                styles.histCard,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <View style={[styles.histIcon, { backgroundColor: theme.surfaceMuted }]}>
                <BookOpen size={16} color={theme.foreground} />
              </View>
              <View style={styles.histBody}>
                <Text
                  style={[styles.histTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.case_title}
                </Text>
                <View style={styles.histMeta}>
                  <Badge label={item.specialty} color="muted" />
                  <Badge label={difficultyLabel(item.difficulty)} color="muted" />
                </View>
              </View>
              {busy ? (
                <ActivityIndicator color={theme.foreground} />
              ) : (
                <Text style={[styles.chip, { color: theme.foreground }]}>
                  {chipLabel} →
                </Text>
              )}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  headerBlock: { paddingTop: 8, paddingBottom: 16, gap: 12 },
  title: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
  },
  sectionTabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 2,
  },
  sectionTab: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTabLbl: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 13,
  },
  section: { gap: 8 },
  sectionLbl: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 10,
    letterSpacing: 1,
  },
  activeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  activeLeft: { flex: 1 },
  activeTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
    marginBottom: 4,
  },
  activeMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeTime: { fontSize: 11 },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resumeTxt: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 12,
  },
  listLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  listLinkTxt: {
    flex: 1,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  histCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  histIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  histBody: { flex: 1 },
  histTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
    marginBottom: 4,
  },
  histMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 12,
  },
  empty: { textAlign: "center", marginTop: 24, fontSize: 14 },
});
