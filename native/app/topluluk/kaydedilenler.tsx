import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, Bookmark, Heart } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function KaydedilenlerScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const listQuery = useQuery({
    queryKey: ["community", "saved", debounced],
    queryFn: async () =>
      (
        await communityApi.listSavedNotes({
          q: debounced || undefined,
          limit: 80,
        })
      ).data,
  });

  const likeMut = useMutation({
    mutationFn: (id: string) => communityApi.toggleLike(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });

  const saveMut = useMutation({
    mutationFn: (id: string) => communityApi.toggleSave(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community"] });
    },
  });

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
          <View style={styles.row}>
            <Text style={[styles.author, { color: theme.textMuted }]}>
              {item.author_display}
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  saveMut.mutate(item.id);
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
                  likeMut.mutate(item.id);
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
    [likeMut, saveMut, theme]
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
        <Text style={[styles.navTitle, { color: theme.text }]}>Kaydedilenler</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchWrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Ara…"
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInp, { color: theme.text }]}
        />
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
              Kayıtlı not yok.
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
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInp: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontReg(),
    fontSize: 16,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { padding: 14, borderWidth: 1, borderRadius: 14, marginBottom: 12 },
  title: { fontFamily: fontBold(), fontSize: 16, marginBottom: 6 },
  excerpt: { fontFamily: fontReg(), fontSize: 14, lineHeight: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  author: { fontFamily: fontSemi(), fontSize: 12, flex: 1, paddingRight: 8 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  likes: { fontFamily: fontSemi(), fontSize: 12 },
  empty: { textAlign: "center", marginTop: 40, fontFamily: fontReg(), fontSize: 15 },
});
