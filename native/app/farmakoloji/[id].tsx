import { router, Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react-native";
import { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PathwayTreeExercise } from "../../components/pharma/PathwayTreeExercise";
import { pharmaApi } from "../../lib/api";
import { ensurePharmaProgressHydrated, markMapVisited } from "../../lib/pharmaProgress";
import { useTheme } from "../../lib/theme";

export default function FarmakolojiMapScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapId = typeof id === "string" ? id : "";

  const mapQuery = useQuery({
    queryKey: ["pharma", "map", mapId],
    enabled: mapId.length > 0,
    queryFn: async () => (await pharmaApi.getMap(mapId)).data,
  });

  useEffect(() => {
    if (!mapId) return;
    void ensurePharmaProgressHydrated().then(() => markMapVisited(mapId));
  }, [mapId]);

  const map = mapQuery.data;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.foreground} />
        </Pressable>
        <Text style={[styles.barTitle, { color: theme.text }]} numberOfLines={1}>
          {map?.title_tr ?? "Harita"}
        </Text>
        <View style={styles.back} />
      </View>

      {mapQuery.isLoading ? (
        <View style={styles.center}>
          <Loader2 size={28} color={theme.foreground} />
        </View>
      ) : mapQuery.isError || !map ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textMuted }}>Harita yüklenemedi.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.desc, { color: theme.textMuted }]}>{map.description_tr}</Text>
          <PathwayTreeExercise mapId={mapId} map={map} />
          <Text style={[styles.source, { color: theme.textMuted }]}>
            {map.source_attribution}
          </Text>
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
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  barTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 16,
  },
  scroll: { padding: 16, paddingBottom: 40, gap: 12 },
  desc: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
    lineHeight: 20,
  },
  source: { fontSize: 11, marginTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
