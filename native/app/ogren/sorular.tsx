import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
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
import { Card } from "../../components/ui/Card";
import type { Question, QuestionStats } from "../../lib/api";
import { questionsApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";

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

const LABELS = ["A", "B", "C", "D", "E"] as const;

/** Backend tüm soruları sıralayıp bu kadarını kesiyor; DB’deki toplam (ör. ~180) tek turda gelsin. */
const PRACTICE_LIMIT = 500;

export default function SorularScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<QuestionStats | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await questionsApi.stats();
      setStats(res.data);
    } catch {
      setStats(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await questionsApi.practice({ limit: PRACTICE_LIMIT });
      setQuestions(res.data);
      setIdx(0);
      setSelected(null);
      setResult(null);
      await loadStats();
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = questions[idx];

  const options = q
    ? [
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.option_e,
      ]
    : [];

  const submit = async () => {
    if (!q || !selected || submitting) return;
    setSubmitting(true);
    try {
      const res = await questionsApi.answer(q.id, selected);
      void Haptics.notificationAsync(
        res.data.is_correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      setResult({
        correct: res.data.is_correct,
        explanation: res.data.explanation,
      });
      void loadStats();
    } catch {
      setResult({ correct: false, explanation: "Yanıt gönderilemedi." });
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    setResult(null);
    setSelected(null);
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
    } else {
      void load();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Soru bankası</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : !q ? (
        <Text style={{ color: theme.textMuted, textAlign: "center", marginTop: 40 }}>
          Soru yüklenemedi.
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {stats ? (
            <Card
              style={[
                styles.statsCard,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
            >
              <Text style={[styles.statsTitle, { color: theme.text }]}>
                Çözüm istatistikleri
              </Text>
              <Text style={[styles.statsLine, { color: theme.textMuted }]}>
                Toplam soru: {stats.total_questions} · Denenen: {stats.attempted} · Doğru:{" "}
                {stats.correct} · Yanlış: {stats.incorrect}
              </Text>
              <Text style={[styles.statsPct, { color: theme.accent }]}>
                Başarı:{" "}
                {stats.attempted > 0
                  ? `${Math.round(stats.correct_rate * 100)}%`
                  : "—"}
              </Text>
            </Card>
          ) : null}
          <Text style={[styles.progress, { color: theme.textMuted }]}>
            Bu tur: {idx + 1} / {questions.length}
          </Text>
          <Card style={[styles.qCard, { borderColor: theme.border }]}>
            <Text style={[styles.qText, { color: theme.text }]}>{q.question_text}</Text>
          </Card>
          {options.map((text, i) => {
            const lab = LABELS[i];
            const active = selected === lab;
            return (
              <Pressable
                key={lab}
                disabled={!!result}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setSelected(lab);
                }}
                style={[
                  styles.opt,
                  {
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active ? theme.accent + "18" : theme.surface,
                  },
                ]}
              >
                <Text style={[styles.optLab, { color: theme.accent }]}>{lab}</Text>
                <Text style={[styles.optTxt, { color: theme.text }]}>{text}</Text>
              </Pressable>
            );
          })}
          {!result ? (
            <Pressable
              onPress={() => void submit()}
              disabled={!selected || submitting}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: theme.accent,
                  opacity: !selected || submitting ? 0.5 : 1,
                },
              ]}
            >
              <Text style={styles.primaryBtnTxt}>Yanıtla</Text>
            </Pressable>
          ) : (
            <>
              <Card
                style={[
                  styles.feedback,
                  {
                    borderColor: result.correct ? theme.success : theme.error,
                    backgroundColor: result.correct ? theme.success + "11" : theme.error + "11",
                  },
                ]}
              >
                <Text style={{ color: theme.text, fontFamily: fontBold() }}>
                  {result.correct ? "Doğru" : "Yanlış"}
                </Text>
                <Text style={{ color: theme.text, fontFamily: fontReg(), marginTop: 8 }}>
                  {result.explanation}
                </Text>
              </Card>
              <Pressable
                onPress={next}
                style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={styles.primaryBtnTxt}>Sonraki</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 16, fontFamily: fontBold() },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40 },
  statsCard: { padding: 14, marginBottom: 14, borderWidth: 1, borderRadius: 14 },
  statsTitle: { fontSize: 14, fontFamily: fontBold(), marginBottom: 6 },
  statsLine: { fontSize: 12, fontFamily: fontReg(), lineHeight: 18 },
  statsPct: { fontSize: 15, fontFamily: fontBold(), marginTop: 8 },
  progress: { fontSize: 12, marginBottom: 8, fontFamily: fontReg() },
  qCard: { padding: 14, marginBottom: 16, borderWidth: 1, borderRadius: 14 },
  qText: { fontSize: 16, lineHeight: 24, fontFamily: fontReg() },
  opt: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  optLab: { fontFamily: fontBold(), width: 22 },
  optTxt: { flex: 1, fontFamily: fontReg(), fontSize: 15 },
  primaryBtn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnTxt: { color: "#fff", fontFamily: fontBold(), fontSize: 16 },
  feedback: { padding: 14, borderWidth: 1, borderRadius: 14, marginTop: 8 },
});
