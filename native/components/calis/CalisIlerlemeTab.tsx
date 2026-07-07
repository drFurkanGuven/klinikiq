import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  PenLine,
  Pill,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "../ui/Card";
import { TopicRing } from "../study/TopicRing";
import {
  pharmaApi,
  questionsApi,
  studyApi,
  usersApi,
  type HistoryItem,
  type PharmaMapSummary,
} from "../../lib/api";
import {
  getOverallProgress,
  readPharmaProgressStore,
} from "../../lib/pharmaProgress";
import { useTheme } from "../../lib/theme";

function computeCaseStats(history: HistoryItem[]) {
  const completedHistory = history.filter(
    (h) => h.status === "completed" && h.score != null
  );
  const bestScoresByCase = new Map<string, number>();

  completedHistory.forEach((h) => {
    const currentHighest = bestScoresByCase.get(h.case_title) || 0;
    if (h.score! > currentHighest) {
      bestScoresByCase.set(h.case_title, h.score!);
    }
  });

  const uniqueCompletedCount = bestScoresByCase.size;
  const uniqueTotalCount = new Set(history.map((h) => h.case_title)).size;
  const avgScore =
    uniqueCompletedCount > 0
      ? Math.round(
          Array.from(bestScoresByCase.values()).reduce((sum, score) => sum + score, 0) /
            uniqueCompletedCount
        )
      : null;

  const activeCount = history.filter(
    (h) => h.status === "active" || h.status === "abandoned"
  ).length;

  return { uniqueCompletedCount, uniqueTotalCount, avgScore, activeCount };
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
}) {
  const theme = useTheme();
  return (
    <Card style={styles.statCard}>
      <Icon size={16} color={theme.foreground} />
      <Text style={[styles.statVal, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLbl, { color: theme.textMuted }]}>{label}</Text>
    </Card>
  );
}

export function CalisIlerlemeTab() {
  const theme = useTheme();

  const dashQuery = useQuery({
    queryKey: ["study", "dashboard"],
    queryFn: async () => (await studyApi.dashboard()).data,
  });
  const topicsQuery = useQuery({
    queryKey: ["study", "topics"],
    queryFn: async () => (await studyApi.topics()).data,
  });
  const historyQuery = useQuery({
    queryKey: ["users", "history"],
    queryFn: async () => (await usersApi.history()).data,
  });
  const qStatsQuery = useQuery({
    queryKey: ["questions", "stats"],
    queryFn: async () => (await questionsApi.stats()).data,
    retry: false,
  });
  const pharmaQuery = useQuery({
    queryKey: ["pharma", "maps"],
    queryFn: async () => (await pharmaApi.listMaps()).data,
    retry: false,
  });
  const notesQuery = useQuery({
    queryKey: ["users", "study-notes"],
    queryFn: async () => (await usersApi.getStudyNotes()).data,
    retry: false,
  });
  const pharmaStoreQuery = useQuery({
    queryKey: ["pharma", "progress"],
    queryFn: readPharmaProgressStore,
  });

  const loading =
    dashQuery.isLoading ||
    topicsQuery.isLoading ||
    historyQuery.isLoading ||
    pharmaStoreQuery.isLoading;

  const dash = dashQuery.data;
  const history = historyQuery.data ?? [];
  const topics = useMemo(
    () =>
      (topicsQuery.data ?? [])
        .filter((x) => x.seen > 0)
        .sort((a, b) => b.mastery_pct - a.mastery_pct),
    [topicsQuery.data]
  );
  const qStats = qStatsQuery.data;
  const pharmaMaps = pharmaQuery.data ?? [];
  const notesCount = notesQuery.data?.length ?? 0;
  const pharmaStore = pharmaStoreQuery.data ?? {};

  const caseStats = useMemo(() => computeCaseStats(history), [history]);
  const pharmaOverall = getOverallProgress(
    pharmaMaps.map((m) => m.id),
    pharmaStore
  );

  const openWeb = (path: string) => {
    void Haptics.selectionAsync();
    router.push({ pathname: "/web", params: { path } });
  };

  const openPharma = (mapId?: string) => {
    void Haptics.selectionAsync();
    if (mapId) {
      router.push(`/farmakoloji/${mapId}`);
    } else {
      router.push("/farmakoloji");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.foreground} />
      </View>
    );
  }

  const empty =
    !dash && topics.length === 0 && history.length === 0;

  return (
    <View style={styles.wrap}>
      {dash && (
        <Section title="Günlük MCQ çalışması">
          <View style={styles.statsRow}>
            <StatCard icon={Flame} value={dash.current_streak} label="Gün serisi" />
            <StatCard icon={Target} value={dash.longest_streak} label="En uzun seri" />
            <StatCard icon={Clock} value={dash.due_count} label="Tekrar due" />
            <StatCard
              icon={BarChart3}
              value={`${dash.answered_today}/${dash.daily_goal}`}
              label="Bugün"
            />
          </View>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Havuz: {dash.pool_mcq_count.toLocaleString("tr-TR")} TR acil sorusu
          </Text>
        </Section>
      )}

      {topics.length > 0 && (
        <Section title="Konu ustalığı (MCQ)">
          <View style={styles.ringsRow}>
            {topics.map((t) => (
              <TopicRing
                key={t.topic_slug}
                label={t.topic_label}
                masteryPct={t.mastery_pct}
                seen={t.seen}
              />
            ))}
          </View>
        </Section>
      )}

      {dash && dash.weak_topics.length > 0 && (
        <Section title="Zayıf konular">
          <Card>
            {dash.weak_topics.map((w, i) => (
              <View
                key={w.topic_slug}
                style={[
                  styles.weakRow,
                  i < dash.weak_topics.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.weakLabel, { color: theme.text }]}>
                  {w.topic_label}
                </Text>
                <Text style={[styles.weakCount, { color: theme.destructive }]}>
                  {w.wrong_count}/{w.total_count} yanlış
                </Text>
              </View>
            ))}
          </Card>
        </Section>
      )}

      <Section
        title="Vaka simülasyonu"
        action={
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.navigate("/(tabs)/vaka");
            }}
            style={styles.sectionAction}
          >
            <Text style={[styles.sectionActionTxt, { color: theme.textMuted }]}>
              Vakaya git
            </Text>
            <ChevronRight size={12} color={theme.textMuted} />
          </Pressable>
        }
      >
        <View style={styles.statsRow}>
          <StatCard icon={BookOpen} value={caseStats.uniqueTotalCount} label="Farklı vaka" />
          <StatCard icon={Trophy} value={caseStats.avgScore ?? "—"} label="Ort. skor" />
          <StatCard
            icon={CheckCircle2}
            value={caseStats.uniqueCompletedCount}
            label="Tamamlanan"
          />
          <StatCard icon={AlertTriangle} value={caseStats.activeCount} label="Yarım kalan" />
        </View>
      </Section>

      {qStats && qStats.attempted > 0 && (
        <Section title="Klasik soru bankası">
          <View style={styles.statsRow}>
            <StatCard icon={BookOpen} value={qStats.attempted} label="Çözülen" />
            <StatCard icon={CheckCircle2} value={qStats.correct} label="Doğru" />
            <StatCard icon={AlertTriangle} value={qStats.incorrect} label="Yanlış" />
            <StatCard
              icon={Trophy}
              value={`%${Math.round(qStats.correct_rate)}`}
              label="Başarı"
            />
          </View>
        </Section>
      )}

      {pharmaMaps.length > 0 && (
        <Section
          title="Farmakoloji haritaları"
          action={
            <Pressable
              onPress={() => openPharma()}
              style={styles.sectionAction}
            >
              <Text style={[styles.sectionActionTxt, { color: theme.textMuted }]}>
                Haritalar
              </Text>
              <ChevronRight size={12} color={theme.textMuted} />
            </Pressable>
          }
        >
          <Card style={styles.pharmaCard}>
            <View style={styles.pharmaHeader}>
              <Text style={[styles.pharmaTitle, { color: theme.text }]}>
                Genel ilerleme
              </Text>
              <Text style={[styles.pharmaPct, { color: theme.text }]}>
                {pharmaOverall.completed}/{pharmaOverall.total} (%{pharmaOverall.pct})
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.surfaceMuted }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${pharmaOverall.pct}%`,
                    backgroundColor: theme.foreground,
                  },
                ]}
              />
            </View>
            {pharmaMaps
              .sort((a, b) => a.order - b.order)
              .map((m: PharmaMapSummary) => {
                const p = pharmaStore[m.id] ?? {
                  visited: false,
                  quizCompleted: false,
                  quizScorePct: null,
                  pathTreeCompleted: false,
                  completedAt: null,
                };
                const status = p.quizCompleted
                  ? `✓ %${p.quizScorePct}`
                  : p.pathTreeCompleted
                    ? "Yolak ✓"
                    : p.visited
                      ? "Başlandı"
                      : "—";
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => openPharma(m.id)}
                    style={({ pressed }) => [
                      styles.mapRow,
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Pill size={12} color={theme.textMuted} style={{ opacity: 0.5 }} />
                    <Text
                      style={[styles.mapTitle, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {m.title_tr}
                    </Text>
                    <Text
                      style={[
                        styles.mapStatus,
                        { color: p.quizCompleted ? theme.success : theme.textMuted },
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
          </Card>
        </Section>
      )}

      <Section
        title="Kişisel özetler"
        action={
          <Pressable
            onPress={() => openWeb("/study-notes")}
            style={styles.sectionAction}
          >
            <Text style={[styles.sectionActionTxt, { color: theme.textMuted }]}>
              Özetler
            </Text>
            <ChevronRight size={12} color={theme.textMuted} />
          </Pressable>
        }
      >
        <Card style={styles.notesCard}>
          <PenLine size={16} color={theme.foreground} />
          <View>
            <Text style={[styles.notesCount, { color: theme.text }]}>{notesCount}</Text>
            <Text style={[styles.notesLbl, { color: theme.textMuted }]}>
              Kayıtlı özet
            </Text>
          </View>
        </Card>
      </Section>

      {empty && (
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          Henüz ilerleme verisi yok. Bugün sekmesinden çalışmaya başlayabilirsin.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24 },
  center: { paddingVertical: 48, alignItems: "center" },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 12,
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sectionActionTxt: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 4,
  },
  statVal: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 20,
  },
  statLbl: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 10,
  },
  hint: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 12,
  },
  ringsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  weakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
  },
  weakLabel: {
    flex: 1,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
  },
  weakCount: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 12,
  },
  pharmaCard: { gap: 10 },
  pharmaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pharmaTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
  },
  pharmaPct: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  mapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  mapTitle: {
    flex: 1,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 12,
  },
  mapStatus: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 12,
  },
  notesCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notesCount: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 20,
  },
  notesLbl: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 10,
  },
  empty: {
    textAlign: "center",
    fontSize: 14,
    paddingVertical: 24,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
});
