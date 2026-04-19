import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ArrowRight, BookOpen, ChevronRight } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import type { HistoryItem, LeaderboardItem } from "../../lib/api";
import { leaderboardApi, sessionsApi, usersApi } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useTheme } from "../../lib/theme";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function SkeletonPulse({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.skelList}>
      {[0, 1, 2].map((k) => (
        <Animated.View
          key={k}
          style={[
            styles.skelCard,
            {
              opacity,
              backgroundColor: theme.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const ABANDONED_ORANGE = "#F59E0B";

export default function DashboardScreen() {
  const theme = useTheme();
  const { user, isLoading: authLoading } = useAuth();
  const [restartingId, setRestartingId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ["users", "history"],
    queryFn: async () => (await usersApi.history()).data,
  });

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await leaderboardApi.list()).data,
  });

  const loading = authLoading || historyQuery.isLoading;

  const stats = useMemo(() => {
    const items = historyQuery.data ?? [];
    const total = items.length;
    const scores = items
      .map((h) => h.score)
      .filter((s): s is number => typeof s === "number");
    const avg =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10
        : 0;
    return { total, avg };
  }, [historyQuery.data]);

  const rank = useMemo(() => {
    const board = leaderboardQuery.data ?? [];
    const me = user?.name?.trim();
    if (!me) return null;
    const idx = board.findIndex((r: LeaderboardItem) => r.name.trim() === me);
    if (idx < 0) return null;
    return idx + 1;
  }, [leaderboardQuery.data, user?.name]);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      historyQuery.refetch(),
      leaderboardQuery.refetch(),
    ]);
  }, [historyQuery, leaderboardQuery]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("tr-TR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    []
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeaderWrap}>
        <View style={styles.headerBlock}>
          <Text style={[styles.greet, { color: theme.text }]}>
            Merhaba, {user?.name?.split(" ")[0] ?? "…"} 👋
          </Text>
          <Text style={[styles.dateLine, { color: theme.textMuted }]}>
            {today}
          </Text>
        </View>

        {loading ? (
          <SkeletonPulse theme={theme} />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hRow}
            >
              <Card style={[styles.statCard, { width: 160 }]}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Toplam Vaka
                </Text>
                <Text style={[styles.statNum, { color: theme.text }]}>
                  {stats.total}
                </Text>
              </Card>
              <Card style={[styles.statCard, { width: 160 }]}>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Ort. Skor
                </Text>
                <Text style={[styles.statNum, { color: theme.accent }]}>
                  {stats.avg}
                </Text>
              </Card>
            </ScrollView>

            {rank != null ? (
              <View style={styles.rankRow}>
                <Badge label={`Sıralaman: #${rank}`} color="accent" />
              </View>
            ) : null}

            <View style={{ marginTop: 12 }}>
              <CaseQuickStart title="Vaka oluşturucu (tercihler)" />
            </View>

            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                router.push("/ogren");
              }}
              style={({ pressed }) => [pressed && { opacity: 0.92 }]}
            >
              <Card
                style={[
                  styles.learnCard,
                  { borderColor: theme.border, backgroundColor: theme.card },
                ]}
              >
                <View style={[styles.learnIcon, { backgroundColor: theme.accent + "22" }]}>
                  <BookOpen size={22} color={theme.accent} />
                </View>
                <View style={styles.learnMeta}>
                  <Text style={[styles.learnTitle, { color: theme.text }]}>
                    Öğren
                  </Text>
                  <Text style={[styles.learnHint, { color: theme.textMuted }]}>
                    Kartlar, soru bankası, Acil MCQ
                  </Text>
                </View>
                <ChevronRight size={22} color={theme.textMuted} />
              </Card>
            </Pressable>

            <View style={styles.cta}>
              <Button
                label="Vaka listesinden seç"
                onPress={() => router.push("/simulasyon/vakalar")}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Son Raporlar
            </Text>
          </>
        )}
      </View>
    ),
    [loading, rank, stats.avg, stats.total, theme, today, user?.name]
  );

  const onHistoryPress = useCallback(
    async (item: HistoryItem) => {
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
    },
    [restartingId]
  );

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => {
      const st = String(item.status);
      const isActive = st === "active";
      const isCompleted = st === "completed";
      const isAbandoned = st === "abandoned";
      const busy = restartingId === item.session_id;

      let chipBg = theme.accent;
      let chipLabel = "Aç";
      if (isActive) {
        chipBg = theme.accent;
        chipLabel = "Devam Et";
      } else if (isCompleted) {
        chipBg = theme.success;
        chipLabel = "Raporu Gör";
      } else if (isAbandoned) {
        chipBg = ABANDONED_ORANGE;
        chipLabel = "Yeniden Başlat";
      }

      return (
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          onPress={() => void onHistoryPress(item)}
          disabled={busy}
        >
          <Card style={styles.reportCard}>
            <View style={styles.reportRow}>
              <View style={styles.reportLeft}>
                <Text
                  style={[styles.caseTitle, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {item.case_title}
                </Text>
                <Text style={[styles.caseDate, { color: theme.textMuted }]}>
                  {formatDate(item.started_at)}
                </Text>
              </View>
              {busy ? (
                <View style={styles.chipSlot}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              ) : (
                <View style={[styles.resumeChip, { backgroundColor: chipBg }]}>
                  <Text style={styles.resumeChipText}>{chipLabel}</Text>
                  <ArrowRight size={12} color="#fff" />
                </View>
              )}
            </View>
          </Card>
        </Pressable>
      );
    },
    [theme, restartingId, onHistoryPress]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <FlatList
        data={loading ? [] : historyQuery.data ?? []}
        keyExtractor={(item) => item.session_id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? null : (
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              Henüz rapor yok.
            </Text>
          )
        }
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={historyQuery.isRefetching && !historyQuery.isLoading}
            onRefresh={onRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        ListFooterComponent={
          historyQuery.isRefetching && !historyQuery.isLoading ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  listHeaderWrap: {
    marginBottom: 4,
  },
  headerBlock: {
    marginBottom: 16,
  },
  greet: {
    fontFamily: Platform.select({
      ios: "Inter_900Black",
      android: "Inter_900Black",
      default: "Inter_900Black",
    }),
    fontSize: 24,
  },
  dateLine: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  hRow: {
    gap: 12,
    paddingVertical: 4,
  },
  statCard: {
    marginRight: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    marginBottom: 8,
  },
  statNum: {
    fontFamily: Platform.select({
      ios: "Inter_900Black",
      android: "Inter_900Black",
      default: "Inter_900Black",
    }),
    fontSize: 32,
  },
  rankRow: {
    marginTop: 12,
    marginBottom: 4,
  },
  learnCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  learnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  learnMeta: { flex: 1 },
  learnTitle: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 16,
  },
  learnHint: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  cta: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 17,
  },
  reportCard: {
    marginBottom: 10,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  reportLeft: {
    flex: 1,
  },
  caseTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  caseDate: {
    marginTop: 4,
    fontSize: 12,
  },
  empty: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
  skelList: {
    gap: 10,
  },
  skelCard: {
    height: 72,
    borderRadius: 16,
  },
  inlineLoader: {
    paddingVertical: 8,
    alignItems: "center",
  },
  resumeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resumeChipText: {
    color: "#fff",
    fontSize: 12,
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
});
