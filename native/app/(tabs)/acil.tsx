import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  emergencyMcqApi,
  type EmergencyMcqRandom,
  type EmergencyMcqReportCreateItem,
  type EmergencyMcqReportOut,
  type EmergencyMcqVerifyResult,
} from "../../lib/api";
import { useTheme } from "../../lib/theme";
import { X } from "lucide-react-native";

const QUESTION_SECONDS = 45;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

type Phase = "setup" | "quiz" | "summary" | "report";

function fontBlack() {
  return Platform.select({
    ios: "Inter_900Black",
    android: "Inter_900Black",
    default: "Inter_900Black",
  });
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

export default function AcilTab() {
  const router = useRouter();
  const theme = useTheme();

  const [phase, setPhase] = useState<Phase>("setup");
  const [target, setTarget] = useState<number | null>(null);

  const [current, setCurrent] = useState<EmergencyMcqRandom | null>(null);
  const [loadQuestion, setLoadQuestion] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [answered, setAnswered] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<EmergencyMcqVerifyResult | null>(
    null
  );

  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const [sessionItems, setSessionItems] = useState<EmergencyMcqReportCreateItem[]>(
    []
  );
  const [streak, setStreak] = useState(0);

  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState<EmergencyMcqReportOut | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const answeredRef = useRef(false);
  const questionStartRef = useRef(Date.now());

  const answeredCount = sessionItems.length;

  const progressRatio = useMemo(() => {
    if (target === null) {
      const cap = 20;
      return Math.min(1, answeredCount / cap);
    }
    if (target <= 0) return 0;
    return Math.min(1, answeredCount / target);
  }, [answeredCount, target]);

  const resetQuestionUi = useCallback(() => {
    setAnswered(false);
    answeredRef.current = false;
    setSelectedLabel(null);
    setVerifyResult(null);
    setExplanation(null);
    setExplanationLoading(false);
    setSecondsLeft(QUESTION_SECONDS);
    questionStartRef.current = Date.now();
  }, []);

  const fetchQuestion = useCallback(async () => {
    setLoadQuestion(true);
    setLoadError(null);
    try {
      const res = await emergencyMcqApi.random("tr");
      setCurrent(res.data);
      resetQuestionUi();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Soru yüklenemedi.";
      setLoadError(msg);
    } finally {
      setLoadQuestion(false);
    }
  }, [resetQuestionUi]);

  const startSession = useCallback(
    async (t: number | null) => {
      setTarget(t);
      setSessionItems([]);
      setStreak(0);
      setReport(null);
      setPhase("quiz");
      await fetchQuestion();
    },
    [fetchQuestion]
  );

  const onTimeout = useCallback(() => {
    if (answeredRef.current || !current) return;
    answeredRef.current = true;
    setAnswered(true);
    setSelectedLabel(null);
    setStreak(0);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    const item: EmergencyMcqReportCreateItem = {
      question_id: current.id,
      question_preview: current.question.slice(0, 280),
      correct: false,
      elapsed_sec: elapsed,
      selected_label: null,
    };
    setSessionItems((prev) => [...prev, item]);
    setVerifyResult({
      correct: false,
      correct_label: null,
      correct_answer_text: null,
    });
  }, [current]);

  useEffect(() => {
    answeredRef.current = answered;
  }, [answered]);

  useEffect(() => {
    if (phase !== "quiz" || !current || answered) {
      return;
    }
    setSecondsLeft(QUESTION_SECONDS);
    questionStartRef.current = Date.now();
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          onTimeout();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, current?.id, answered, onTimeout]);

  const displayOptions = useMemo(() => {
    if (!current?.options?.length) return [];
    const byLabel = new Map(
      current.options.map((o) => [String(o.label).toUpperCase(), o])
    );
    return OPTION_LABELS.map((L) => byLabel.get(L)).filter(Boolean) as {
      label: string;
      text: string;
    }[];
  }, [current]);

  const onSelectOption = async (label: string) => {
    if (answeredRef.current || answered || !current) return;
    answeredRef.current = true;
    setAnswered(true);
    setSelectedLabel(label);
    setExplanation(null);

    let verify: EmergencyMcqVerifyResult;
    try {
      const res = await emergencyMcqApi.verify(current.id, label);
      verify = res.data;
    } catch {
      verify = {
        correct: false,
        correct_label: null,
        correct_answer_text: null,
      };
    }
    setVerifyResult(verify);

    if (verify.correct) {
      setStreak((x) => x + 1);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      setStreak(0);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    const item: EmergencyMcqReportCreateItem = {
      question_id: current.id,
      question_preview: current.question.slice(0, 280),
      correct: verify.correct,
      elapsed_sec: elapsed,
      selected_label: label,
    };
    setSessionItems((prev) => [...prev, item]);

    setExplanationLoading(true);
    try {
      const ex = await emergencyMcqApi.explanation(current.id, label, "tr");
      setExplanation(ex.data.explanation);
    } catch {
      setExplanation("Açıklama yüklenemedi.");
    } finally {
      setExplanationLoading(false);
    }
  };

  const shouldEndSession = useCallback(() => {
    if (target === null) return false;
    return sessionItems.length >= target;
  }, [target, sessionItems.length]);

  const goNext = useCallback(async () => {
    if (shouldEndSession()) {
      setPhase("summary");
      return;
    }
    await fetchQuestion();
  }, [shouldEndSession, fetchQuestion]);

  const finishInfinite = useCallback(() => {
    if (sessionItems.length === 0) {
      setPhase("setup");
      setTarget(null);
      setCurrent(null);
      return;
    }
    setPhase("summary");
  }, [sessionItems.length]);

  /** Hedefli modda (5/10/20) da erken bitiş — özet ekranına geç */
  const finishSessionEarly = useCallback(() => {
    if (sessionItems.length === 0) {
      Alert.alert(
        "Oturum",
        "Henüz cevaplanmış soru yok. Oturumu kapatılsın mı?",
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Kapat",
            style: "destructive",
            onPress: () => {
              setPhase("setup");
              setTarget(null);
              setCurrent(null);
              setSessionItems([]);
            },
          },
        ]
      );
      return;
    }
    Alert.alert(
      "Oturumu bitir",
      "Şu ana kadar cevapladığın sorularla özet oluşturulsun mu?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Bitir",
          onPress: () => setPhase("summary"),
        },
      ]
    );
  }, [sessionItems.length]);

  const createReport = async () => {
    setReportLoading(true);
    setReport(null);
    setReportError(null);
    try {
      const res = await emergencyMcqApi.createReport({
        items: sessionItems,
        ai_messages: [],
        patient_urges: [],
      });
      setReport(res.data);
      setPhase("report");
    } catch (e: unknown) {
      setReport(null);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Rapor oluşturulamadı.";
      setReportError(msg);
    } finally {
      setReportLoading(false);
    }
  };

  const newSession = () => {
    setPhase("setup");
    setTarget(null);
    setCurrent(null);
    setSessionItems([]);
    setReport(null);
    setReportError(null);
    setStreak(0);
    resetQuestionUi();
  };

  const timerMmSs = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const optionStyle = (label: string) => {
    if (!answered || !verifyResult) {
      return {
        borderColor: theme.border,
        backgroundColor: theme.card,
      };
    }
    const L = label.toUpperCase();
    const correctL = verifyResult.correct_label
      ? String(verifyResult.correct_label).toUpperCase()
      : null;
    const picked = selectedLabel ? selectedLabel.toUpperCase() : null;
    const isCorrectPick = verifyResult.correct && picked === L;
    const isWrongPick = picked === L && !verifyResult.correct;
    const isCorrectReveal =
      Boolean(correctL && picked && picked !== correctL && L === correctL);

    if (isCorrectPick) {
      return {
        borderColor: theme.success,
        backgroundColor: `${theme.success}22`,
      };
    }
    if (isWrongPick) {
      return {
        borderColor: theme.error,
        backgroundColor: `${theme.error}22`,
      };
    }
    if (isCorrectReveal) {
      return {
        borderColor: theme.success,
        backgroundColor: `${theme.success}18`,
      };
    }
    return {
      borderColor: theme.border,
      backgroundColor: theme.card,
    };
  };

  const correctN = sessionItems.filter((i) => i.correct).length;
  const wrongN = sessionItems.length - correctN;
  const pct =
    sessionItems.length > 0
      ? Math.round((correctN / sessionItems.length) * 100)
      : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      {phase === "quiz" ? (
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={
              target === null ? finishInfinite : finishSessionEarly
            }
            style={({ pressed }) => [
              styles.endBtn,
              { borderColor: theme.textMuted, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Text style={[styles.endBtnText, { color: theme.textMuted }]}>
              Oturumu Bitir
            </Text>
          </Pressable>
          <Text style={[styles.streak, { color: theme.accent }]}>
            🔥 {streak}
          </Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {phase === "quiz" ? (
          <>
            <View style={styles.progressBlock}>
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${target === null ? Math.min(100, progressRatio * 100) : progressRatio * 100}%`,
                      backgroundColor: theme.accent,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
                {answeredCount} / {target === null ? "∞" : target}
              </Text>
            </View>

            {loadQuestion ? (
              <View style={styles.centerPad}>
                <ActivityIndicator size="large" color={theme.accent} />
              </View>
            ) : loadError ? (
              <Card>
                <Text style={[styles.body, { color: theme.error }]}>
                  {loadError}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <Button label="Tekrar Dene" onPress={() => void fetchQuestion()} />
                </View>
              </Card>
            ) : current ? (
              <>
                <View style={styles.timerRow}>
                  <Text style={[styles.timer, { color: theme.text }]}>
                    {timerMmSs}
                  </Text>
                </View>

                <Text style={[styles.question, { color: theme.text }]}>
                  {current.question}
                </Text>

                <View style={styles.options}>
                  {displayOptions.map((opt) => (
                    <Pressable
                      key={opt.label}
                      accessibilityRole="button"
                      disabled={answered}
                      onPress={() => void onSelectOption(String(opt.label).toUpperCase())}
                      style={({ pressed }) => [
                        styles.optionBtn,
                        optionStyle(String(opt.label).toUpperCase()),
                        pressed && !answered && { opacity: 0.88 },
                        answered && { opacity: 1 },
                      ]}
                    >
                      <Text style={[styles.optionLetter, { color: theme.accent }]}>
                        {opt.label}.
                      </Text>
                      <Text style={[styles.optionText, { color: theme.text }]}>
                        {opt.text}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {answered && verifyResult && selectedLabel ? (
                  <Card style={styles.explainCard}>
                    <Text style={[styles.explainTitle, { color: theme.text }]}>
                      Açıklama
                    </Text>
                    {explanationLoading ? (
                      <ActivityIndicator color={theme.accent} style={{ marginVertical: 12 }} />
                    ) : (
                      <Text style={[styles.body, { color: theme.textMuted }]}>
                        {explanation ?? "—"}
                      </Text>
                    )}
                  </Card>
                ) : null}

                {answered && verifyResult && !selectedLabel ? (
                  <Card style={styles.explainCard}>
                    <Text style={[styles.body, { color: theme.textMuted }]}>
                      Süre doldu — bu soru yanlış sayıldı.
                    </Text>
                  </Card>
                ) : null}

                {answered ? (
                  <View style={styles.nextWrap}>
                    <Button label="Sonraki Soru" onPress={() => void goNext()} />
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {phase === "summary" ? (
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Oturum Özeti</Text>
            <Card>
              <Text style={[styles.bigScore, { color: theme.accent }]}>{pct}%</Text>
              <Text style={[styles.summaryLine, { color: theme.textMuted }]}>
                Doğru: {correctN} · Yanlış: {wrongN} · Toplam: {sessionItems.length}
              </Text>
            </Card>
            {reportError ? (
              <Text style={[styles.body, { color: theme.error, marginTop: 8 }]}>
                {reportError}
              </Text>
            ) : null}
            <View style={{ marginTop: 16 }}>
              <Button
                label="Rapor Oluştur"
                onPress={() => void createReport()}
                loading={reportLoading}
              />
            </View>
            <View style={{ marginTop: 12 }}>
              <Button variant="outline" label="Yeni Oturum" onPress={newSession} />
            </View>
          </View>
        ) : null}

        {phase === "report" && report ? (
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Acil Raporu</Text>
            <Card>
              <Text style={[styles.bigScore, { color: theme.accent }]}>
                {report.score}
              </Text>
              <Text style={[styles.summaryLine, { color: theme.textMuted }]}>
                {report.correct_count} / {report.total_count} doğru
              </Text>
              {report.overview_note ? (
                <Text style={[styles.body, { color: theme.text, marginTop: 12 }]}>
                  {report.overview_note}
                </Text>
              ) : null}
            </Card>

            {report.strengths?.length ? (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionH, { color: theme.success }]}>
                  Güçlü Yönler
                </Text>
                {report.strengths.map((s, i) => (
                  <Text
                    key={`s-${i}`}
                    style={[styles.listItem, { color: theme.textMuted }]}
                  >
                    • {s}
                  </Text>
                ))}
              </Card>
            ) : null}

            {report.gaps?.length ? (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionH, { color: theme.error }]}>Açıklar</Text>
                {report.gaps.map((s, i) => (
                  <Text
                    key={`g-${i}`}
                    style={[styles.listItem, { color: theme.textMuted }]}
                  >
                    • {s}
                  </Text>
                ))}
              </Card>
            ) : null}

            {report.recommendations?.length ? (
              <Card style={{ marginTop: 12 }}>
                <Text style={[styles.sectionH, { color: theme.accent }]}>
                  Öneriler
                </Text>
                {report.recommendations.map((s, i) => (
                  <Text
                    key={`r-${i}`}
                    style={[styles.listItem, { color: theme.textMuted }]}
                  >
                    • {s}
                  </Text>
                ))}
              </Card>
            ) : null}

            <View style={{ marginTop: 16 }}>
              <Button label="Yeni Oturum" onPress={newSession} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={phase === "setup"} transparent animationType="fade">
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: "#000000aa" }]}
          onPress={() => router.back()}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Pressable
              onPress={() => router.back()}
              style={{ position: "absolute", top: 12, right: 12, padding: 8 }}
            >
              <X size={20} color={theme.textMuted} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Oturum hedefi
            </Text>
            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Kaç soruda bitecek?
            </Text>

            <View style={styles.goalRow}>
              <Pressable
                style={[styles.goalBtn, { borderColor: theme.border }]}
                onPress={() => void startSession(null)}
              >
                <Text style={[styles.goalLabel, { color: theme.text }]}>∞</Text>
              </Pressable>
              {([5, 10, 20] as const).map((n) => (
                <Pressable
                  key={n}
                  style={[styles.goalBtn, { borderColor: theme.border }]}
                  onPress={() => void startSession(n)}
                >
                  <Text style={[styles.goalLabel, { color: theme.text }]}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
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
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    minHeight: 44,
  },
  endBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  endBtnText: {
    fontFamily: fontBold(),
    fontSize: 13,
  },
  streak: {
    fontFamily: fontBold(),
    fontSize: 16,
  },
  progressBlock: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabel: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: fontBold(),
  },
  timerRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  timer: {
    fontFamily: fontBlack(),
    fontSize: 22,
    letterSpacing: 1,
  },
  question: {
    fontFamily: fontBold(),
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 20,
  },
  options: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  optionLetter: {
    fontFamily: fontBold(),
    fontSize: 16,
    minWidth: 22,
  },
  optionText: {
    flex: 1,
    fontFamily: fontReg(),
    fontSize: 15,
    lineHeight: 22,
  },
  explainCard: {
    marginTop: 16,
  },
  explainTitle: {
    fontFamily: fontBold(),
    fontSize: 16,
    marginBottom: 8,
  },
  body: {
    fontFamily: fontReg(),
    fontSize: 15,
    lineHeight: 22,
  },
  nextWrap: {
    marginTop: 20,
  },
  centerPad: {
    paddingVertical: 48,
    alignItems: "center",
  },
  title: {
    fontFamily: fontBlack(),
    fontSize: 24,
    marginBottom: 16,
  },
  bigScore: {
    fontFamily: fontBlack(),
    fontSize: 44,
    textAlign: "center",
  },
  summaryLine: {
    marginTop: 8,
    fontFamily: fontReg(),
    fontSize: 15,
    textAlign: "center",
  },
  sectionH: {
    fontFamily: fontBold(),
    fontSize: 15,
    marginBottom: 8,
  },
  listItem: {
    fontFamily: fontReg(),
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontFamily: fontBlack(),
    fontSize: 22,
    textAlign: "center",
  },
  modalSub: {
    fontFamily: fontReg(),
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  goalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  goalBtn: {
    minWidth: 72,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  goalLabel: {
    fontFamily: fontBlack(),
    fontSize: 20,
  },
});
