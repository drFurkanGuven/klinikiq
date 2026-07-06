import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
import type { PracticeMcqItem, Question, QuestionStats } from "../../lib/api";
import { practiceMcqApi, questionsApi } from "../../lib/api";
import {
  downloadAndSave,
  getLocalVersion,
  getRandom,
  getStats,
} from "../../lib/usePracticeMcqStore";
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

const USMLE_SPECIALTIES: Record<string, string> = {
  cardiology: "Kardiyoloji",
  pulmonology: "Pnömoloji",
  gastroenterology: "Gastroenteroloji",
  nephrology: "Nefroloji",
  neurology: "Nöroloji",
  endocrinology: "Endokrinoloji",
  hematology: "Hematoloji",
  infectious_disease: "Enfeksiyon",
  psychiatry: "Psikiyatri",
  rheumatology: "Romatoloji",
  obstetrics: "Obstetri",
  pediatrics: "Pediatri",
  oncology: "Onkoloji",
  other: "Diğer",
};

export default function SorularScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"case" | "usmle">("case");
  const prevTab = useRef<"case" | "usmle">("case");

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

  const [usmleQuestion, setUsmleQuestion] = useState<PracticeMcqItem | null>(
    null
  );
  const [usmleSelected, setUsmleSelected] = useState<string | null>(null);
  const [usmleResult, setUsmleResult] = useState<{
    correct: boolean;
    correct_label: string;
    correct_answer_text: string;
  } | null>(null);
  const [usmleSubmitting, setUsmleSubmitting] = useState(false);
  const [usmleDownloading, setUsmleDownloading] = useState(false);
  const [usmleDownloadTotal, setUsmleDownloadTotal] = useState(0);
  const [usmleError, setUsmleError] = useState<string | null>(null);
  const [usmleSpecialty, setUsmleSpecialty] = useState("");
  const [usmleStep, setUsmleStep] = useState<"all" | "step1" | "step2&3">(
    "all"
  );
  const [usmleSession, setUsmleSession] = useState({ correct: 0, wrong: 0 });
  const [usmleStats, setUsmleStats] = useState<{
    total: number;
    by_specialty: Record<string, number>;
    by_step: Record<string, number>;
  } | null>(null);

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

  useEffect(() => {
    if (activeTab === "usmle" && prevTab.current !== "usmle") {
      setUsmleSession({ correct: 0, wrong: 0 });
    }
    prevTab.current = activeTab;
  }, [activeTab]);

  const loadNextUsmle = useCallback(async () => {
    const step =
      usmleStep === "all"
        ? "all"
        : usmleStep === "step1"
          ? "step1"
          : "step2&3";
    const q = await getRandom({
      specialty: usmleStep === "step1" ? undefined : usmleSpecialty || undefined,
      step,
    });
    setUsmleQuestion(q);
    setUsmleSelected(null);
    setUsmleResult(null);
  }, [usmleSpecialty, usmleStep]);

  useEffect(() => {
    if (activeTab !== "usmle") return;
    let cancelled = false;
    (async () => {
      setUsmleError(null);
      try {
        const local = await getLocalVersion();
        const remoteRes = await practiceMcqApi.catalogVersion();
        const remote = remoteRes.data;
        const needsDownload =
          !local ||
          local.version !== remote.version ||
          local.total !== remote.total;

        if (needsDownload) {
          setUsmleDownloading(true);
          setUsmleDownloadTotal(remote.total);
          await downloadAndSave();
          if (cancelled) return;
          setUsmleDownloading(false);
        }

        const s = await getStats();
        if (cancelled) return;
        setUsmleStats(s);

        const step =
          usmleStep === "all"
            ? "all"
            : usmleStep === "step1"
              ? "step1"
              : "step2&3";
        const q = await getRandom({
          specialty:
            usmleStep === "step1" ? undefined : usmleSpecialty || undefined,
          step,
        });
        if (!cancelled) {
          setUsmleQuestion(q);
          setUsmleSelected(null);
          setUsmleResult(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setUsmleDownloading(false);
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[USMLE] yükleme hatası:", msg);
          setUsmleError("USMLE verisi yüklenemedi: " + msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, usmleSpecialty, usmleStep]);

  const q = questions[idx];

  const options = q
    ? [q.option_a, q.option_b, q.option_c, q.option_d, q.option_e]
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

  const submitUsmle = async () => {
    if (!usmleQuestion || !usmleSelected || usmleResult || usmleSubmitting)
      return;
    setUsmleSubmitting(true);
    try {
      const res = await practiceMcqApi.verify(usmleQuestion.id, usmleSelected);
      void Haptics.notificationAsync(
        res.data.correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      setUsmleResult(res.data);
      setUsmleSession((prev) => ({
        correct: prev.correct + (res.data.correct ? 1 : 0),
        wrong: prev.wrong + (res.data.correct ? 0 : 1),
      }));
    } catch {
      setUsmleResult({
        correct: false,
        correct_label: "",
        correct_answer_text: "",
      });
    } finally {
      setUsmleSubmitting(false);
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

  const showUsmleSticky =
    activeTab === "usmle" && (usmleSession.correct > 0 || usmleSession.wrong > 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Soru bankası</Text>
        <View style={{ width: 40 }} />
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 6,
          padding: 4,
          marginHorizontal: 16,
          marginBottom: 12,
          backgroundColor: theme.card,
          borderRadius: 14,
        }}
      >
        {(["case", "usmle"] as const).map((tab) => {
          const label = tab === "case" ? "Vaka Soruları" : "USMLE Bankası";
          const on = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => {
                void Haptics.selectionAsync();
                setActiveTab(tab);
              }}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: on ? theme.accent : "transparent",
              }}
            >
              <Text
                style={{
                  fontFamily: fontBold(),
                  fontSize: 13,
                  color: on ? "#FFFFFF" : theme.textMuted,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "case" && (
        <>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : !q ? (
            <Text
              style={{
                color: theme.textMuted,
                textAlign: "center",
                marginTop: 40,
              }}
            >
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
                    Toplam soru: {stats.total_questions} · Denenen:{" "}
                    {stats.attempted} · Doğru: {stats.correct} · Yanlış:{" "}
                    {stats.incorrect}
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
                <Text style={[styles.qText, { color: theme.text }]}>
                  {q.question_text}
                </Text>
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
                        backgroundColor: active
                          ? theme.accent + "18"
                          : theme.surface,
                      },
                    ]}
                  >
                    <Text style={[styles.optLab, { color: theme.accent }]}>
                      {lab}
                    </Text>
                    <Text style={[styles.optTxt, { color: theme.text }]}>
                      {text}
                    </Text>
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
                  <Text style={[styles.primaryBtnTxt, { color: "#FFFFFF" }]}>
                    Yanıtla
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Card
                    style={[
                      styles.feedback,
                      {
                        borderColor: result.correct ? theme.success : theme.error,
                        backgroundColor: result.correct
                          ? theme.success + "11"
                          : theme.error + "11",
                      },
                    ]}
                  >
                    <Text style={{ color: theme.text, fontFamily: fontBold() }}>
                      {result.correct ? "Doğru" : "Yanlış"}
                    </Text>
                    <Text
                      style={{
                        color: theme.text,
                        fontFamily: fontReg(),
                        marginTop: 8,
                      }}
                    >
                      {result.explanation}
                    </Text>
                  </Card>
                  <Pressable
                    onPress={next}
                    style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
                  >
                    <Text style={[styles.primaryBtnTxt, { color: "#FFFFFF" }]}>
                      Sonraki
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          )}
        </>
      )}

      {activeTab === "usmle" && (
        <View style={{ flex: 1 }}>
          {usmleDownloading ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <ActivityIndicator size="large" color={theme.accent} />
              <Text
                style={{
                  fontFamily: fontBold(),
                  color: theme.text,
                  fontSize: 15,
                }}
              >
                Sorular indiriliyor...
              </Text>
              <Text
                style={{
                  fontFamily: fontReg(),
                  color: theme.textMuted,
                  fontSize: 13,
                }}
              >
                {usmleDownloadTotal.toLocaleString("tr-TR")} soru · Bir kez
                yapılır
              </Text>
            </View>
          ) : usmleError ? (
            <Text
              style={{
                color: theme.error,
                textAlign: "center",
                marginTop: 32,
                paddingHorizontal: 24,
                fontFamily: fontReg(),
              }}
            >
              {usmleError}
            </Text>
          ) : usmleStats ? (
            <ScrollView
              contentContainerStyle={{
                padding: 16,
                paddingBottom: showUsmleSticky ? insets.bottom + 72 : 40,
              }}
            >
              <Card
                style={[
                  styles.statsCard,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                ]}
              >
                <Text style={[styles.statsTitle, { color: theme.text }]}>
                  USMLE havuzu
                </Text>
                <Text style={[styles.statsPct, { color: theme.accent }]}>
                  {usmleStats.total.toLocaleString("tr-TR")} soru
                </Text>
                <Text style={[styles.statsLine, { color: theme.textMuted }]}>
                  Step 1:{" "}
                  {(usmleStats.by_step["step1"] ?? 0).toLocaleString("tr-TR")}{" "}
                  · Step 2&3:{" "}
                  {(usmleStats.by_step["step2&3"] ?? 0).toLocaleString("tr-TR")}
                </Text>
              </Card>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
              >
                {(
                  [
                    { id: "all" as const, label: "Tümü" },
                    { id: "step1" as const, label: "Step 1" },
                    { id: "step2&3" as const, label: "Step 2&3" },
                  ] as const
                ).map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setUsmleStep(p.id);
                      if (p.id === "step1" || p.id === "step2&3") {
                        if (
                          (p.id === "step1" && usmleStep === "step2&3") ||
                          (p.id === "step2&3" && usmleStep === "step1")
                        ) {
                          setUsmleSpecialty("");
                        }
                      }
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor:
                        usmleStep === p.id ? theme.accent : theme.surface,
                      borderWidth: 1,
                      borderColor:
                        usmleStep === p.id ? theme.accent : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontBold(),
                        fontSize: 12,
                        color: usmleStep === p.id ? "#FFFFFF" : theme.textMuted,
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {usmleStep === "step1" ? (
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 12,
                    textAlign: "center",
                    marginBottom: 12,
                    fontFamily: fontReg(),
                  }}
                >
                  Step 1 temel bilimleri kapsar — branş filtresi Step 2&3 için
                  geçerlidir
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
                >
                  <Pressable
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setUsmleSpecialty("");
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor:
                        usmleSpecialty === "" ? theme.accent : theme.surface,
                      borderWidth: 1,
                      borderColor:
                        usmleSpecialty === "" ? theme.accent : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontBold(),
                        fontSize: 11,
                        color:
                          usmleSpecialty === "" ? "#FFFFFF" : theme.textMuted,
                      }}
                    >
                      Tümü
                    </Text>
                  </Pressable>
                  {Object.entries(USMLE_SPECIALTIES).map(([key, label]) => (
                    <Pressable
                      key={key}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setUsmleSpecialty(key === usmleSpecialty ? "" : key);
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor:
                          usmleSpecialty === key ? theme.accent : theme.card,
                        borderWidth: 1,
                        borderColor:
                          usmleSpecialty === key ? theme.accent : theme.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fontBold(),
                          fontSize: 11,
                          color:
                            usmleSpecialty === key
                              ? "#FFFFFF"
                              : theme.textMuted,
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {!usmleQuestion ? (
                <Text
                  style={{
                    color: theme.textMuted,
                    textAlign: "center",
                    marginTop: 24,
                    fontFamily: fontReg(),
                  }}
                >
                  Filtreye uyan soru yok.
                </Text>
              ) : (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: theme.card,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.border,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.accent,
                          fontFamily: fontBold(),
                          fontSize: 11,
                        }}
                      >
                        USMLE{" "}
                        {usmleQuestion.meta_info === "step1"
                          ? "Step 1"
                          : "Step 2&3"}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: theme.card,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: theme.border,
                      }}
                    >
                      <Text
                        style={{
                          color: theme.accent,
                          fontFamily: fontBold(),
                          fontSize: 11,
                        }}
                      >
                        {USMLE_SPECIALTIES[usmleQuestion.specialty] ||
                          usmleQuestion.specialty}
                      </Text>
                    </View>
                  </View>

                  <Card style={[styles.qCard, { borderColor: theme.border }]}>
                    <Text style={[styles.qText, { color: theme.text }]}>
                      {usmleQuestion.question}
                    </Text>
                  </Card>

                  {usmleQuestion.options.map((opt) => {
                    const lab = opt.label.trim().toUpperCase();
                    const active = usmleSelected === lab;
                    return (
                      <Pressable
                        key={lab}
                        disabled={!!usmleResult}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setUsmleSelected(lab);
                        }}
                        style={[
                          styles.opt,
                          {
                            borderColor: active ? theme.accent : theme.border,
                            backgroundColor: active
                              ? theme.accent + "18"
                              : theme.surface,
                          },
                        ]}
                      >
                        <Text style={[styles.optLab, { color: theme.accent }]}>
                          {lab}
                        </Text>
                        <Text style={[styles.optTxt, { color: theme.text }]}>
                          {opt.text}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {!usmleResult ? (
                    <Pressable
                      onPress={() => void submitUsmle()}
                      disabled={!usmleSelected || usmleSubmitting}
                      style={[
                        styles.primaryBtn,
                        {
                          backgroundColor: theme.accent,
                          opacity: !usmleSelected || usmleSubmitting ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.primaryBtnTxt, { color: "#FFFFFF" }]}>
                        Yanıtla
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <Card
                        style={[
                          styles.feedback,
                          {
                            borderColor: usmleResult.correct
                              ? theme.success
                              : theme.error,
                            backgroundColor: usmleResult.correct
                              ? theme.success + "11"
                              : theme.error + "11",
                          },
                        ]}
                      >
                        <Text
                          style={{ color: theme.text, fontFamily: fontBold() }}
                        >
                          {usmleResult.correct ? "Doğru" : "Yanlış"}
                        </Text>
                        <Text
                          style={{
                            color: theme.text,
                            fontFamily: fontReg(),
                            marginTop: 8,
                          }}
                        >
                          Doğru cevap: {usmleResult.correct_answer_text}
                        </Text>
                      </Card>
                      <Pressable
                        onPress={() => void loadNextUsmle()}
                        style={[
                          styles.primaryBtn,
                          { backgroundColor: theme.accent },
                        ]}
                      >
                        <Text
                          style={[styles.primaryBtnTxt, { color: "#FFFFFF" }]}
                        >
                          Sonraki soru
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.center}>
              <ActivityIndicator color={theme.accent} />
            </View>
          )}

          {showUsmleSticky && (
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                flexDirection: "row",
                justifyContent: "center",
                gap: 24,
                paddingVertical: 12,
                paddingBottom: insets.bottom + 12,
                backgroundColor: theme.surface,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.success,
                  fontFamily: fontBold(),
                  fontSize: 14,
                }}
              >
                ✓ {usmleSession.correct} Doğru
              </Text>
              <Text style={{ color: theme.textMuted }}>|</Text>
              <Text
                style={{
                  color: theme.error,
                  fontFamily: fontBold(),
                  fontSize: 14,
                }}
              >
                ✗ {usmleSession.wrong} Yanlış
              </Text>
            </View>
          )}
        </View>
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
  primaryBtnTxt: { fontFamily: fontBold(), fontSize: 16 },
  feedback: { padding: 14, borderWidth: 1, borderRadius: 14, marginTop: 8 },
});
