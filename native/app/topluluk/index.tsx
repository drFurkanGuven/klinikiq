import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  PenLine,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
import { communityApi, type CommunityNoteItem } from "../../lib/api";
import {
  type TusGroupId,
  TIP_SECTION_LABEL,
  TUS_GROUP_META,
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

export default function ToplulukIndexScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [group, setGroup] = useState<TusGroupId>("temel");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const listQuery = useQuery({
    queryKey: ["community", "notes", group, debounced],
    queryFn: async () =>
      (
        await communityApi.listNotes({
          group,
          q: debounced || undefined,
          limit: 50,
        })
      ).data,
  });

  const likeMutation = useMutation({
    mutationFn: (noteId: string) => communityApi.toggleLike(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (noteId: string) => communityApi.toggleSave(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => communityApi.deleteNote(noteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });

  const onDelete = (item: CommunityNoteItem) => {
    Alert.alert(
      "Notu sil",
      "Bu not kalıcı olarak silinsin mi?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            );
            deleteMutation.mutate(item.id);
          },
        },
      ]
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: CommunityNoteItem }) => (
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          router.push(`/topluluk/${item.id}`);
        }}
        style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      >
        <Card style={[styles.card, { borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text
            style={[styles.excerpt, { color: theme.textMuted }]}
            numberOfLines={3}
          >
            {item.excerpt}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.author, { color: theme.textMuted }]}>
              {item.author_display}
            </Text>
            <View style={styles.actions}>
              {item.is_mine ? (
                <Pressable
                  onPress={() => onDelete(item)}
                  hitSlop={8}
                  style={styles.iconBtn}
                >
                  <Trash2 size={17} color={theme.error} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  saveMutation.mutate(item.id);
                }}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <Bookmark
                  size={18}
                  color={item.saved_by_me ? theme.accent : theme.textMuted}
                  fill={item.saved_by_me ? theme.accent : "transparent"}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  likeMutation.mutate(item.id);
                }}
                hitSlop={8}
                style={styles.iconBtn}
              >
                <Heart
                  size={18}
                  color={item.liked_by_me ? theme.error : theme.textMuted}
                  fill={item.liked_by_me ? theme.error : "transparent"}
                />
                <Text style={[styles.likes, { color: theme.textMuted }]}>
                  {item.likes}
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </Pressable>
    ),
    [deleteMutation, likeMutation, saveMutation, theme]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.badgeRow}>
          <Text style={[styles.tipBadge, { color: theme.accent }]}>
            {TIP_SECTION_LABEL}
          </Text>
        </View>
        <Text style={[styles.h1, { color: theme.text }]}>Not akışı</Text>
        <Text style={[styles.intro, { color: theme.textMuted }]}>
          Beğeni ve kaydet; kaydedilenler yalnızca sana özel listede durur.
        </Text>
        <View style={styles.topActions}>
          <Pressable
            style={[styles.outlineBtn, { borderColor: theme.border }]}
            onPress={() => {
              void Haptics.selectionAsync();
              router.push("/topluluk/kaydedilenler");
            }}
          >
            <Bookmark size={16} color={theme.textMuted} />
            <Text style={[styles.outlineBtnTxt, { color: theme.text }]}>
              Kaydedilenler
            </Text>
          </Pressable>
          <Pressable
            style={[styles.primaryMini, { backgroundColor: theme.accent }]}
            onPress={() => {
              void Haptics.selectionAsync();
              router.push("/topluluk/paylas");
            }}
          >
            <PenLine size={16} color="#fff" />
            <Text style={styles.primaryMiniTxt}>Not paylaş</Text>
          </Pressable>
        </View>

        <Text style={[styles.filterLbl, { color: theme.textMuted }]}>
          Sınıf
        </Text>
        <View style={styles.groupRow}>
          {(["temel", "klinik"] as const).map((g) => {
            const on = group === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setGroup(g);
                }}
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

        <View
          style={[
            styles.searchWrap,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Akışta ara…"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInp, { color: theme.text }]}
          />
        </View>
      </View>
    ),
    [group, query, theme]
  );

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
        <Text style={[styles.navTitle, { color: theme.text }]}>Topluluk</Text>
        <View style={{ width: 40 }} />
      </View>

      {listQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={listQuery.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={listQuery.isRefetching && !listQuery.isLoading}
              onRefresh={() => void listQuery.refetch()}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.textMuted }]}>
              Bu filtrede not yok.
            </Text>
          }
        />
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
  navTitle: { fontFamily: fontBold(), fontSize: 17 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  headerBlock: { marginBottom: 8 },
  badgeRow: { marginBottom: 8 },
  tipBadge: {
    fontFamily: fontBold(),
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  h1: {
    fontFamily: Platform.select({
      ios: "Inter_900Black",
      android: "Inter_900Black",
      default: "Inter_900Black",
    }),
    fontSize: 26,
    marginBottom: 8,
  },
  intro: {
    fontFamily: fontReg(),
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  topActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  outlineBtnTxt: { fontFamily: fontSemi(), fontSize: 13 },
  primaryMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  primaryMiniTxt: { color: "#fff", fontFamily: fontBold(), fontSize: 13 },
  filterLbl: {
    fontFamily: fontBold(),
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  groupRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  groupChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  groupChipTxt: { fontFamily: fontSemi(), fontSize: 13 },
  searchWrap: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInp: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontReg(),
    fontSize: 16,
  },
  card: { padding: 14, borderWidth: 1, borderRadius: 14, marginBottom: 12 },
  title: { fontFamily: fontBold(), fontSize: 16, marginBottom: 6 },
  excerpt: { fontFamily: fontReg(), fontSize: 14, lineHeight: 20 },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  author: { fontFamily: fontSemi(), fontSize: 12, flex: 1, paddingRight: 8 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  likes: { fontFamily: fontSemi(), fontSize: 12 },
  empty: {
    textAlign: "center",
    marginTop: 24,
    fontFamily: fontReg(),
    fontSize: 15,
  },
});
