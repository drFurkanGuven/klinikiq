import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, Paperclip, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { communityApi } from "../../lib/api";
import {
  findTopicPath,
  getBranchesForGroup,
  type TusGroupId,
  TIP_SECTION_LABEL,
  TUS_GROUP_META,
  type TusBranch,
  type TusTopic,
} from "../../lib/tus-taxonomy";
import { useTheme } from "../../lib/theme";

const DRAFT_KEY = "klinikiq:topluluk-not-taslak-native";

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

function apiErrMessage(err: unknown): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response
    ?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return (
      d.map((x: { msg?: string }) => x?.msg).filter(Boolean).join(" ") ||
      "Doğrulama hatası."
    );
  }
  return "Kaydedilemedi. Bağlantınızı kontrol edin.";
}

type PendingFile = { uri: string; name: string; type: string };

export default function PaylasScreen() {
  const theme = useTheme();
  const [group, setGroup] = useState<TusGroupId>("temel");
  const [branchId, setBranchId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [branchOpen, setBranchOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw) as {
          group?: TusGroupId;
          branchId?: string;
          topicId?: string;
          title?: string;
          body?: string;
        };
        if (d.group === "temel" || d.group === "klinik") setGroup(d.group);
        if (typeof d.branchId === "string") setBranchId(d.branchId);
        if (typeof d.topicId === "string") setTopicId(d.topicId);
        if (typeof d.title === "string") setTitle(d.title);
        if (typeof d.body === "string") setBody(d.body);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => {
      void AsyncStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ group, branchId, topicId, title, body })
      );
    }, 500);
    return () => clearTimeout(t);
  }, [done, group, branchId, topicId, title, body]);

  const branches = useMemo(() => getBranchesForGroup(group), [group]);
  const selectedBranch = branches.find((b) => b.id === branchId);
  const topics = selectedBranch?.topics ?? [];

  const branchLabel = selectedBranch?.name ?? "Dal seçin";
  const topicLabel =
    topics.find((t) => t.id === topicId)?.name ?? "Konu seçin";

  const onGroupChange = (g: TusGroupId) => {
    void Haptics.selectionAsync();
    setGroup(g);
    setBranchId("");
    setTopicId("");
  };

  const pickFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const next: PendingFile[] = [...pendingFiles];
      for (const a of res.assets) {
        if (next.length >= 12) break;
        const uri = a.uri;
        const name = a.name ?? "ek";
        const type = a.mimeType ?? "application/octet-stream";
        next.push({ uri, name, type });
      }
      setPendingFiles(next);
      void Haptics.selectionAsync();
    } catch {
      Alert.alert("Hata", "Dosya seçilemedi.");
    }
  };

  const submit = async () => {
    setError(null);
    if (!branchId || !topicId) {
      setError("Dal ve konu seçimi zorunludur.");
      return;
    }
    if (!findTopicPath(group, branchId, topicId)) {
      setError("Seçilen konu geçersiz. Lütfen tekrar seçin.");
      return;
    }
    if (!title.trim()) {
      setError("Başlık girin.");
      return;
    }
    if (body.trim().length < 20) {
      setError("Not metni en az 20 karakter olsun.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await communityApi.createNote({
        group,
        branch_id: branchId,
        topic_id: topicId,
        title: title.trim(),
        body: body.trim(),
      });
      const noteId = res.data.id;
      let attachFailed = 0;
      for (const f of pendingFiles) {
        try {
          await communityApi.uploadNoteAttachment(noteId, f);
        } catch {
          attachFailed += 1;
        }
      }
      try {
        await AsyncStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setPendingFiles([]);
      if (attachFailed > 0) {
        Alert.alert(
          "Kısmen kaydedildi",
          `${attachFailed} ek yüklenemedi; metin kaydedildi.`
        );
      }
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(apiErrMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const renderBranch = useCallback(
    ({ item }: { item: TusBranch }) => (
      <Pressable
        style={[styles.modalRow, { borderBottomColor: theme.border }]}
        onPress={() => {
          void Haptics.selectionAsync();
          setBranchId(item.id);
          setTopicId("");
          setBranchOpen(false);
        }}
      >
        <Text style={[styles.modalRowTxt, { color: theme.text }]}>{item.name}</Text>
      </Pressable>
    ),
    [theme]
  );

  const renderTopic = useCallback(
    ({ item }: { item: TusTopic }) => (
      <Pressable
        style={[styles.modalRow, { borderBottomColor: theme.border }]}
        onPress={() => {
          void Haptics.selectionAsync();
          setTopicId(item.id);
          setTopicOpen(false);
        }}
      >
        <Text style={[styles.modalRowTxt, { color: theme.text }]}>{item.name}</Text>
      </Pressable>
    ),
    [theme]
  );

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
        <Card style={[styles.doneCard, { borderColor: theme.border }]}>
          <Text style={[styles.doneTitle, { color: theme.text }]}>
            Not gönderildi
          </Text>
          <Text style={[styles.doneHint, { color: theme.textMuted }]}>
            Yönetici onayından sonra akışta yayınlanır.
          </Text>
          <Button
            label="Akışa dön"
            onPress={() => router.replace("/topluluk")}
          />
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.bar, { borderBottomColor: theme.border }]}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.back();
            }}
            style={styles.back}
          >
            <ArrowLeft size={22} color={theme.text} />
          </Pressable>
          <View style={styles.barMid}>
            <Text style={[styles.navTitle, { color: theme.text }]}>Not paylaş</Text>
            <Text style={[styles.subNav, { color: theme.textMuted }]}>
              {TIP_SECTION_LABEL}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.lbl, { color: theme.textMuted }]}>Sınıf</Text>
          <View style={styles.groupRow}>
            {(["temel", "klinik"] as const).map((g) => {
              const on = group === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => onGroupChange(g)}
                  style={[
                    styles.groupChip,
                    {
                      borderColor: on ? theme.accent : theme.border,
                      backgroundColor: on ? theme.accent + "22" : theme.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.groupChipTxt,
                      { color: on ? theme.accent : theme.text },
                    ]}
                  >
                    {TUS_GROUP_META[g].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.lbl, { color: theme.textMuted }]}>Dal</Text>
          <Pressable
            onPress={() => setBranchOpen(true)}
            style={[styles.selectBox, { borderColor: theme.border }]}
          >
            <Text style={[styles.selectTxt, { color: theme.text }]}>
              {branchLabel}
            </Text>
          </Pressable>

          <Text style={[styles.lbl, { color: theme.textMuted }]}>Konu</Text>
          <Pressable
            onPress={() => {
              if (!branchId) {
                Alert.alert("Önce dal seçin");
                return;
              }
              setTopicOpen(true);
            }}
            style={[styles.selectBox, { borderColor: theme.border }]}
          >
            <Text style={[styles.selectTxt, { color: theme.text }]}>
              {topicLabel}
            </Text>
          </Pressable>

          <Text style={[styles.lbl, { color: theme.textMuted }]}>Başlık</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Kısa başlık"
            placeholderTextColor={theme.textMuted}
            style={[styles.inp, { color: theme.text, borderColor: theme.border }]}
          />

          <Text style={[styles.lbl, { color: theme.textMuted }]}>Not</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="En az 20 karakter…"
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
            style={[
              styles.bodyInp,
              { color: theme.text, borderColor: theme.border },
            ]}
          />

          <View style={styles.attachRow}>
            <Pressable
              onPress={() => void pickFiles()}
              style={[styles.attachBtn, { borderColor: theme.border }]}
            >
              <Paperclip size={18} color={theme.accent} />
              <Text style={[styles.attachTxt, { color: theme.accent }]}>
                Ek (PDF/görsel, en fazla 12)
              </Text>
            </Pressable>
          </View>
          {pendingFiles.map((f, i) => (
            <View
              key={`${f.uri}-${i}`}
              style={[styles.fileRow, { borderColor: theme.border }]}
            >
              <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                {f.name}
              </Text>
              <Pressable
                onPress={() =>
                  setPendingFiles((prev) => prev.filter((_, j) => j !== i))
                }
              >
                <X size={18} color={theme.textMuted} />
              </Pressable>
            </View>
          ))}

          {error ? (
            <Text style={[styles.err, { color: theme.error }]}>{error}</Text>
          ) : null}

          <Button
            label="Yayınla"
            onPress={() => void submit()}
            loading={submitting}
            disabled={submitting}
          />
        </ScrollView>

        <Modal visible={branchOpen} animationType="slide" transparent>
          <Pressable style={styles.modalBackdrop} onPress={() => setBranchOpen(false)}>
            <Pressable
              style={[styles.modalSheet, { backgroundColor: theme.bg }]}
              onPress={(e) => e.stopPropagation()}
            >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Dal seçin</Text>
            <FlatList
              data={branches}
              keyExtractor={(b: TusBranch) => b.id}
              renderItem={renderBranch}
              style={{ maxHeight: 400 }}
            />
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={topicOpen} animationType="slide" transparent>
          <Pressable style={styles.modalBackdrop} onPress={() => setTopicOpen(false)}>
            <Pressable
              style={[styles.modalSheet, { backgroundColor: theme.bg }]}
              onPress={(e) => e.stopPropagation()}
            >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Konu seçin</Text>
            <FlatList
              data={topics}
              keyExtractor={(t: TusTopic) => t.id}
              renderItem={renderTopic}
              style={{ maxHeight: 400 }}
            />
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  barMid: { flex: 1, alignItems: "center" },
  navTitle: { fontFamily: fontBold(), fontSize: 17 },
  subNav: { fontFamily: fontSemi(), fontSize: 10, letterSpacing: 1, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 48 },
  lbl: {
    fontFamily: fontBold(),
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
  groupRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  groupChipTxt: { fontFamily: fontSemi(), fontSize: 14 },
  selectBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectTxt: { fontFamily: fontReg(), fontSize: 16 },
  inp: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontReg(),
    fontSize: 16,
  },
  bodyInp: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 160,
    fontFamily: fontReg(),
    fontSize: 16,
  },
  attachRow: { marginTop: 12, marginBottom: 8 },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  attachTxt: { fontFamily: fontSemi(), fontSize: 14 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  fileName: { flex: 1, fontFamily: fontReg(), fontSize: 14, marginRight: 8 },
  err: { fontFamily: fontReg(), fontSize: 14, marginVertical: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: { fontFamily: fontBold(), fontSize: 18, marginBottom: 12 },
  modalRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRowTxt: { fontFamily: fontReg(), fontSize: 16 },
  doneCard: {
    margin: 16,
    padding: 24,
    borderWidth: 1,
    borderRadius: 16,
    gap: 12,
  },
  doneTitle: { fontFamily: fontBold(), fontSize: 20, textAlign: "center" },
  doneHint: { fontFamily: fontReg(), fontSize: 14, textAlign: "center", lineHeight: 20 },
});
