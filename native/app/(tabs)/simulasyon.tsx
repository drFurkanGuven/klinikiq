import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Clock,
  Stethoscope,
  Zap,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
    const d = Math.floor(h / 24);
    return `${d} gün önce`;
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

function difficultyColor(d: string): "success" | "accent" | "error" | "muted" {
  if (d === "easy") return "success";
  if (d === "medium") return "accent";
  if (d === "hard") return "error";
  return "muted";
}

const ABANDONED_ORANGE = "#F59E0B";

export default function SimulasyonTab() {
  const theme = useTheme();
  const [restartingId, setRestartingId] = useState<string | null>(null);

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
      )
      .slice(0, 5);
    return { activeSessions: active, recentSessions: rest };
  }, [historyQuery.data]);

  const onRefresh = useCallback(() => {
    void historyQuery.refetch();
  }, [historyQuery]);

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
      void Haptics.selectionAsync();
      router.push({
        pathname: "/simulasyon/vaka",
        params: { session_id: item.session_id },
      });
    },
    [restartingId]
  );

  const listHeader = useMemo(
    () => (
      <View>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: theme.card }]}>
            <Activity size={22} color={theme.accent} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Simülasyon
            </Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>
              Devam eden vakalar · Acil MCQ
            </Text>
          </View>
        </View>

        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
              DEVAM EDEN VAKALAR
            </Text>
            {activeSessions.map((item) => (
              <Pressable
                key={item.session_id}
                style={({ pressed }) => [
                  styles.activeCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.accent + "55",
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
                onPress={() => openSession(item.session_id)}
              >
                <LinearGradient
                  colors={[theme.accent + "22", "transparent"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.activeCardInner}>
                  <View style={styles.activeCardLeft}>
                    <Text
                      style={[styles.activeCardTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {item.case_title}
                    </Text>
                    <View style={styles.activeCardMeta}>
                      <Clock size={11} color={theme.textMuted} />
                      <Text
                        style={[styles.activeCardTime, { color: theme.textMuted }]}
                      >
                        {formatRelative(item.started_at)}
                      </Text>
                      <Badge label={item.specialty} color="muted" />
                    </View>
                  </View>
                  <View style={[styles.resumeBtn, { backgroundColor: theme.accent }]}>
                    <Text style={styles.resumeText}>Devam Et</Text>
                    <ArrowRight size={12} color="#fff" />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.hintLine, { color: theme.textMuted }]}>
          Yeni vaka: Dashboard’daki oluşturucu veya vaka listesi.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.modeCardFill,
            { backgroundColor: "#EF4444", opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.navigate("/(tabs)/acil");
          }}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.13)", "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Zap size={28} color="#fff" />
          <Text style={styles.modeCardTitle}>Acil{"\n"}MCQ</Text>
          <Text style={styles.modeCardDesc}>MedQA sorular + oturum raporu</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.listLink,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          onPress={() => {
            void Haptics.selectionAsync();
            router.push("/simulasyon/vakalar");
          }}
        >
          <Stethoscope size={20} color={theme.accent} />
          <Text style={[styles.listLinkTxt, { color: theme.text }]}>
            Vaka listesinden seç
          </Text>
          <ArrowRight size={18} color={theme.textMuted} />
        </Pressable>

        {/* Recent completed header */}
        {recentSessions.length > 0 && (
          <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 8 }]}>
            SON RAPORLAR
          </Text>
        )}
      </View>
    ),
    [activeSessions, recentSessions.length, theme, openSession]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <FlatList
        data={recentSessions}
        keyExtractor={(item) => item.session_id}
        renderItem={({ item }: { item: HistoryItem }) => {
          const st = String(item.status);
          const isCompleted = st === "completed";
          const isAbandoned = st === "abandoned";
          const busy = restartingId === item.session_id;

          let chipBg = theme.accent;
          let chipLabel = "Aç";
          if (isCompleted) {
            chipBg = theme.success;
            chipLabel = "Raporu Gör";
          } else if (isAbandoned) {
            chipBg = ABANDONED_ORANGE;
            chipLabel = "Yeniden Başlat";
          }

          return (
            <Pressable
              style={({ pressed }) => [
                styles.histCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => void onRecentItem(item)}
              disabled={busy}
            >
              <View style={styles.histLeft}>
                <View style={[styles.histIcon, { backgroundColor: theme.surface }]}>
                  <BookOpen size={16} color={theme.accent} />
                </View>
                <View style={styles.histContent}>
                  <Text
                    style={[styles.histTitle, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.case_title}
                  </Text>
                  <View style={styles.histMeta}>
                    <Badge label={item.specialty} color="muted" />
                    <Badge
                      label={difficultyLabel(item.difficulty)}
                      color={difficultyColor(item.difficulty)}
                    />
                  </View>
                </View>
              </View>
              {busy ? (
                <View style={styles.chipSlot}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              ) : (
                <View style={[styles.actionChip, { backgroundColor: chipBg }]}>
                  <Text style={styles.actionChipText}>{chipLabel}</Text>
                  <ArrowRight size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          historyQuery.isLoading ? null : (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              Henüz tamamlanan vaka yok.
            </Text>
          )
        }
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: theme.bg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={historyQuery.isRefetching && !historyQuery.isLoading}
            onRefresh={onRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
    paddingBottom: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: Platform.select({
      ios: "Inter_900Black",
      android: "Inter_900Black",
      default: "Inter_900Black",
    }),
    fontSize: 22,
    lineHeight: 26,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  section: { marginBottom: 16 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  activeCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  activeCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  activeCardLeft: { flex: 1 },
  activeCardTitle: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 15,
    marginBottom: 6,
  },
  activeCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeCardTime: { fontSize: 11 },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  resumeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
  },
  hintLine: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  modeCardFill: {
    alignSelf: "stretch",
    borderRadius: 20,
    padding: 18,
    gap: 8,
    overflow: "hidden",
    minHeight: 130,
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  listLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
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
  modeCardTitle: {
    color: "#fff",
    fontFamily: Platform.select({
      ios: "Inter_900Black",
      android: "Inter_900Black",
      default: "Inter_900Black",
    }),
    fontSize: 16,
    lineHeight: 21,
  },
  modeCardDesc: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  histCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  histLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  histIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  histContent: { flex: 1 },
  histTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
    marginBottom: 6,
  },
  histMeta: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    maxWidth: 140,
  },
  actionChipText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
  },
  chipSlot: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  empty: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
  },
});
