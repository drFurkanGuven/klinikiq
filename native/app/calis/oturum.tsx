import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  studyApi,
  type StudyAnswerResult,
  type StudyQuestion,
  type StudySessionStart,
} from "../../lib/api";
import { useTheme } from "../../lib/theme";

type Mode = "daily" | "acil" | "usmle";

const OPTION_LABELS = ["A", "B", "C", "D", "E"] as const;

export default function CalisOturumScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ goal?: string; mode?: string }>();

  const mode: Mode =
    params.mode === "usmle" ? "usmle" : params.mode === "acil" ? "acil" : "daily";
  const goal =
    params.goal === "5" || params.goal === "20" ? Number(params.goal) : 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StudySessionStart | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<StudyAnswerResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const questionStart = useRef(Date.now());

  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDone(false);
    setIndex(0);
    setPicked(null);
    setResult(null);
    setCorrectCount(0);
    try {
      const res = await studyApi.startSession(goal, mode);
      setSession(res.data);
      questionStart.current = Date.now();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { detail?: string } } };
      setError(ax.response?.data?.detail ?? "Oturum başlatılamadı.");
    } finally {
      setLoading(false);
    }
  }, [goal, mode]);

  useEffect(() => {
    void startSession();
  }, [startSession]);

  const current: StudyQuestion | undefined = session?.questions[index];
  const total = session?.questions.length ?? 0;

  const submit = async (label: string) => {
    if (!current || !session || submitting || result) return;
    setPicked(label);
    setSubmitting(true);
    const elapsed = Date.now() - questionStart.current;
    try {
      const res = await studyApi.answer({
        mcq_id: current.mcq_id,
        pool: current.pool,
        selected_label: label,
        session_id: session.session_id,
        elapsed_ms: elapsed,
      });
      setResult(res.data);
      if (res.data.correct) {
        setCorrectCount((c) => c + 1);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError("Cevap gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!session) return;
    if (index + 1 >= session.questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    setResult(null);
    questionStart.current = Date.now();
  };

  const title =
    mode === "usmle"
      ? "USMLE Pratik"
      : mode === "acil"
        ? "Acil Çalışma"
        : "Günlük Çalışma";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <ArrowLeft size={22} color={theme.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.text }]}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.foreground} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.center}>
          <Text style={[styles.error, { color: theme.destructive }]}>{error}</Text>
          <Button label="Tekrar dene" onPress={() => void startSession()} />
        </View>
      )}

      {done && session && (
        <View style={styles.summary}>
          <CheckCircle2 size={48} color={theme.foreground} />
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            Oturum tamamlandı
          </Text>
          <Text style={[styles.summaryScore, { color: theme.textMuted }]}>
            {correctCount} / {total} doğru
          </Text>
          <Button label="Çalış'a dön" onPress={() => router.back()} />
        </View>
      )}

      {!loading && !error && !done && current && session && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.progressRow}>
            <Text style={[styles.progress, { color: theme.textMuted }]}>
              {index + 1} / {total}
            </Text>
            {current.is_review && (
              <Text style={[styles.reviewBadge, { color: theme.textMuted }]}>
                Tekrar
              </Text>
            )}
          </View>

          {current.topic_label ? (
            <Text style={[styles.topic, { color: theme.textMuted }]}>
              {current.topic_label}
            </Text>
          ) : null}

          <Text style={[styles.question, { color: theme.text }]}>
            {current.question}
          </Text>

          <View style={styles.options}>
            {current.options.map((opt: { label: string; text: string }) => {
              const isPicked = picked === opt.label;
              const isCorrect = result?.correct_label === opt.label;
              const isWrong = isPicked && result && !result.correct;

              let borderColor = theme.border;
              let bg = theme.surface;
              if (result) {
                if (isCorrect) {
                  borderColor = theme.success;
                  bg = theme.successMuted;
                } else if (isWrong) {
                  borderColor = theme.destructive;
                  bg = theme.destructiveMuted;
                }
              } else if (isPicked) {
                borderColor = theme.foreground;
              }

              return (
                <Pressable
                  key={opt.label}
                  disabled={!!result || submitting}
                  onPress={() => void submit(opt.label)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor,
                      backgroundColor: bg,
                      opacity: pressed && !result ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.optLabel, { color: theme.textMuted }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optText, { color: theme.text }]}>
                    {opt.text}
                  </Text>
                  {result && isCorrect && (
                    <CheckCircle2 size={18} color={theme.success} />
                  )}
                  {result && isWrong && (
                    <XCircle size={18} color={theme.destructive} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {result && (
            <Card muted style={styles.feedback}>
              <Text
                style={[
                  styles.feedbackTitle,
                  { color: result.correct ? theme.success : theme.destructive },
                ]}
              >
                {result.correct ? "Doğru" : "Yanlış"}
              </Text>
              {!result.correct && result.correct_answer_text ? (
                <Text style={[styles.feedbackBody, { color: theme.textMuted }]}>
                  Doğru cevap: {result.correct_answer_text}
                </Text>
              ) : null}
              {result.remediation?.topic_label ? (
                <Text style={[styles.feedbackBody, { color: theme.textMuted }]}>
                  Konu: {result.remediation.topic_label}
                </Text>
              ) : null}
              <Button
                label={
                  index + 1 >= total ? "Bitir" : "Sonraki soru"
                }
                onPress={next}
              />
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  error: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
    textAlign: "center",
  },
  scroll: { padding: 16, paddingBottom: 40, gap: 16 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progress: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 13,
  },
  reviewBadge: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topic: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 12,
  },
  question: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 17,
    lineHeight: 24,
  },
  options: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  optLabel: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 14,
    width: 20,
  },
  optText: {
    flex: 1,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 15,
    lineHeight: 21,
  },
  feedback: { gap: 10, marginTop: 8 },
  feedbackTitle: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 16,
  },
  feedbackBody: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
    lineHeight: 20,
  },
  summary: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  summaryTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 22,
  },
  summaryScore: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 16,
    marginBottom: 16,
  },
});
