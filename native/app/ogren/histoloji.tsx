import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { HistologyImage } from "../../lib/api";
import { microscopyApi, resolveHistologyImageUrl } from "../../lib/api";
import { useTheme, useThemeMode } from "../../lib/theme";

const { width: SW } = Dimensions.get("window");
const TILE = (SW - 48) / 2;

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
  const { resolvedScheme } = useThemeMode();
  const [allItems, setAllItems] = useState<HistologyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOrgan, setFilterOrgan] = useState("");
  const [filterStain, setFilterStain] = useState("");

  const load = useCallback(async () => {
    const res = await microscopyApi.listImages({});
    setAllItems(res.data);
  }, []);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch {
        if (!c) setAllItems([]);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [load]);

  const EMPTY = "__EMPTY__";

  const organValues = useMemo(() => {
    const hasEmpty = allItems.some((it) => !(it.organ?.trim()));
    const s = new Set<string>();
    for (const it of allItems) {
      const o = it.organ?.trim();
      if (o) s.add(o);
    }
    const rest = [...s].sort((a, b) => a.localeCompare(b));
    return ["", ...(hasEmpty ? [EMPTY] : []), ...rest];
  }, [allItems]);

  const stainValues = useMemo(() => {
    const hasEmpty = allItems.some((it) => !(it.stain?.trim()));
    const s = new Set<string>();
    for (const it of allItems) {
      const st = it.stain?.trim();
      if (st) s.add(st);
    }
    const rest = [...s].sort((a, b) => a.localeCompare(b));
    return ["", ...(hasEmpty ? [EMPTY] : []), ...rest];
  }, [allItems]);

  const filtered = useMemo(() => {
    return allItems.filter((it) => {
      const org = it.organ?.trim() ?? "";
      const st = it.stain?.trim() ?? "";
      const organOk =
        filterOrgan === "" ||
        (filterOrgan === EMPTY && !org) ||
        (filterOrgan !== "" && filterOrgan !== EMPTY && org === filterOrgan);
      const stainOk =
        filterStain === "" ||
        (filterStain === EMPTY && !st) ||
        (filterStain !== "" && filterStain !== EMPTY && st === filterStain);
      return organOk && stainOk;
    });
  }, [allItems, filterOrgan, filterStain]);

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

  const chipStyle = (active: boolean) => ({
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8,
    borderColor: active ? theme.accent : theme.border,
    backgroundColor: active ? theme.accent + "33" : theme.surface,
  });

  const chipTextStyle = (active: boolean) => ({
    fontSize: 12,
    fontFamily: fontReg(),
    color: active ? theme.accent : theme.textMuted,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <StatusBar barStyle={resolvedScheme === "dark" ? "light-content" : "dark-content"} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
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
            fontSize: 17,
            fontFamily: fontBold(),
            textAlign: "center",
            color: theme.text,
          }}
          numberOfLines={1}
        >
          Histoloji
        </Text>
        <Text
          style={{
            minWidth: 72,
            fontSize: 13,
            fontFamily: fontReg(),
            color: theme.textMuted,
            textAlign: "right",
          }}
        >
          {filtered.length} görüntü
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 6,
        }}
      >
        {organValues.map((v) => {
          const active = filterOrgan === v;
          const label =
            v === "" ? "Tümü" : v === EMPTY ? "Diğer" : v || "Diğer";
          return (
            <Pressable
              key={`org-${v || "all"}`}
              onPress={() => {
                void Haptics.selectionAsync();
                setFilterOrgan(v);
              }}
              style={chipStyle(active)}
            >
              <Text style={chipTextStyle(active)}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 8,
        }}
      >
        {stainValues.map((v) => {
          const active = filterStain === v;
          const label = v === "" ? "Tümü" : v === EMPTY ? "—" : v;
          return (
            <Pressable
              key={`stain-${v || "all"}`}
              onPress={() => {
                void Haptics.selectionAsync();
                setFilterStain(v);
              }}
              style={chipStyle(active)}
            >
              <Text style={chipTextStyle(active)}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          numColumns={2}
          columnWrapperStyle={{
            gap: 12,
            paddingHorizontal: 16,
            marginBottom: 12,
          }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
          }
          ListEmptyComponent={
            <Text
              style={{
                color: theme.textMuted,
                textAlign: "center",
                marginTop: 32,
                fontFamily: fontReg(),
              }}
            >
              Filtreye uygun görüntü yok.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                router.push({
                  pathname: "/ogren/histoloji-detay",
                  params: { id: item.id, title: item.title },
                });
              }}
              style={{ width: TILE }}
            >
              <View
                style={{
                  width: TILE,
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: TILE,
                    height: TILE * 0.85,
                    backgroundColor: "#0a0a14",
                  }}
                >
                  <Image
                    source={{ uri: thumbUri(item) }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: TILE * 0.4,
                    }}
                  />
                  {item.stain ? (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        backgroundColor: "rgba(0,0,0,0.65)",
                        borderRadius: 6,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 10,
                          fontFamily: fontBold(),
                        }}
                      >
                        {item.stain}
                      </Text>
                    </View>
                  ) : null}
                  {item.organ ? (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        backgroundColor: "rgba(255,255,255,0.15)",
                        borderRadius: 6,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 10,
                          fontFamily: fontReg(),
                        }}
                      >
                        {item.organ}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ padding: 10 }}>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: 13,
                      fontFamily: fontBold(),
                      color: theme.text,
                      lineHeight: 18,
                    }}
                  >
                    {item.title}
                  </Text>
                  {item.science_unit ? (
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        fontFamily: fontReg(),
                        color: theme.accent,
                        marginTop: 4,
                      }}
                    >
                      {item.science_unit}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
