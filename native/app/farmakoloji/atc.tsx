import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { drugsApi } from "../../lib/api";
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

export default function AtcScreen() {
  const theme = useTheme();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["drugs", "atc-tree"],
    queryFn: async () => (await drugsApi.atcTree()).data,
  });

  const categories = data?.categories ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={styles.nav}>
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            router.back();
          }}
          style={styles.navBtn}
        >
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>ATC Sınıfları</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : isError ? (
        <Text style={[styles.err, { color: theme.error }]}>Liste yüklenemedi.</Text>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Haptics.selectionAsync();
                router.push({
                  pathname: "/farmakoloji/atc-liste",
                  params: { category: item },
                });
              }}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: theme.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.rowText, { color: theme.text }]} numberOfLines={2}>
                {item}
              </Text>
              <ChevronRight size={20} color={theme.textMuted} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
    minHeight: 44,
  },
  navBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontFamily: fontBold(),
    fontSize: 17,
    flex: 1,
    textAlign: "center",
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  rowText: {
    fontFamily: fontReg(),
    fontSize: 16,
    flex: 1,
    paddingRight: 12,
  },
  center: {
    paddingVertical: 48,
    alignItems: "center",
  },
  err: {
    fontFamily: fontReg(),
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
});
