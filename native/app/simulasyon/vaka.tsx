import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Home, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SessionReportView } from "../../components/SessionReportView";
import {
  sessionsApi,
  type ReportOut,
  type SessionDetailOut,
} from "../../lib/api";
import { streamSessionMessage } from "../../lib/session-sse-xhr";
import {
  DIFFICULTY_MAP,
  EXAM_CATEGORIES,
  EXAM_ITEMS,
  LAB_ITEMS,
} from "../../lib/case-data";
import { storage } from "../../lib/storage";
import { useTheme } from "../../lib/theme";

const LAB_TAB_KEYS = [
  "lab",
  "radiology",
  "cardio",
  "endo",
  "nuclear",
  "patho",
  "neuro",
] as const;

const LAB_TAB_LABELS: Record<(typeof LAB_TAB_KEYS)[number], string> = {
  lab: "Laboratuvar",
  radiology: "Radyoloji",
  cardio: "Kardiyak/Solunum",
  endo: "Endoskopi",
  nuclear: "Nükleer",
  patho: "Patoloji/Genetik",
  neuro: "Nörofizyoloji",
};

const KONSULT_BRANCHES = [
  "Kardiyoloji",
  "Nöroloji",
  "Endokrinoloji",
  "Psikiyatri",
  "Ortopedi",
  "Genel Cerrahi",
  "Göğüs Hastalıkları",
  "Üroloji",
  "Dermatoloji",
  "Romatoloji",
  "Hematoloji",
  "Gastroenteroloji",
] as const;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

/** API’ye giden ham metin; balonda gösterilen kısa metin (web CaseContent ile uyumlu) */
function userBubbleText(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("[KONSÜLTASYON İSTEĞİ]")) {
    return "📞 Uzmana danış (konsültasyon istendi)";
  }
  if (t.startsWith("[TETKİK İSTEDİ]") || t.startsWith("[TETKIK]")) {
    return "🧪 Laboratuvar/görüntüleme isteği gönderildi";
  }
  if (t.startsWith("[FİZİK MUAYENE]")) {
    const rest = t.replace(/^\[FİZİK MUAYENE\]\s*/, "").trim();
    const short = rest.split("(")[0]?.trim() ?? rest;
    return `${short} Muayenesi Yapıldı`;
  }
  return t;
}

function fontBold() {
  return Platform.select({
    ios: "Inter_700Bold",
    android: "Inter_700Bold",
    default: "Inter_700Bold",
  });
}
function fontSemi() {
  return Platform.select({
    ios: "Inter_600SemiBold",
    android: "Inter_600SemiBold",
    default: "Inter_600SemiBold",
  });
}
function fontReg() {
  return Platform.select({
    ios: "Inter_400Regular",
    android: "Inter_400Regular",
    default: "Inter_400Regular",
  });
}

function parseTableLines(lines: string[]): string[][] | null {
  const rows: string[][] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const rawCells = t.split("|").map((c) => c.trim());
    const cells = rawCells.filter(
      (c, i, arr) => !(c === "" && (i === 0 || i === arr.length - 1))
    );
    if (
      cells.length &&
      cells.every((c) => /^[\-:]+$/.test(c.replace(/\s/g, "")))
    ) {
      continue;
    }
    if (cells.length) rows.push(cells);
  }
  return rows.length ? rows : null;
}

function splitContentForRender(content: string): Array<
  | { type: "text"; text: string }
  | { type: "table"; rows: string[][] }
> {
  const out: Array<
    { type: "text"; text: string } | { type: "table"; rows: string[][] }
  > = [];
  const rawLines = content.split("\n");
  let buf: string[] = [];
  let tableBuf: string[] = [];
  const flushText = () => {
    if (buf.length) {
      const t = buf.join("\n").trimEnd();
      if (t) out.push({ type: "text", text: t });
      buf = [];
    }
  };
  const flushTable = () => {
    if (tableBuf.length) {
      const rows = parseTableLines(tableBuf);
      if (rows) out.push({ type: "table", rows });
      else {
        buf.push(...tableBuf);
        flushText();
      }
      tableBuf = [];
    }
  };
  for (const line of rawLines) {
    const isRow = line.trimStart().startsWith("|");
    if (isRow) {
      flushText();
      tableBuf.push(line);
    } else {
      flushTable();
      buf.push(line);
    }
  }
  flushTable();
  flushText();
  return out.length ? out : [{ type: "text", text: content }];
}

function UserPrefixBadge({
  content,
  theme,
}: {
  content: string;
  theme: ReturnType<typeof useTheme>;
}) {
  let label: string | null = null;
  if (content.startsWith("[FİZİK MUAYENE]") || content.includes("Muayenesi Yapıldı")) {
    label = "Fizik";
  } else if (
    content.startsWith("[TETKİK İSTEDİ]") ||
    content.startsWith("[TETKIK]") ||
    content.startsWith("🧪")
  ) {
    label = "Tetkik";
  } else if (
    content.startsWith("[KONSÜLTASYON]") ||
    content.startsWith("[KONSÜLTASYON İSTEĞİ]") ||
    content.startsWith("📞")
  ) {
    label = "Konsült";
  }
  if (!label) return null;
  return (
    <View
      style={[
        styles.prefixBadge,
        { backgroundColor: theme.accent + "33", borderColor: theme.accent },
      ]}
    >
      <Text style={[styles.prefixBadgeText, { color: theme.accent }]}>
        {label}
      </Text>
    </View>
  );
}

function MessageContent({
  content,
  streaming,
  alignRight,
  theme,
}: {
  content: string;
  streaming?: boolean;
  alignRight: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const parts = useMemo(() => splitContentForRender(content), [content]);
  const textColor = alignRight ? "#FFFFFF" : theme.text;
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") {
          return (
            <Text
              key={`t-${i}`}
              style={[
                styles.msgText,
                { color: textColor, fontFamily: fontReg() },
              ]}
            >
              {p.text}
            </Text>
          );
        }
        const [header, ...body] = p.rows;
        return (
          <ScrollView
            key={`tbl-${i}`}
            horizontal
            showsHorizontalScrollIndicator
            style={styles.tableScroll}
          >
            <View style={styles.tableCol}>
              <View
                style={[
                  styles.tableRow,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                {header.map((cell, j) => (
                  <Text
                    key={`h-${j}`}
                    style={[
                      styles.tableCell,
                      {
                        color: theme.text,
                        fontFamily: fontSemi(),
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {cell}
                  </Text>
                ))}
              </View>
              {body.map((row, ri) => (
                <View
                  key={`r-${ri}`}
                  style={[
                    styles.tableRow,
                    { borderColor: theme.border, backgroundColor: "transparent" },
                  ]}
                >
                  {row.map((cell, ci) => (
                    <Text
                      key={`c-${ci}`}
                      style={[
                        styles.tableCell,
                        { color: textColor, fontFamily: fontReg() },
                      ]}
                    >
                      {cell}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        );
      })}
      {streaming ? (
        <Text style={{ color: textColor, fontFamily: fontReg() }}>▌</Text>
      ) : null}
    </>
  );
}

function NativeReportMode({
  sessionId,
  theme,
}: {
  sessionId: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const [report, setReport] = useState<ReportOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sessionsApi.getReport(sessionId);
      setReport(res.data);
    } catch (e: unknown) {
      const ax = e as {
        response?: { data?: { detail?: string } };
      };
      setError(
        ax.response?.data?.detail ??
          (e instanceof Error ? e.message : "Rapor yüklenemedi.")
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const onShare = useCallback(async () => {
    if (!report) return;
    const caseTitle = report.case?.title ?? "Vaka";
    try {
      await Share.share({
        message: `🦾 KlinikIQ — ${caseTitle}\n📊 Skor: %${Math.round(report.score)}`,
        title: "KlinikIQ Raporu",
      });
    } catch {
      /* kullanıcı iptal */
    }
  }, [report]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View
        style={[
          styles.navbar,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={theme.text} />
        </Pressable>
        <Text
          style={[styles.navTitle, { color: theme.text, flex: 1 }]}
          numberOfLines={1}
        >
          Vaka Raporu
        </Text>
        <View style={styles.reportNavRight}>
          <Pressable
            style={({ pressed }) => [styles.navIconBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => void onShare()}
            disabled={!report}
          >
            <Share2 size={18} color={theme.accent} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.navIconBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.push("/(tabs)")}
          >
            <Home size={18} color={theme.textMuted} />
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.aiDisclaimer,
          { backgroundColor: theme.accent + "18", borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.aiDisclaimerText, { color: theme.accent }]}>
          AI raporu · Eğitim amaçlı
        </Text>
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.reportScroll}
        keyboardShouldPersistTaps="handled"
      >
        {loading && (
          <View style={styles.reportLoading}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.reportLoadingTitle, { color: theme.text }]}>
              Rapor Hazırlanıyor
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 8, textAlign: "center" }}>
              Veriler yükleniyor…
            </Text>
          </View>
        )}
        {error && !loading && (
          <View style={styles.reportError}>
            <Text style={{ color: theme.error, fontFamily: fontReg(), textAlign: "center" }}>
              {error}
            </Text>
            <Pressable
              onPress={() => void fetchReport()}
              style={[styles.retryBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={{ color: "#fff", fontFamily: fontSemi() }}>Tekrar Dene</Text>
            </Pressable>
          </View>
        )}
        {report && !loading && <SessionReportView report={report} theme={theme} />}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function VakaScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    session_id?: string;
    case_id?: string;
    report_session_id?: string;
  }>();

  if (params.report_session_id) {
    return (
      <NativeReportMode
        sessionId={String(params.report_session_id)}
        theme={theme}
      />
    );
  }

  if (!params.session_id) {
    return <Redirect href="/simulasyon/vakalar" />;
  }

  return (
    <NativeSessionView sessionId={String(params.session_id)} theme={theme} />
  );
}

function NativeSessionView({
  sessionId,
  theme,
}: {
  sessionId: string;
  theme: ReturnType<typeof useTheme>;
}) {
  const [sessionData, setSessionData] = useState<SessionDetailOut | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [budget, setBudget] = useState(0);
  const [initialBudget, setInitialBudget] = useState(9500);
  const [activeModal, setActiveModal] = useState<
    "lab" | "exam" | "konsult" | "tani" | null
  >(null);
  const [labTab, setLabTab] = useState<(typeof LAB_TAB_KEYS)[number]>("lab");
  const [examCat, setExamCat] = useState(EXAM_CATEGORIES[0].id);
  const [labSearch, setLabSearch] = useState("");
  const [diagnoses, setDiagnoses] = useState(["", "", ""]);
  const [completing, setCompleting] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const streamRef = useRef<{ abort: () => void } | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.abort();
    };
  }, []);

  const openModal = (m: typeof activeModal) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveModal(m);
  };

  const scrollEnd = useCallback(() => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollEnd();
  }, [messages, scrollEnd]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await sessionsApi.getSession(sessionId);
        if (cancelled) return;
        const data = res.data;
        setSessionData(data);
        const diff = String(data.case.difficulty || "medium").toLowerCase();
        const map = DIFFICULTY_MAP as Record<
          string,
          { initialBudget: number }
        >;
        const init =
          map[diff]?.initialBudget ??
          DIFFICULTY_MAP.medium.initialBudget;
        setInitialBudget(init);
        setBudget(init);
        const mapped: ChatMessage[] = (data.messages || []).map((m) => ({
          id: String(m.id),
          role: m.role === "assistant" ? "assistant" : "user",
          content:
            m.role === "assistant" ? m.content : userBubbleText(m.content),
        }));
        setMessages(mapped);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Oturum yüklenemedi."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const budgetColor = useMemo(() => {
    const ratio = initialBudget > 0 ? budget / initialBudget : 0;
    if (ratio > 0.5) return theme.success;
    if (ratio > 0.2) return "#EAB308";
    return theme.error;
  }, [budget, initialBudget, theme]);

  const sendMessage = useCallback(
    (messageText: string) => {
      const trimmed = messageText.trim();
      if (!trimmed || sending) return;
      void Haptics.selectionAsync();
      const userMsg: ChatMessage = {
        id: `${Date.now()}-u`,
        role: "user",
        content: userBubbleText(trimmed),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);

      void (async () => {
        try {
          const token = await storage.getToken();
          if (!token) {
            Alert.alert("Hata", "Oturum bulunamadı.");
            setSending(false);
            return;
          }
          streamRef.current?.abort();
          streamRef.current = streamSessionMessage(sessionId, token, trimmed, {
            onChunk: (chunk) => {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.streaming && last.role === "assistant") {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: last.content + chunk },
                  ];
                }
                return [
                  ...prev,
                  {
                    role: "assistant",
                    content: chunk,
                    streaming: true,
                    id: `${Date.now()}-a`,
                  },
                ];
              });
            },
            onComplete: () => {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, streaming: false } : m
                )
              );
              setSending(false);
            },
            onError: (msg) => {
              Alert.alert("Hata", msg);
              setSending(false);
            },
          });
        } catch (e) {
          Alert.alert(
            "Hata",
            e instanceof Error ? e.message : "Mesaj gönderilemedi."
          );
          setSending(false);
        }
      })();
    },
    [sending, sessionId]
  );

  const onCompleteCase = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const list = diagnoses.map((d) => d.trim()).filter(Boolean);
      await sessionsApi.diagnose(sessionId, list);
      await sessionsApi.complete(sessionId);
      router.replace({
        pathname: "/simulasyon/vaka",
        params: { report_session_id: sessionId },
      });
    } catch (e) {
      Alert.alert(
        "Hata",
        e instanceof Error ? e.message : "Vaka tamamlanamadı."
      );
    } finally {
      setCompleting(false);
    }
  }, [completing, diagnoses, sessionId]);

  const filteredLabs = useMemo(() => {
    const q = labSearch.trim().toLowerCase();
    return LAB_ITEMS.filter((item) => {
      if (item.category !== labTab) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q);
    });
  }, [labTab, labSearch]);

  const showTyping =
    sending &&
    !(
      messages.length &&
      messages[messages.length - 1].role === "assistant" &&
      messages[messages.length - 1].streaming
    );

  if (loadError) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.bg }]}
        edges={["top"]}
      >
        <View style={styles.center}>
          <Text style={{ color: theme.error, fontFamily: fontReg() }}>
            {loadError}
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.accent, fontFamily: fontSemi() }}>
              Geri
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!sessionData) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.bg }]}
        edges={["top"]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.textMuted, marginTop: 12 }}>
            Oturum yükleniyor…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const c = sessionData.case;
  const patient = c.patient || {};
  const ageStr =
    patient.age !== undefined && patient.age !== null
      ? String(patient.age)
      : "—";
  const genderStr = patient.gender ? String(patient.gender) : "—";
  const subLine = `${c.specialty} · ${c.difficulty} · ${ageStr} ${genderStr}`;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.bg }]}
      edges={["top"]}
    >
      <View
        style={[
          styles.navbar,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text
            style={[styles.navTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {c.title}
          </Text>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 11,
              fontFamily: fontReg(),
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subLine}
          </Text>
        </View>
        <Text style={[styles.budgetText, { color: budgetColor }]}>
          ₺{budget}
        </Text>
      </View>

      <View
        style={[
          styles.simDisclaimer,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.simDisclaimerText, { color: theme.textMuted }]}>
          Eğitim simülasyonu · AI üretimi · Tıbbi karar yerine geçmez
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          style={styles.flex1}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isUser = item.role === "user";
            const displayContent =
              item.role === "assistant" && item.streaming
                ? item.content
                : item.content;
            return (
              <View
                style={[
                  styles.msgRow,
                  isUser ? styles.msgRowUser : styles.msgRowAsst,
                ]}
              >
                {isUser && (
                  <UserPrefixBadge content={item.content} theme={theme} />
                )}
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? {
                          backgroundColor: theme.accent,
                          alignSelf: "flex-end",
                        }
                      : {
                          backgroundColor: theme.card,
                          alignSelf: "flex-start",
                        },
                  ]}
                >
                  <MessageContent
                    content={displayContent}
                    streaming={
                      item.role === "assistant" ? item.streaming : false
                    }
                    alignRight={isUser}
                    theme={theme}
                  />
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            showTyping ? (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={{ color: theme.textMuted, marginLeft: 8 }}>
                  Yanıtlanıyor…
                </Text>
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.inputBar,
            { borderTopColor: theme.border, backgroundColor: theme.surface },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.bg,
                fontFamily: fontReg(),
              },
            ]}
            placeholder="Hastaya sorunuzu yazın…"
            placeholderTextColor={theme.textMuted}
            value={input}
            onChangeText={setInput}
            editable={!sending}
            onSubmitEditing={() => void sendMessage(input)}
          />
          <Pressable
            style={[
              styles.sendBtn,
              {
                backgroundColor: theme.accent,
                opacity: sending || !input.trim() ? 0.45 : 1,
              },
            ]}
            disabled={sending || !input.trim()}
            onPress={() => void sendMessage(input)}
          >
            <Text style={[styles.sendBtnText, { fontFamily: fontSemi() }]}>
              ➤ Gönder
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.actionRow,
            { borderTopColor: theme.border, backgroundColor: theme.bg },
          ]}
        >
          <Pressable
            style={[styles.actionChip, { borderColor: theme.border }]}
            onPress={() => openModal("lab")}
          >
            <Text style={{ color: theme.text, fontFamily: fontReg() }}>
              🧪 Tetkik
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionChip, { borderColor: theme.border }]}
            onPress={() => openModal("exam")}
          >
            <Text style={{ color: theme.text, fontFamily: fontReg() }}>
              🩺 Muayene
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionChip, { borderColor: theme.border }]}
            onPress={() => openModal("konsult")}
          >
            <Text style={{ color: theme.text, fontFamily: fontReg() }}>
              📞 Konsül
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionChip, { borderColor: theme.border }]}
            onPress={() => openModal("tani")}
          >
            <Text style={{ color: theme.text, fontFamily: fontReg() }}>
              ✅ Tanı
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={activeModal === "lab"}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHandleWrap}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Tetkik
            </Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={{ color: theme.accent, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
          <TextInput
            style={[
              styles.modalSearch,
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.bg,
                fontFamily: fontReg(),
              },
            ]}
            placeholder="Ara…"
            placeholderTextColor={theme.textMuted}
            value={labSearch}
            onChangeText={setLabSearch}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.labTabs}
          >
            {LAB_TAB_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => setLabTab(key)}
                style={[
                  styles.labTab,
                  {
                    backgroundColor:
                      labTab === key ? theme.accent + "33" : "transparent",
                    borderColor: labTab === key ? theme.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: labTab === key ? theme.accent : theme.textMuted,
                    fontFamily: fontSemi(),
                    fontSize: 12,
                  }}
                >
                  {LAB_TAB_LABELS[key]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <FlatList
            data={filteredLabs}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => {
              const can = budget >= item.price;
              return (
                <View
                  style={[
                    styles.labRow,
                    { opacity: can ? 1 : 0.4, borderColor: theme.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.labName,
                      { color: theme.text, fontFamily: fontReg() },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.textMuted, marginHorizontal: 8 }}>
                    ₺{item.price}
                  </Text>
                  <Pressable
                    disabled={!can}
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBudget((prev) => prev - item.price);
                      void sendMessage(
                        `[TETKİK İSTEDİ] Tetkikler:\n- ${item.name}\n\nMarkdown Tablo formatında listele.`
                      );
                      setActiveModal(null);
                    }}
                    style={[
                      styles.labSelectBtn,
                      { backgroundColor: theme.accent, opacity: can ? 1 : 0.4 },
                    ]}
                  >
                    <Text style={{ color: "#fff", fontFamily: fontSemi() }}>
                      Seç
                    </Text>
                  </Pressable>
                </View>
              );
            }}
          />
        </View>
      </Modal>

      <Modal
        visible={activeModal === "exam"}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHandleWrap}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Fizik Muayene
            </Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={{ color: theme.accent, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.examCatScroll}
          >
            {EXAM_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => {
                  setExamCat(cat.id);
                  void Haptics.selectionAsync();
                }}
                style={[
                  styles.examCatChip,
                  {
                    borderColor:
                      examCat === cat.id ? theme.accent : theme.border,
                    backgroundColor:
                      examCat === cat.id ? theme.accent + "22" : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color: examCat === cat.id ? theme.accent : theme.text,
                    fontFamily: fontSemi(),
                    fontSize: 12,
                  }}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <FlatList
            data={EXAM_ITEMS.filter((e) => e.category === examCat)}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.examRow,
                  { borderColor: theme.border },
                ]}
              >
                <Text
                  style={{ flex: 1, color: theme.text, fontFamily: fontReg() }}
                >
                  {item.name}
                </Text>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    void sendMessage(item.message);
                    setActiveModal(null);
                  }}
                  style={[styles.examApply, { backgroundColor: theme.accent }]}
                >
                  <Text style={{ color: "#fff", fontFamily: fontSemi() }}>
                    Uygula
                  </Text>
                </Pressable>
              </View>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={activeModal === "konsult"}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHandleWrap}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Konsültasyon
            </Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={{ color: theme.accent, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={[...KONSULT_BRANCHES]}
            numColumns={2}
            keyExtractor={(s) => s}
            columnWrapperStyle={{ gap: 8 }}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            renderItem={({ item: br }) => (
              <Pressable
                style={[
                  styles.konsultCard,
                  { borderColor: theme.border, backgroundColor: theme.bg },
                ]}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  void sendMessage(
                    `[KONSÜLTASYON İSTEĞİ] ${br} konsültasyonu istiyorum`
                  );
                  setActiveModal(null);
                }}
              >
                <Text
                  style={{
                    color: theme.text,
                    fontFamily: fontSemi(),
                    textAlign: "center",
                  }}
                >
                  {br}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <Modal
        visible={activeModal === "tani"}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={[styles.modalScreen, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHandleWrap}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
          </View>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Tanı Gir — Vakayı Tamamla
            </Text>
            <Pressable onPress={() => setActiveModal(null)}>
              <Text style={{ color: theme.accent, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <TextInput
                key={i}
                style={[
                  styles.diagInput,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.bg,
                    fontFamily: fontReg(),
                  },
                ]}
                placeholder={`Tanı ${i + 1}`}
                placeholderTextColor={theme.textMuted}
                value={diagnoses[i]}
                onChangeText={(t) =>
                  setDiagnoses((prev) => {
                    const n = [...prev];
                    n[i] = t;
                    return n;
                  })
                }
              />
            ))}
            <Text style={{ color: theme.textMuted, fontFamily: fontReg() }}>
              Tanı girdikten sonra vaka kapanır, devam edemezsin.
            </Text>
            <Pressable
              disabled={completing}
              onPress={() => void onCompleteCase()}
              style={[
                styles.completeBtn,
                {
                  backgroundColor: theme.accent,
                  opacity: completing ? 0.5 : 1,
                },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: fontBold() }}>
                Vakayı Tamamla
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex1: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  simDisclaimer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  simDisclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fontReg(),
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  reportNavRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  aiDisclaimer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  aiDisclaimerText: {
    fontSize: 10,
    fontFamily: fontSemi(),
    textAlign: "center",
    textTransform: "uppercase",
  },
  reportScroll: {
    padding: 16,
    paddingBottom: 32,
  },
  reportLoading: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  reportLoadingTitle: {
    fontSize: 17,
    fontFamily: fontBold(),
    marginTop: 8,
  },
  reportError: {
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navTitle: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 15,
  },
  budgetText: {
    fontFamily: fontBold(),
    fontSize: 15,
    minWidth: 72,
    textAlign: "right",
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  msgRow: {
    marginBottom: 12,
    maxWidth: "100%",
  },
  msgRowUser: { alignItems: "flex-end" },
  msgRowAsst: { alignItems: "flex-start" },
  prefixBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  prefixBadgeText: {
    fontSize: 10,
    fontFamily: fontSemi(),
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
  },
  tableScroll: { maxWidth: "100%", marginVertical: 4 },
  tableCol: { flexDirection: "column" },
  tableRow: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableCell: {
    paddingHorizontal: 6,
    fontSize: 12,
    maxWidth: 140,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 14,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: "space-between",
  },
  actionChip: {
    flex: 1,
    minWidth: "22%",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalScreen: { flex: 1, paddingTop: 8 },
  modalHandleWrap: { alignItems: "center", paddingVertical: 8 },
  modalHandle: { width: 30, height: 4, borderRadius: 2 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontFamily: fontBold(),
    fontSize: 17,
  },
  modalSearch: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  labTabs: { maxHeight: 44, paddingHorizontal: 12, marginBottom: 8 },
  labTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  labRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  labName: { flex: 1 },
  labSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  examCatScroll: { maxHeight: 44, paddingHorizontal: 12, marginBottom: 8 },
  examCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  examRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  examApply: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  konsultCard: {
    flex: 1,
    margin: 4,
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  diagInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  completeBtn: {
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
});
