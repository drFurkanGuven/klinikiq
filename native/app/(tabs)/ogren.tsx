import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  Brain,
  ChevronRight,
  GraduationCap,
  Microscope,
  PenLine,
  Pill,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
import { useTheme } from "../../lib/theme";

type LinkItem = {
  label: string;
  desc: string;
  icon: ReactNode;
  onPress: () => void;
};

export default function OgrenTab() {
  const theme = useTheme();

  const openWeb = (path: string) => {
    void Haptics.selectionAsync();
    router.push({ pathname: "/web", params: { path } });
  };

  const openNative = (href: string) => {
    void Haptics.selectionAsync();
    router.push(href as `/ogren/${string}`);
  };

  const links: LinkItem[] = [
    {
      label: "Vaka özetleri",
      desc: "Havuzdaki vaka özetleri",
      icon: <Sparkles size={16} color={theme.foreground} />,
      onPress: () => openWeb("/ogrenme"),
    },
    {
      label: "Kişisel özetler",
      desc: "Kendi notların",
      icon: <PenLine size={16} color={theme.foreground} />,
      onPress: () => openWeb("/study-notes"),
    },
    {
      label: "Histoloji",
      desc: "Mikroskop slaytları",
      icon: <Microscope size={16} color={theme.foreground} />,
      onPress: () => openNative("/ogren/histoloji"),
    },
    {
      label: "Nöro lezyon atlası",
      desc: "Lezyon haritaları",
      icon: <Brain size={16} color={theme.foreground} />,
      onPress: () => openWeb("/sinir-lezyon"),
    },
    {
      label: "Farmakoloji",
      desc: "İlaç haritaları, yolak egzersizi ve quiz",
      icon: <Pill size={16} color={theme.foreground} />,
      onPress: () => {
        void Haptics.selectionAsync();
        router.push("/farmakoloji");
      },
    },
    {
      label: "Sıralama",
      desc: "Liderlik tablosu",
      icon: <Trophy size={16} color={theme.foreground} />,
      onPress: () => {
        void Haptics.selectionAsync();
        router.push("/leaderboard");
      },
    },
    {
      label: "Öğrenme kartları",
      desc: "Tamamladığın vakalardan patofizyoloji notları",
      icon: <GraduationCap size={16} color={theme.foreground} />,
      onPress: () => openNative("/ogren/learning"),
    },
    {
      label: "Soru bankası",
      desc: "Branş bazlı alıştırma soruları",
      icon: <GraduationCap size={16} color={theme.foreground} />,
      onPress: () => openNative("/ogren/sorular"),
    },
    {
      label: "USMLE (gelişmiş)",
      desc: "İngilizce soru havuzu",
      icon: <GraduationCap size={16} color={theme.foreground} />,
      onPress: () =>
        router.push({ pathname: "/calis/oturum", params: { mode: "usmle" } }),
    },
    {
      label: "Acil MCQ",
      desc: "Zaman baskılı acil modu",
      icon: <Zap size={16} color={theme.foreground} />,
      onPress: () => {
        void Haptics.selectionAsync();
        router.navigate("/(tabs)/acil");
      },
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.title, { color: theme.text }]}>Öğren</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Histoloji, farmako, atlas ve daha fazlası
          </Text>
        </View>

        <Text style={[styles.sectionLbl, { color: theme.textMuted }]}>
          Öğren ve pratik
        </Text>

        {links.map((item) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [pressed && { opacity: 0.88 }]}
          >
            <Card style={styles.linkCard}>
              <View style={styles.linkRow}>
                {item.icon}
                <View style={styles.linkMeta}>
                  <Text style={[styles.linkTitle, { color: theme.text }]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.linkDesc, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {item.desc}
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.textMuted} style={{ opacity: 0.4 }} />
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  hero: { paddingTop: 8, paddingBottom: 16, gap: 4 },
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
  sectionLbl: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 12,
    marginBottom: 8,
  },
  linkCard: { marginBottom: 8, paddingVertical: 14 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkMeta: { flex: 1, minWidth: 0 },
  linkTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
  },
  linkDesc: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 12,
    marginTop: 2,
  },
});
