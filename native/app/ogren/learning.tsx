import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { LearningCard } from "../../lib/api";
import { learningApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";

const { width: SW, height: SH } = Dimensions.get("window");

const CARD_HEIGHT = SH * 0.72;

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

const GRADIENT_BY_SPECIALTY: Record<string, [string, string]> = {
  cardiology: ["#ef4444", "#b91c1c"],
  neurology: ["#8b5cf6", "#6d28d9"],
  nephrology: ["#3b82f6", "#1d4ed8"],
  pulmonology: ["#06b6d4", "#0e7490"],
  gastroenterology: ["#f97316", "#c2410c"],
  hematology: ["#ec4899", "#be185d"],
  infectious_disease: ["#10b981", "#047857"],
  rheumatology: ["#f59e0b", "#b45309"],
  endocrinology: ["#6366f1", "#4338ca"],
};

function gradientForSpecialty(s: string): [string, string] {
  return GRADIENT_BY_SPECIALTY[s] ?? ["#64748b", "#334155"];
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

export default function OgrenLearningScreen() {
  const theme = useTheme();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [items, setItems] = useState<LearningCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const idxRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

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

  useEffect(() => {
    setIdx(0);
    idxRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [filter]);

  const loadMore = useCallback(async () => {
    if (items.length >= total || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await learningApi.cards({
        specialty: filter || undefined,
        limit: 20,
        offset: items.length,
      });
      setItems((prev) => [...prev, ...res.data.items]);
    } finally {
      setLoadingMore(false);
    }
  }, [filter, items.length, loadingMore, total]);

  const onMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIdx = Math.min(
      Math.max(0, Math.round(x / SW)),
      Math.max(0, items.length - 1)
    );

    if (newIdx !== idxRef.current) {
      idxRef.current = newIdx;
      setIdx(newIdx);
      void Haptics.selectionAsync();
    }

    if (
      items.length > 0 &&
      newIdx === items.length - 1 &&
      items.length < total &&
      !loadingMore
    ) {
      void loadMore();
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={["top"]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 8,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}
        >
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontFamily: fontBold(),
            textAlign: "center",
            color: theme.text,
          }}
          numberOfLines={1}
        >
          Öğrenme Kartları
        </Text>
        <Text
          style={{
            minWidth: 56,
            fontSize: 14,
            fontFamily: fontReg(),
            color: theme.textMuted,
            textAlign: "right",
          }}
        >
          {items.length > 0 ? `${idx + 1} / ${items.length}` : "—"}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 8,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {["", ...specialties].map((s) => {
          const active = filter === s;
          const label = s === "" ? "Tümü" : SPEC_LABEL[s] ?? s;
          return (
            <Pressable
              key={s || "all"}
              onPress={() => {
                void Haptics.selectionAsync();
                setFilter(s);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                marginRight: 8,
                borderColor: active ? theme.accent : theme.border,
                backgroundColor: active ? theme.accent + "22" : theme.surface,
              }}
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
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: theme.textMuted, fontFamily: fontReg(), fontSize: 16 }}>
            Henüz kart yok
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          decelerationRate="fast"
        >
          {items.map((item, i) => {
            const [c0, c1] = gradientForSpecialty(item.specialty);
            const specLabel = SPEC_LABEL[item.specialty] ?? item.specialty;
            return (
              <View key={item.report_id} style={{ width: SW }}>
                <LinearGradient
                  colors={[c0, c1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: CARD_HEIGHT,
                    marginHorizontal: 20,
                    marginVertical: 12,
                    borderRadius: 28,
                    padding: 20,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontFamily: fontReg(),
                          fontSize: 12,
                        }}
                      >
                        {specLabel}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: "rgba(255,255,255,0.2)",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontFamily: fontBold(),
                          fontSize: 12,
                        }}
                      >
                        Skor {item.score}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1, justifyContent: "center", paddingVertical: 16 }}>
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: fontBold(),
                        fontSize: 22,
                        lineHeight: 30,
                      }}
                    >
                      {specLabel}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.92)",
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    {item.pathophysiology_note ? (
                      <Text
                        style={{
                          color: "#1e293b",
                          fontFamily: fontReg(),
                          fontSize: 14,
                          lineHeight: 21,
                        }}
                      >
                        {item.pathophysiology_note}
                      </Text>
                    ) : null}
                    {item.tus_reference ? (
                      <Text
                        style={{
                          color: "#b45309",
                          fontFamily: fontBold(),
                          fontSize: 13,
                          marginTop: item.pathophysiology_note ? 10 : 0,
                        }}
                      >
                        TUS: {item.tus_reference}
                      </Text>
                    ) : null}
                    {i < items.length - 1 ? (
                      <Text
                        style={{
                          color: "rgba(30,41,59,0.55)",
                          fontFamily: fontReg(),
                          fontSize: 12,
                          textAlign: "center",
                          marginTop: 12,
                        }}
                      >
                        Kaydır →
                      </Text>
                    ) : null}
                  </View>
                </LinearGradient>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
