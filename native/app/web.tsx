import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebAppScreen } from "../components/WebAppScreen";
import { useTheme } from "../lib/theme";

function titleFromPath(path: string): string {
  if (path.includes("farmakoloji")) return "Farmakoloji";
  if (path.includes("study-notes")) return "Kişisel özetler";
  if (path.includes("ogrenme")) return "Vaka özetleri";
  if (path.includes("sinir-lezyon")) return "Nöro atlas";
  if (path.includes("delete-account")) return "Hesap silme";
  if (path.includes("terms")) return "Kullanım koşulları";
  if (path.includes("destek")) return "Destek";
  return "KlinikIQ";
}

export default function WebScreen() {
  const theme = useTheme();
  const { path } = useLocalSearchParams<{ path?: string }>();
  const webPath = typeof path === "string" && path.length > 0 ? path : "/calis";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Geri"
        >
          <ArrowLeft size={22} color={theme.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {titleFromPath(webPath)}
        </Text>
        <View style={styles.back} />
      </View>
      <WebAppScreen path={webPath} />
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
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 16,
  },
});
