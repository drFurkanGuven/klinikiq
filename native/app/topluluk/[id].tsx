import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Bookmark,
  ExternalLink,
  Heart,
  PenLine,
  Trash2,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
import { communityApi } from "../../lib/api";
import { resolveCommunityUploadUrl } from "../../lib/communityUploadUrl";
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

export default function ToplulukDetailScreen() {
  const theme = useTheme();
  const raw = useLocalSearchParams<{ id: string | string[] }>().id;
  const id = typeof raw === "string" ? raw : raw?.[0] ?? "";
  const queryClient = useQueryClient();

  const noteQuery = useQuery({
    queryKey: ["community", "notes", id],
    queryFn: async () => (await communityApi.getNote(id)).data,
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => communityApi.toggleLike(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community"] });
      void noteQuery.refetch();
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => communityApi.toggleSave(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community"] });
      void noteQuery.refetch();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => communityApi.deleteNote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community"] });
      router.replace("/topluluk");
    },
  });

  const n = noteQuery.data;

  const openAttachment = (url: string) => {
    const href = resolveCommunityUploadUrl(url);
    if (href) void Linking.openURL(href);
  };

  const confirmDelete = () => {
    Alert.alert("Notu sil", "Emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
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
        <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>
          Not
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {noteQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : noteQuery.isError || !n ? (
        <Text style={[styles.err, { color: theme.error }]}>
          Not yüklenemedi.
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {n.moderation_status === "pending" ? (
            <Card style={[styles.warnCard, { borderColor: theme.border }]}>
              <Text style={[styles.warnTxt, { color: theme.textMuted }]}>
                Bu not yönetici onayı bekliyor; onaylanana kadar akışta görünmeyebilir.
              </Text>
            </Card>
          ) : null}
          {n.moderation_status === "rejected" ? (
            <Card style={[styles.warnCard, { borderColor: theme.error + "66" }]}>
              <Text style={[styles.warnTxt, { color: theme.error }]}>
                Bu not reddedildi.
              </Text>
            </Card>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                likeMutation.mutate();
              }}
              style={styles.pill}
              disabled={likeMutation.isPending}
            >
              <Heart
                size={20}
                color={n.liked_by_me ? theme.error : theme.textMuted}
                fill={n.liked_by_me ? theme.error : "transparent"}
              />
              <Text style={[styles.pillTxt, { color: theme.text }]}>
                {n.likes}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                saveMutation.mutate();
              }}
              style={styles.pill}
              disabled={saveMutation.isPending}
            >
              <Bookmark
                size={20}
                color={n.saved_by_me ? theme.accent : theme.textMuted}
                fill={n.saved_by_me ? theme.accent : "transparent"}
              />
              <Text style={[styles.pillTxt, { color: theme.text }]}>
                Kaydet
              </Text>
            </Pressable>
            {n.is_mine ? (
              <>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    router.push({
                      pathname: "/topluluk/not-duzenle",
                      params: { id: n.id },
                    });
                  }}
                  style={styles.pill}
                >
                  <PenLine size={20} color={theme.accent} />
                  <Text style={[styles.pillTxt, { color: theme.accent }]}>
                    Düzenle
                  </Text>
                </Pressable>
                <Pressable onPress={confirmDelete} style={styles.pill}>
                  <Trash2 size={20} color={theme.error} />
                </Pressable>
              </>
            ) : null}
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{n.title}</Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>
            {n.author_display}
          </Text>
          <Card style={[styles.bodyCard, { borderColor: theme.border }]}>
            <Text style={[styles.body, { color: theme.text }]}>{n.body}</Text>
          </Card>

          {(n.attachments?.length ?? 0) > 0 ? (
            <View style={styles.attSection}>
              <Text style={[styles.attTitle, { color: theme.textMuted }]}>
                Ekler
              </Text>
              {n.attachments!.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => openAttachment(a.url)}
                  style={[styles.attRow, { borderColor: theme.border }]}
                >
                  <Text style={[styles.attName, { color: theme.accent }]} numberOfLines={1}>
                    {a.filename}
                  </Text>
                  <ExternalLink size={16} color={theme.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}
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
  navTitle: { fontFamily: fontBold(), fontSize: 16, flex: 1, textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  err: { fontFamily: fontReg(), fontSize: 15, padding: 16 },
  scroll: { padding: 16, paddingBottom: 40 },
  warnCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  warnTxt: { fontFamily: fontReg(), fontSize: 13, lineHeight: 18 },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pillTxt: { fontFamily: fontSemi(), fontSize: 14 },
  title: { fontFamily: fontBold(), fontSize: 22, marginBottom: 8 },
  meta: { fontFamily: fontReg(), fontSize: 13, marginBottom: 16 },
  bodyCard: { padding: 14, borderWidth: 1, borderRadius: 14 },
  body: { fontFamily: fontReg(), fontSize: 15, lineHeight: 24 },
  attSection: { marginTop: 20 },
  attTitle: {
    fontFamily: fontBold(),
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  attRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  attName: { fontFamily: fontSemi(), fontSize: 14, flex: 1, marginRight: 8 },
});
