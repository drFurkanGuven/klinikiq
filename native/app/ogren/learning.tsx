import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
import type { LearningCard } from "../../lib/api";
import { learningApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";

const SPEC_LABEL: Record<string, string> = {
  cardiology: "Kardiyoloji",
  neurology: "Nöroloji",
  nephrology: "Nefroloji",
  pulmonology: "Pulmonoloji",
  gastroenterology: "Gastroenteroloji",
  hematology: "Hematoloji",
  infectious_disease: "Enfeksiyon",
  rheumatology: "Romatoloji",
  endocrinology: "Endokrinoloji",
  dermatology: "Dermatoloji",
  other: "Diğer",
};

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

export default function OgrenLearningScreen() {
  const theme = useTheme();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [items, setItems] = useState<LearningCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await learningApi.cards({
      specialty: filter || undefined,
      limit: 20,
      offset: 0,
    });
    setItems(res.data.items);
    setTotal(res.data.total);
  }, [filter]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const s = await learningApi.specialties();
        if (!c) setSpecialties(s.data);
      } catch {
        if (!c) setSpecialties([]);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        await load();
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

  const loadMore = async () => {
    if (items.length >= total) return;
    void Haptics.selectionAsync();
    const res = await learningApi.cards({
      specialty: filter || undefined,
      limit: 20,
      offset: items.length,
    });
    setItems((prev) => [...prev, ...res.data.items]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          Öğrenme kartları
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        horizontal
        data={["", ...specialties]}
        keyExtractor={(s) => s || "all"}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item: s }) => {
          const active = filter === s;
          const label = s === "" ? "Tümü" : SPEC_LABEL[s] ?? s;
          return (
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setFilter(s);
              }}
              style={[
                styles.chip,
                {
                  borderColor: active ? theme.accent : theme.border,
                  backgroundColor: active ? theme.accent + "22" : theme.surface,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.accent : theme.textMuted,
                  fontFamily: fontReg(),
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.report_id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={{ color: theme.textMuted, textAlign: "center", marginTop: 32 }}>
              Henüz kayıt yok veya filtrede sonuç yok.
            </Text>
          }
          renderItem={({ item }) => (
            <Card style={[styles.item, { borderColor: theme.border }]}>
              <Text style={[styles.itTitle, { color: theme.text }]}>{item.case_title}</Text>
              <Text style={[styles.itMeta, { color: theme.textMuted }]}>
                {SPEC_LABEL[item.specialty] ?? item.specialty} · Skor {item.score}
              </Text>
              {item.pathophysiology_note ? (
                <Text style={[styles.itBody, { color: theme.text }]}>
                  {item.pathophysiology_note}
                </Text>
              ) : null}
              {item.tus_reference ? (
                <Text style={[styles.itTus, { color: theme.accent }]}>
                  TUS: {item.tus_reference}
                </Text>
              ) : null}
            </Card>
          )}
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
  title: { flex: 1, fontSize: 16, fontFamily: fontBold(), textAlign: "center" },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 40 },
  item: { marginBottom: 12, padding: 16, borderWidth: 1, borderRadius: 16 },
  itTitle: { fontSize: 16, fontFamily: fontBold() },
  itMeta: { fontSize: 12, fontFamily: fontReg(), marginTop: 4 },
  itBody: { fontSize: 14, fontFamily: fontReg(), marginTop: 10, lineHeight: 21 },
  itTus: { fontSize: 13, fontFamily: fontReg(), marginTop: 8 },
});
