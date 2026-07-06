import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Stethoscope,
  TestTube2,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { sessionsApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";

function fontBold() {
  return Platform.select({ ios: "Inter_700Bold", android: "Inter_700Bold", default: "Inter_700Bold" });
}
function fontSemi() {
  return Platform.select({ ios: "Inter_600SemiBold", android: "Inter_600SemiBold", default: "Inter_600SemiBold" });
}
function fontReg() {
  return Platform.select({ ios: "Inter_400Regular", android: "Inter_400Regular", default: "Inter_400Regular" });
}
function fontBlack() {
  return Platform.select({ ios: "Inter_900Black", android: "Inter_900Black", default: "Inter_900Black" });
}

function Section({
  title,
  children,
  defaultOpen = true,
  theme,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {open
          ? <ChevronUp size={16} color={theme.textMuted} />
          : <ChevronDown size={16} color={theme.textMuted} />}
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

export default function RaporScreen() {
  const theme = useTheme();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();

  const reportQuery = useQuery({
    queryKey: ["report", session_id],
    queryFn: async () => (await sessionsApi.getReport(session_id)).data,
    enabled: !!session_id,
  });

  if (!session_id) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
        <View style={styles.center}>
          <Text style={{ color: theme.error }}>Rapor bulunamadı.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (reportQuery.isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Rapor yükleniyor…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
        <View style={styles.center}>
          <AlertTriangle size={32} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>
            Rapor yüklenemedi.
          </Text>
          <Pressable onPress={() => void reportQuery.refetch()} style={styles.retryBtn}>
            <Text style={{ color: theme.accent, fontFamily: fontSemi() }}>
              Tekrar Dene
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const r = reportQuery.data;
  const score = r.score ?? 0;
  const scoreColor =
    score >= 80 ? theme.success : score >= 60 ? "#EAB308" : theme.error;
  const cr = r.clinical_reasoning;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      {/* Navbar */}
      <View style={[styles.navbar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>
          Vaka Raporu
        </Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.bg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Skor */}
        <View style={[styles.scoreCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor + "55", backgroundColor: scoreColor + "15" }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor, fontFamily: fontBlack() }]}>
              {Math.round(score)}
            </Text>
            <Text style={[styles.scoreLabel, { color: scoreColor, fontFamily: fontSemi() }]}>
              / 100
            </Text>
          </View>
          <Text style={[styles.scoreDesc, { color: theme.textMuted, fontFamily: fontReg() }]}>
            {score >= 80
              ? "Harika bir performans! 🎉"
              : score >= 60
              ? "İyi bir çalışma, geliştirilebilir."
              : "Eksik noktaları gözden geçir."}
          </Text>
        </View>

        {/* Doğru Tanılar */}
        {(r.correct_diagnoses?.length ?? 0) > 0 && (
          <Section title="✅ Doğru Tanılar" theme={theme}>
            <View style={styles.tagRow}>
              {r.correct_diagnoses.map((d, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: theme.success + "22" }]}>
                  <CheckCircle2 size={12} color={theme.success} />
                  <Text style={[styles.tagText, { color: theme.success, fontFamily: fontSemi() }]}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Kaçırılan Tanılar */}
        {(r.missed_diagnoses?.length ?? 0) > 0 && (
          <Section title="⚠️ Kaçırılan Tanılar" defaultOpen theme={theme}>
            <View style={styles.tagRow}>
              {r.missed_diagnoses.map((d, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: theme.error + "22" }]}>
                  <AlertTriangle size={12} color={theme.error} />
                  <Text style={[styles.tagText, { color: theme.error, fontFamily: fontSemi() }]}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Patofizyoloji */}
        {r.pathophysiology_note && (
          <Section title="🧬 Patofizyoloji" defaultOpen={false} theme={theme}>
            <Text style={[styles.noteText, { color: theme.text, fontFamily: fontReg() }]}>
              {r.pathophysiology_note}
            </Text>
          </Section>
        )}

        {/* TUS Referansı */}
        {r.tus_reference && (
          <Section title="📚 TUS Referansı" defaultOpen={false} theme={theme}>
            <Text style={[styles.noteText, { color: theme.text, fontFamily: fontReg() }]}>
              {r.tus_reference}
            </Text>
          </Section>
        )}

        {/* Öneriler */}
        {(r.recommendations?.length ?? 0) > 0 && (
          <Section title="💡 Öneriler" theme={theme}>
            {r.recommendations!.map((rec, i) => (
              <View key={i} style={styles.recRow}>
                <View style={[styles.recDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.recText, { color: theme.text, fontFamily: fontReg() }]}>
                  {rec}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* Klinik Akıl Yürütme */}
        {cr && (
          <Section title="📊 Klinik Akıl Yürütme" defaultOpen={false} theme={theme}>
            <View style={styles.crGrid}>
              <StatBox icon={<MessageSquare size={16} color={theme.accent} />} label="Anamnez" value={cr.anamnez_sayisi} theme={theme} />
              <StatBox icon={<TestTube2 size={16} color={theme.accent} />} label="Tetkik" value={cr.tetkik_sayisi} theme={theme} />
              <StatBox icon={<Stethoscope size={16} color={theme.accent} />} label="Muayene" value={cr.fizik_muayene_sayisi} theme={theme} />
              <StatBox icon={<BookOpen size={16} color={theme.accent} />} label="Konsültasyon" value={cr.konsultasyon_sayisi} theme={theme} />
            </View>
            {cr.anamnez_yorum && (
              <Text style={[styles.crNote, { color: theme.textMuted, fontFamily: fontReg() }]}>
                {cr.anamnez_yorum}
              </Text>
            )}
            {cr.fizik_yorum && (
              <Text style={[styles.crNote, { color: theme.textMuted, fontFamily: fontReg() }]}>
                {cr.fizik_yorum}
              </Text>
            )}
          </Section>
        )}

        {/* Yeni Vaka */}
        <Pressable
          style={[styles.newCaseBtn, { backgroundColor: theme.accent }]}
          onPress={() => router.replace("/(tabs)/simulasyon")}
        >
          <Text style={[styles.newCaseBtnText, { fontFamily: fontBold() }]}>
            Yeni Vaka Başlat
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({
  icon, label, value, theme,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {icon}
      <Text style={[styles.statValue, { color: theme.text, fontFamily: fontBlack() }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.textMuted, fontFamily: fontReg() }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 15 },
  retryBtn: { marginTop: 8, padding: 12 },

  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  navTitle: {
    fontFamily: Platform.select({ ios: "Inter_700Bold", android: "Inter_700Bold", default: "Inter_700Bold" }),
    fontSize: 17,
  },

  scroll: { padding: 16, paddingBottom: 40, gap: 12 },

  scoreCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 2,
  },
  scoreNumber: { fontSize: 40, lineHeight: 48 },
  scoreLabel: { fontSize: 16, alignSelf: "flex-end", paddingBottom: 6 },
  scoreDesc: { fontSize: 14, textAlign: "center" },

  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  sectionTitle: {
    fontFamily: Platform.select({ ios: "Inter_700Bold", android: "Inter_700Bold", default: "Inter_700Bold" }),
    fontSize: 15,
  },
  sectionBody: { paddingHorizontal: 14, paddingBottom: 14 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagText: { fontSize: 13 },

  noteText: { fontSize: 14, lineHeight: 21 },

  recRow: { flexDirection: "row", gap: 10, marginBottom: 8, alignItems: "flex-start" },
  recDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  recText: { flex: 1, fontSize: 14, lineHeight: 20 },

  crGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statBox: {
    flex: 1,
    minWidth: "44%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 24 },
  statLabel: { fontSize: 11 },
  crNote: { fontSize: 13, lineHeight: 19, marginBottom: 6 },

  newCaseBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  newCaseBtnText: { color: "#fff", fontSize: 16 },
});
