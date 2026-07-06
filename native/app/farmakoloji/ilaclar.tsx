import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { drugsApi, type DrugSearchResponse, type DrugSummary } from "../../lib/api";
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

function fontSemi() {
  return Platform.select({
    ios: "Inter_600SemiBold",
    android: "Inter_600SemiBold",
    default: "Inter_600SemiBold",
  });
}

const LIMIT = 20;

export default function IlaclarScreen() {
  const theme = useTheme();
  const { q: qParam } = useLocalSearchParams<{ q?: string }>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DrugSummary[]>([]);
  const lastPageRef = useRef(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(
    async (q: string, nextPage: number, append: boolean) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setTotal(0);
        lastPageRef.current = 0;
        setSearched(false);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        lastPageRef.current = 0;
      }

      try {
        const res = await drugsApi.search(trimmed, nextPage, LIMIT);
        const data = res.data as DrugSearchResponse;
        setTotal(data.total);
        lastPageRef.current = data.page;
        if (append) {
          setResults((prev) => [...prev, ...data.results]);
        } else {
          setResults(data.results);
        }
        setSearched(true);
      } catch {
        if (!append) {
          setResults([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    const q = typeof qParam === "string" ? qParam.trim() : "";
    if (!q) return;
    setQuery(q);
    void runSearch(q, 1, false);
  }, [qParam, runSearch]);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void runSearch(text, 1, false);
    }, 500);
  };

  const onEndReached = () => {
    const trimmed = query.trim();
    if (!trimmed || loading || loadingMore) return;
    if (total === 0 || results.length === 0) return;
    if (results.length >= total) return;
    const next = lastPageRef.current + 1;
    void runSearch(trimmed, next, true);
  };

  const indicationPreview = (ind: string | null) => {
    if (!ind) return "";
    const t = ind.trim();
    if (t.length <= 60) return t;
    return `${t.slice(0, 60)}…`;
  };

  const groupBadges = (groups: string | null) => {
    if (!groups) return [];
    return groups
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
  };

  const renderItem = ({ item }: { item: DrugSummary }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        void Haptics.selectionAsync();
        router.push({
          pathname: "/farmakoloji/ilac",
          params: { id: item.drugbank_id },
        });
      }}
      style={({ pressed }) => [styles.rowPress, pressed && { opacity: 0.9 }]}
    >
      <Card style={styles.rowCard}>
        <Text style={[styles.drugName, { color: theme.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.badgeRow}>
          {item.drug_type ? (
            <Badge label={item.drug_type} color="accent" />
          ) : null}
          {groupBadges(item.groups).map((g) => (
            <Badge key={g} label={g} color="muted" />
          ))}
        </View>
        {item.indication ? (
          <Text style={[styles.indPreview, { color: theme.textMuted }]}>
            {indicationPreview(item.indication)}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );

  const showPlaceholder = !query.trim() && !searched;

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
        <Text style={[styles.navTitle, { color: theme.text }]}>İlaç Rehberi</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchWrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <TextInput
          value={query}
          onChangeText={onChangeText}
          placeholder="İlaç adı veya etken madde…"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : showPlaceholder ? (
        <Card style={styles.placeholder}>
          <Text style={[styles.placeholderText, { color: theme.textMuted }]}>
            İlaç adı veya etken madde girin
          </Text>
        </Card>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.drugbank_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            searched && query.trim() ? (
              <Text style={[styles.empty, { color: theme.textMuted }]}>
                Sonuç bulunamadı.
              </Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={theme.accent} />
              </View>
            ) : null
          }
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
  searchWrap: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  input: {
    fontFamily: fontReg(),
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  rowPress: {
    marginBottom: 10,
  },
  rowCard: {
    paddingVertical: 12,
  },
  drugName: {
    fontFamily: fontBold(),
    fontSize: 16,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  indPreview: {
    fontFamily: fontReg(),
    fontSize: 13,
    lineHeight: 18,
  },
  center: {
    paddingVertical: 40,
    alignItems: "center",
  },
  placeholder: {
    marginHorizontal: 16,
    paddingVertical: 24,
    alignItems: "center",
  },
  placeholderText: {
    fontFamily: fontSemi(),
    fontSize: 15,
    textAlign: "center",
  },
  empty: {
    fontFamily: fontReg(),
    fontSize: 15,
    textAlign: "center",
    marginTop: 24,
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
