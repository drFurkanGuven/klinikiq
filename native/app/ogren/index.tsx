import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, BookOpen, Brain, HelpCircle, Microscope } from "lucide-react-native";
import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
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

export default function OgrenHubScreen() {
  const theme = useTheme();

  const row = (
    title: string,
    desc: string,
    icon: ReactNode,
    href: string
  ) => (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        router.push(href as `/ogren/${string}`);
      }}
      style={({ pressed }) => [pressed && { opacity: 0.9 }]}
    >
      <Card style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: theme.accent + "22" }]}>
            {icon}
          </View>
          <View style={styles.meta}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.cardDesc, { color: theme.textMuted }]}>{desc}</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>Öğren</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: theme.textMuted }]}>
          Geçmiş vaka özetleri, soru bankası ve tekrar araçları.
        </Text>
        {row(
          "Öğrenme kartları",
          "Tamamladığın vakalardan patofizyoloji ve TUS notları",
          <BookOpen size={22} color={theme.accent} />,
          "/ogren/learning"
        )}
        {row(
          "Histoloji",
          "Mikroskop görüntüleri ve preparat listesi",
          <Microscope size={22} color={theme.accent} />,
          "/ogren/histoloji"
        )}
        {row(
          "Soru bankası",
          "Branş bazlı alıştırma soruları",
          <HelpCircle size={22} color={theme.accent} />,
          "/ogren/sorular"
        )}
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            router.push("/(tabs)/acil");
          }}
        >
          <Card style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: theme.accent + "22" }]}>
                <Brain size={22} color={theme.accent} />
              </View>
              <View style={styles.meta}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Acil Tıp MCQ
                </Text>
                <Text style={[styles.cardDesc, { color: theme.textMuted }]}>
                  MedQA tarzı acil sorular (Acil sekmesi)
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>
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
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 17, fontFamily: fontBold() },
  scroll: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 14, fontFamily: fontReg(), marginBottom: 16 },
  card: { marginBottom: 12, borderWidth: 1, borderRadius: 16, padding: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: fontBold() },
  cardDesc: { fontSize: 13, fontFamily: fontReg(), marginTop: 4 },
});
