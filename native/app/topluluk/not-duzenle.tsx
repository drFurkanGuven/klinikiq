import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Paperclip, Trash2, X } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  communityApi,
  type CommunityNoteAttachment,
} from "../../lib/api";
import { resolveCommunityUploadUrl } from "../../lib/communityUploadUrl";
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
  return "Kaydedilemedi.";
}

type PendingFile = { uri: string; name: string; type: string };

export default function NotDuzenleScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const rawId = useLocalSearchParams<{ id: string | string[] }>().id;
  const noteId = typeof rawId === "string" ? rawId : rawId?.[0] ?? "";

  const noteQuery = useQuery({
    queryKey: ["community", "notes", noteId],
    queryFn: async () => (await communityApi.getNote(noteId)).data,
    enabled: !!noteId,
  });

  const n = noteQuery.data;
  const [group, setGroup] = useState<TusGroupId>("temel");
  const [branchId, setBranchId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<CommunityNoteAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [formReady, setFormReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attBusy, setAttBusy] = useState<string | null>(null);
  const [branchOpen, setBranchOpen] = useState(false);
  const [topicOpen, setTopicOpen] = useState(false);

  useEffect(() => {
    if (!n || formReady) return;
    setGroup(n.group);
    setBranchId(n.branch_id);
    setTopicId(n.topic_id);
    setTitle(n.title);
    setBody(n.body);
    setAttachments(n.attachments ?? []);
    setFormReady(true);
  }, [n, formReady]);

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

  const pickMore = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const next = [...pendingFiles];
      for (const a of res.assets) {
        if (attachments.length + next.length >= 12) break;
        next.push({
          uri: a.uri,
          name: a.name ?? "ek",
          type: a.mimeType ?? "application/octet-stream",
        });
      }
      setPendingFiles(next);
    } catch {
      Alert.alert("Hata", "Dosya seçilemedi.");
    }
  };

  const removeAtt = async (att: CommunityNoteAttachment) => {
    setAttBusy(att.id);
    try {
      await communityApi.deleteNoteAttachment(noteId, att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch {
      /* ignore */
    } finally {
      setAttBusy(null);
    }
  };

  const save = async () => {
    setError(null);
    if (!branchId || !topicId) {
      setError("Dal ve konu seçimi zorunludur.");
      return;
    }
    if (!findTopicPath(group, branchId, topicId)) {
      setError("Seçilen konu geçersiz.");
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
      if (pendingFiles.length > 0) {
        setAttBusy("up");
        const next = [...attachments];
        for (const f of pendingFiles) {
          const r = await communityApi.uploadNoteAttachment(noteId, f);
          next.push(r.data);
        }
        setAttachments(next);
        setPendingFiles([]);
        setAttBusy(null);
      }
      await communityApi.updateNote(noteId, {
        group,
        branch_id: branchId,
        topic_id: topicId,
        title: title.trim(),
        body: body.trim(),
      });
      void queryClient.invalidateQueries({ queryKey: ["community"] });
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(apiErrMessage(e));
    } finally {
      setSubmitting(false);
      setAttBusy(null);
    }
  };

  const renderBranch = useCallback(
    ({ item }: { item: TusBranch }) => (
      <Pressable
        style={[styles.modalRow, { borderBottomColor: theme.border }]}
        onPress={() => {
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
          setTopicId(item.id);
          setTopicOpen(false);
        }}
      >
        <Text style={[styles.modalRowTxt, { color: theme.text }]}>{item.name}</Text>
      </Pressable>
    ),
    [theme]
  );

  if (!noteId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.error, padding: 16 }}>Geçersiz not.</Text>
      </SafeAreaView>
    );
  }

  if (noteQuery.isLoading || (noteQuery.isSuccess && n && !formReady)) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (noteQuery.isError || !n) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.error, padding: 16 }}>Not yüklenemedi.</Text>
      </SafeAreaView>
    );
  }

  if (!n.is_mine) {
    router.replace("/topluluk");
    return null;
  }

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
        <Card style={[styles.doneCard, { borderColor: theme.border }]}>
          <Text style={[styles.doneTitle, { color: theme.text }]}>
            Güncellendi
          </Text>
          <Button label="Akışa dön" onPress={() => router.replace("/topluluk")} />
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
            onPress={() => router.back()}
            style={styles.back}
          >
            <ArrowLeft size={22} color={theme.text} />
          </Pressable>
          <View style={styles.barMid}>
            <Text style={[styles.navTitle, { color: theme.text }]}>Notu düzenle</Text>
            <Text style={[styles.subNav, { color: theme.textMuted }]}>
              {TIP_SECTION_LABEL}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {n.moderation_status === "pending" ? (
          <Text style={[styles.warn, { color: theme.textMuted }]}>
            Onay bekliyor; yayınlanana kadar akışta görünmeyebilir.
          </Text>
        ) : null}

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
            <Text style={[styles.selectTxt, { color: theme.text }]}>{branchLabel}</Text>
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
            <Text style={[styles.selectTxt, { color: theme.text }]}>{topicLabel}</Text>
          </Pressable>

          <Text style={[styles.lbl, { color: theme.textMuted }]}>Başlık</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[styles.inp, { color: theme.text, borderColor: theme.border }]}
          />

          <Text style={[styles.lbl, { color: theme.textMuted }]}>Not</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            style={[
              styles.bodyInp,
              { color: theme.text, borderColor: theme.border },
            ]}
          />

          <Text style={[styles.lbl, { color: theme.textMuted }]}>Ekler</Text>
          {attachments.map((a) => (
            <View
              key={a.id}
              style={[styles.fileRow, { borderColor: theme.border }]}
            >
              <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                {a.filename}
              </Text>
              <Pressable
                onPress={() => void removeAtt(a)}
                disabled={attBusy === a.id}
              >
                <Trash2 size={18} color={theme.error} />
              </Pressable>
            </View>
          ))}
          {pendingFiles.map((f, i) => (
            <View
              key={`p-${i}`}
              style={[styles.fileRow, { borderColor: theme.border }]}
            >
              <Text style={[styles.fileName, { color: theme.textMuted }]}>
                (bekleyen) {f.name}
              </Text>
              <Pressable onPress={() => setPendingFiles((p) => p.filter((_, j) => j !== i))}>
                <X size={18} color={theme.textMuted} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => void pickMore()}
            style={[styles.attachBtn, { borderColor: theme.border }]}
          >
            <Paperclip size={18} color={theme.accent} />
            <Text style={[styles.attachTxt, { color: theme.accent }]}>
              Ek ekle
            </Text>
          </Pressable>

          {error ? (
            <Text style={[styles.err, { color: theme.error }]}>{error}</Text>
          ) : null}

          <Button
            label="Kaydet"
            onPress={() => void save()}
            loading={submitting}
            disabled={submitting}
          />
        </ScrollView>

        <Modal visible={branchOpen} animationType="slide" transparent>
          <Pressable style={styles.modalBackdrop} onPress={() => setBranchOpen(false)}>
            <View style={[styles.modalSheet, { backgroundColor: theme.bg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Dal seçin</Text>
              <FlatList
                data={branches}
                keyExtractor={(b: TusBranch) => b.id}
                renderItem={renderBranch}
                style={{ maxHeight: 400 }}
              />
            </View>
          </Pressable>
        </Modal>

        <Modal visible={topicOpen} animationType="slide" transparent>
          <Pressable style={styles.modalBackdrop} onPress={() => setTopicOpen(false)}>
            <View style={[styles.modalSheet, { backgroundColor: theme.bg }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Konu seçin</Text>
              <FlatList
                data={topics}
                keyExtractor={(t: TusTopic) => t.id}
                renderItem={renderTopic}
                style={{ maxHeight: 400 }}
              />
            </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  warn: { paddingHorizontal: 16, paddingVertical: 8, fontFamily: fontReg(), fontSize: 13 },
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
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  attachTxt: { fontFamily: fontSemi(), fontSize: 14 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
});
