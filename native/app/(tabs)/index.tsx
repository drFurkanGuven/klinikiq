import { Stethoscope } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalisBugunTab } from "../../components/calis/CalisBugunTab";
import { CalisIlerlemeTab } from "../../components/calis/CalisIlerlemeTab";
import { CalisProfilTab } from "../../components/calis/CalisProfilTab";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { resetPharmaProgressHydration } from "../../lib/pharmaProgress";
import { useTheme } from "../../lib/theme";

const TABS = [
  { id: "bugun" as const, label: "Bugün" },
  { id: "ilerleme" as const, label: "İlerleme" },
  { id: "profil" as const, label: "Profil" },
];

const SUBTITLES: Record<(typeof TABS)[number]["id"], string> = {
  bugun: "Türkçe acil MCQ + akıllı tekrar",
  ilerleme: "Tüm ders ve modül ilerlemelerin",
  profil: "Hesap bilgileri ve uygulama ayarları",
};

export default function CalisTab() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("bugun");

  const refreshPharmaProgress = useCallback(() => {
    resetPharmaProgressHydration();
    void queryClient.invalidateQueries({ queryKey: ["pharma", "progress"] });
  }, [queryClient]);

  useFocusEffect(
    useCallback(() => {
      if (tab === "ilerleme") refreshPharmaProgress();
    }, [tab, refreshPharmaProgress])
  );

  const onTabChange = (next: (typeof TABS)[number]["id"]) => {
    setTab(next);
    if (next === "ilerleme") refreshPharmaProgress();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.brand}>
          <Stethoscope size={18} color={theme.foreground} />
          <Text style={[styles.brandText, { color: theme.text }]}>KlinikIQ</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={[styles.title, { color: theme.text }]}>Çalış</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {SUBTITLES[tab]}
          </Text>
        </View>

        <SegmentedControl tabs={TABS} active={tab} onChange={onTabChange} />

        {tab === "bugun" && <CalisBugunTab />}
        {tab === "ilerleme" && <CalisIlerlemeTab />}
        {tab === "profil" && <CalisProfilTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
    letterSpacing: -0.2,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 20,
  },
  hero: { paddingTop: 8, gap: 4 },
  title: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 26,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
  },
});
