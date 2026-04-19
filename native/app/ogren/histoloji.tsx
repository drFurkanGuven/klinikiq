import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { HistologyImage } from "../../lib/api";
import { microscopyApi, resolveHistologyImageUrl } from "../../lib/api";
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

export default function HistolojiScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<HistologyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<HistologyImage | null>(null);

  const load = useCallback(async () => {
    const res = await microscopyApi.listImages({});
    setItems(res.data);
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch {
        if (!c) setItems([]);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const thumbUri = (img: HistologyImage) =>
    resolveHistologyImageUrl(img.thumbnail_url || img.image_url);

  /** DZI vb. için web ile aynı: birincil url yoksa `fullUrl` üzerinden _thumb raster */
  const fullUri = (img: HistologyImage) =>
    resolveHistologyImageUrl(undefined, img.image_url);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          Histoloji
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          numColumns={2}
          columnWrapperStyle={styles.row2}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={{ color: theme.textMuted, textAlign: "center", marginTop: 32 }}>
              Henüz görüntü yok veya liste yüklenemedi.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.tile,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
              onPress={() => {
                void Haptics.selectionAsync();
                setDetail(item);
              }}
            >
              <Image
                source={{ uri: thumbUri(item) }}
                style={styles.thumb}
                resizeMode="cover"
              />
              <Text style={[styles.tileTitle, { color: theme.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              {item.stain ? (
                <Text style={[styles.tileMeta, { color: theme.textMuted }]} numberOfLines={1}>
                  {item.stain}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.modalBg} onPress={() => setDetail(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface }]} onPress={() => {}}>
            {detail ? (
              <>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{detail.title}</Text>
                {detail.description ? (
                  <Text style={[styles.modalDesc, { color: theme.textMuted }]}>{detail.description}</Text>
                ) : null}
                <Image
                  source={{ uri: fullUri(detail) }}
                  style={styles.modalImg}
                  resizeMode="contain"
                />
                <Pressable
                  onPress={() => setDetail(null)}
                  style={[styles.closeBtn, { backgroundColor: theme.accent }]}
                >
                  <Text style={styles.closeBtnTxt}>Kapat</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
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
  title: { flex: 1, fontSize: 16, fontFamily: fontBold(), textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 12, paddingBottom: 40 },
  row2: { gap: 10 },
  tile: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    paddingBottom: 8,
  },
  thumb: { width: "100%", aspectRatio: 1.2, backgroundColor: "#111" },
  tileTitle: { fontSize: 13, fontFamily: fontBold(), marginTop: 8, paddingHorizontal: 8 },
  tileMeta: { fontSize: 11, fontFamily: fontReg(), marginTop: 2, paddingHorizontal: 8 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: { borderRadius: 16, padding: 16, maxHeight: "90%" },
  modalTitle: { fontSize: 17, fontFamily: fontBold() },
  modalDesc: { fontSize: 14, fontFamily: fontReg(), marginTop: 8, lineHeight: 20 },
  modalImg: { width: "100%", height: 280, marginTop: 12 },
  closeBtn: { marginTop: 16, padding: 14, borderRadius: 12, alignItems: "center" },
  closeBtnTxt: { color: "#fff", fontFamily: fontBold(), fontSize: 16 },
});
