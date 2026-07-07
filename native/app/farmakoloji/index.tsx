import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Loader2, Pill } from "lucide-react-native";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
import { pharmaApi } from "../../lib/api";
import { readPharmaProgressStore } from "../../lib/pharmaProgress";
import { useTheme } from "../../lib/theme";

const LEVEL_LABEL: Record<string, string> = {
  temel: "Temel",
  sistem: "Sistem",
  klinik: "Klinik",
};

export default function FarmakolojiMapsScreen() {
  const theme = useTheme();

  const mapsQuery = useQuery({
    queryKey: ["pharma", "maps"],
    queryFn: async () => (await pharmaApi.listMaps()).data,
  });
  const progressQuery = useQuery({
    queryKey: ["pharma", "progress"],
    queryFn: readPharmaProgressStore,
  });

  const maps = [...(mapsQuery.data ?? [])].sort((a, b) => a.order - b.order);
  const progress = progressQuery.data ?? {};

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <ArrowLeft size={22} color={theme.foreground} />
        </Pressable>
        <Text style={[styles.barTitle, { color: theme.text }]}>Farmakoloji</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>İlaç haritaları</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Yolak yürüyüşü ile mekanizma haritalarını native olarak çalış.
        </Text>

        {mapsQuery.isLoading ? (
          <View style={styles.center}>
            <Loader2 size={28} color={theme.foreground} />
          </View>
        ) : null}

        {maps.map((m) => {
          const p = progress[m.id];
          const status = p?.pathTreeCompleted
            ? "Yolak ✓"
            : p?.visited
              ? "Başlandı"
              : null;
          return (
            <Pressable
              key={m.id}
              onPress={() => {
                void Haptics.selectionAsync();
                router.push(`/farmakoloji/${m.id}`);
              }}
              style={({ pressed }) => [pressed && { opacity: 0.88 }]}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Pill size={14} color={theme.textMuted} style={{ opacity: 0.5 }} />
                  <View style={styles.meta}>
                    <Text style={[styles.mapTitle, { color: theme.text }]}>{m.title_tr}</Text>
                    <Text style={[styles.mapDesc, { color: theme.textMuted }]} numberOfLines={2}>
                      {m.description_tr}
                    </Text>
                    <Text style={[styles.mapMeta, { color: theme.textMuted }]}>
                      {LEVEL_LABEL[m.level] ?? m.level} · ~{m.estimated_minutes} dk
                      {status ? ` · ${status}` : ""}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={theme.textMuted} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 32, gap: 10 },
  title: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 24,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
    marginBottom: 8,
  },
  center: { paddingVertical: 40, alignItems: "center" },
  card: { marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  meta: { flex: 1, gap: 4 },
  mapTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  mapDesc: { fontSize: 12, lineHeight: 17 },
  mapMeta: { fontSize: 11 },
});
