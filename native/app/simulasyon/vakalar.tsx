import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  ArrowLeft,
  Filter,
  Play,
  Search,
  Stethoscope,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Case } from "../../lib/api";
import { casesApi, sessionsApi, usersApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";

const SPECIALTIES = [
  "Tümü",
  "Kardiyoloji",
  "Nöroloji",
  "Endokrinoloji",
  "Gastroenteroloji",
  "Pulmoloji",
  "Nefroloji",
  "Hematoloji",
  "Onkoloji",
  "İnfeksiyon",
  "Romatoloji",
  "Acil Tıp",
  "Dahiliye",
  "Cerrahi",
];

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
};

const DIFFICULTY_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  easy: { bg: "#34D39922", text: "#34D399" },
  medium: { bg: "#818CF822", text: "#818CF8" },
  hard: { bg: "#F8717122", text: "#F87171" },
};

export default function VakalarScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("Tümü");
  const [startingId, setStartingId] = useState<string | null>(null);

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: async () => (await casesApi.list()).data,
  });

  const historyQuery = useQuery({
    queryKey: ["users", "history"],
    queryFn: async () => (await usersApi.history()).data,
  });

  // Map case_title → session_id for active sessions
  const activeByCaseTitle = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of historyQuery.data ?? []) {
      if (String(h.status) === "active") {
        map.set(h.case_title, h.session_id);
      }
    }
    return map;
  }, [historyQuery.data]);

  const filtered = useMemo(() => {
    let items = casesQuery.data ?? [];
    if (selectedSpecialty !== "Tümü") {
      items = items.filter((c) =>
        c.specialty
          .toLowerCase()
          .includes(selectedSpecialty.toLowerCase())
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.specialty.toLowerCase().includes(q) ||
          (c.chief_complaint ?? "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [casesQuery.data, selectedSpecialty, search]);

  const createSessionMutation = useMutation({
    mutationFn: (case_id: string) => sessionsApi.create(case_id),
    onSuccess: (res) => {
      const sessionId = res.data.id;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: "/simulasyon/vaka",
        params: { session_id: sessionId },
      });
    },
    onError: () => {
      Alert.alert("Hata", "Oturum başlatılamadı, tekrar deneyin.");
    },
  });

  const handleStart = useCallback(
    (item: Case) => {
      const existing = activeByCaseTitle.get(item.title);
      if (existing) {
        Alert.alert(
          "Aktif Oturum Var",
          `"${item.title}" için devam eden bir oturum mevcut.`,
          [
            {
              text: "Devam Et",
              onPress: () => {
                router.push({
                  pathname: "/simulasyon/vaka",
                  params: { session_id: existing },
                });
              },
            },
            {
              text: "Yeni Başlat",
              style: "destructive",
              onPress: () => {
                setStartingId(item.id);
                createSessionMutation.mutate(item.id);
              },
            },
            { text: "İptal", style: "cancel" },
          ]
        );
        return;
      }
      setStartingId(item.id);
      createSessionMutation.mutate(item.id);
    },
    [activeByCaseTitle, createSessionMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Case }) => {
      const isActive = activeByCaseTitle.has(item.title);
      const isStarting = startingId === item.id && createSessionMutation.isPending;
      const diff = DIFFICULTY_COLORS[item.difficulty] ?? {
        bg: theme.border,
        text: theme.textMuted,
      };

      return (
        <Pressable
          style={({ pressed }) => [
            styles.caseCard,
            {
              backgroundColor: theme.card,
              borderColor: isActive ? theme.accent + "66" : theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={() => handleStart(item)}
        >
          {/* Specialty + difficulty row */}
          <View style={styles.caseTopRow}>
            <View style={[styles.specBadge, { backgroundColor: theme.accent + "18" }]}>
              <Text style={[styles.specText, { color: theme.accent }]}>
                {item.specialty}
              </Text>
            </View>
            <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
              <Text style={[styles.diffText, { color: diff.text }]}>
                {DIFFICULTY_LABELS[item.difficulty] ?? item.difficulty}
              </Text>
            </View>
            {isActive && (
              <View style={[styles.activePill, { backgroundColor: theme.accent }]}>
                <Text style={styles.activePillText}>Aktif</Text>
              </View>
            )}
          </View>

          {/* Title + complaint */}
          <Text style={[styles.caseTitle, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.chief_complaint ? (
            <Text
              style={[styles.caseComplaint, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {item.chief_complaint}
            </Text>
          ) : null}

          {/* Patient info */}
          {(item.patient_age != null || item.patient_gender) ? (
            <Text style={[styles.casePatient, { color: theme.textMuted }]}>
              {[
                item.patient_age ? `${item.patient_age} yaş` : null,
                item.patient_gender,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}

          {/* Action */}
          <View style={styles.caseFooter}>
            <Pressable
              style={[
                styles.startBtn,
                {
                  backgroundColor: isActive ? theme.accent + "22" : theme.accent,
                },
              ]}
              onPress={() => handleStart(item)}
              disabled={isStarting}
            >
              {isStarting ? (
                <ActivityIndicator size="small" color={isActive ? theme.accent : "#fff"} />
              ) : (
                <>
                  <Play
                    size={13}
                    color={isActive ? theme.accent : "#fff"}
                    fill={isActive ? theme.accent : "#fff"}
                  />
                  <Text
                    style={[
                      styles.startBtnText,
                      { color: isActive ? theme.accent : "#fff" },
                    ]}
                  >
                    {isActive ? "Devam Et" : "Başla"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      );
    },
    [
      activeByCaseTitle,
      createSessionMutation.isPending,
      handleStart,
      startingId,
      theme,
    ]
  );

  const isLoading = casesQuery.isLoading || historyQuery.isLoading;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      {/* Navbar */}
      <View style={[styles.navbar, { borderBottomColor: theme.border }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <View style={styles.navCenter}>
          <Stethoscope size={18} color={theme.accent} />
          <Text style={[styles.navTitle, { color: theme.text }]}>
            Vaka Simülasyonu
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View
        style={[
          styles.disclaimerStrip,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.disclaimerText, { color: theme.textMuted }]}>
          Eğitim simülasyonu · Metinler AI ile üretilebilir · Tıbbi tavsiye değildir
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Search size={16} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Vaka veya şikayet ara…"
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {filtered.length > 0 && !isLoading ? (
            <Text style={[styles.countBadge, { color: theme.textMuted }]}>
              {filtered.length}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Specialty filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        style={styles.pillScroll}
      >
        {SPECIALTIES.map((sp) => {
          const active = selectedSpecialty === sp;
          return (
            <Pressable
              key={sp}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: active ? theme.accent : theme.card,
                  borderColor: active ? theme.accent : theme.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => {
                setSelectedSpecialty(sp);
                void Haptics.selectionAsync();
              }}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: active ? "#fff" : theme.textMuted },
                ]}
              >
                {sp}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Case list */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Vakalar yükleniyor…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={1}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Filter size={32} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Sonuç bulunamadı
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.textMuted }]}>
                Farklı bir branş veya arama terimi deneyin.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  navCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navTitle: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 17,
  },
  disclaimerStrip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    padding: 0,
  },
  countBadge: {
    fontSize: 12,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
  },
  pillScroll: {
    flexGrow: 0,
    marginBottom: 6,
  },
  pillRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 13,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  caseCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  caseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  specBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  specText: {
    fontSize: 11,
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
  },
  diffBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  diffText: {
    fontSize: 11,
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
  },
  activePill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activePillText: {
    fontSize: 11,
    color: "#fff",
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
  },
  caseTitle: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 15,
    lineHeight: 21,
  },
  caseComplaint: {
    fontSize: 13,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  casePatient: {
    fontSize: 12,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
  caseFooter: {
    marginTop: 4,
    alignItems: "flex-start",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  startBtnText: {
    fontSize: 13,
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 16,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
