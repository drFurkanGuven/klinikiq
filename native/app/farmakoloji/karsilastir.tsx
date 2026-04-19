import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "../../components/ui/Card";
import { drugsApi, type DrugDetail, type DrugSummary } from "../../lib/api";
import { useTheme } from "../../lib/theme";

const MAX_DRUGS = 4;

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

function Field({
  label,
  value,
  theme,
  first,
}: {
  label: string;
  value: string | null;
  theme: ReturnType<typeof useTheme>;
  first?: boolean;
}) {
  const t = value?.trim();
  return (
    <View
      style={[
        styles.field,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
      ]}
    >
      <Text style={[styles.fieldLbl, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.fieldVal, { color: theme.text }]}>
        {t ? t : "—"}
      </Text>
    </View>
  );
}

export default function KarsilastirScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchResults, setSearchResults] = useState<DrugSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [selected, setSelected] = useState<DrugSummary[]>([]);
  const [maxWarn, setMaxWarn] = useState(false);

  const [compareData, setCompareData] = useState<DrugDetail[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearchLoading(true);
      try {
        const res = await drugsApi.search(debouncedQ, 1, 10);
        if (!cancelled) setSearchResults(res.data.results ?? []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  const addDrug = (item: DrugSummary) => {
    setMaxWarn(false);
    if (selected.some((s) => s.drugbank_id === item.drugbank_id)) {
      setDropdownOpen(false);
      setSearchQuery("");
      return;
    }
    if (selected.length >= MAX_DRUGS) {
      setMaxWarn(true);
      return;
    }
    void Haptics.selectionAsync();
    setSelected((prev) => [...prev, item]);
    setDropdownOpen(false);
    setSearchQuery("");
    setCompareData([]);
    setCompareError(null);
  };

  const removeDrug = (id: string) => {
    void Haptics.selectionAsync();
    setSelected((prev) => prev.filter((s) => s.drugbank_id !== id));
    setCompareData([]);
    setCompareError(null);
  };

  const runCompare = useCallback(async () => {
    if (selected.length < 2) return;
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await drugsApi.compare(selected.map((s) => s.drugbank_id));
      setCompareData(res.data.drugs ?? []);
    } catch {
      setCompareError("Karşılaştırma yüklenemedi.");
      setCompareData([]);
    } finally {
      setCompareLoading(false);
    }
  }, [selected]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={[styles.nav, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            router.back();
          }}
          style={styles.navBtn}
        >
          <ArrowLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.navTitle, { color: theme.text }]}>İlaç karşılaştırma</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.lbl, { color: theme.textMuted }]}>
          İlaç ara ve seç (2–4)
        </Text>
        <View style={styles.searchWrap}>
          <TextInput
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => {
              setTimeout(() => setDropdownOpen(false), 200);
            }}
            placeholder="En az 2 karakter…"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          />
          {dropdownOpen && searchQuery.trim().length >= 2 ? (
            <Card style={[styles.dropdown, { borderColor: theme.border }]}>
              {searchLoading ? (
                <ActivityIndicator color={theme.accent} style={{ padding: 12 }} />
              ) : searchResults.length === 0 ? (
                <Text style={[styles.ddEmpty, { color: theme.textMuted }]}>
                  Sonuç yok
                </Text>
              ) : (
                searchResults.map((item) => (
                  <Pressable
                    key={item.drugbank_id}
                    onPress={() => addDrug(item)}
                    style={({ pressed }) => [
                      styles.ddRow,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Text style={[styles.ddName, { color: theme.text }]}>
                      {item.name}
                    </Text>
                    {item.drug_type ? (
                      <Text style={[styles.ddMeta, { color: theme.textMuted }]}>
                        {item.drug_type}
                      </Text>
                    ) : null}
                  </Pressable>
                ))
              )}
            </Card>
          ) : null}
        </View>

        {maxWarn ? (
          <Text style={[styles.warn, { color: theme.error }]}>
            En fazla {MAX_DRUGS} ilaç seçebilirsin.
          </Text>
        ) : null}

        {selected.length > 0 ? (
          <View style={styles.selectedRow}>
            {selected.map((s) => (
              <View
                key={s.drugbank_id}
                style={[styles.pill, { borderColor: theme.accent }]}
              >
                <Text
                  style={[styles.pillTxt, { color: theme.accent }]}
                  numberOfLines={1}
                >
                  {s.name}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => removeDrug(s.drugbank_id)}
                >
                  <X size={16} color={theme.accent} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={() => void runCompare()}
          disabled={selected.length < 2 || compareLoading}
          style={[
            styles.compareBtn,
            {
              backgroundColor: theme.accent,
              opacity: selected.length < 2 || compareLoading ? 0.45 : 1,
            },
          ]}
        >
          {compareLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.compareBtnTxt}>Karşılaştır</Text>
          )}
        </Pressable>

        {compareError ? (
          <Text style={[styles.err, { color: theme.error }]}>{compareError}</Text>
        ) : null}

        {compareData.length > 0 ? (
          <View style={styles.compareList}>
            {compareData.map((d) => (
              <Card
                key={d.drugbank_id}
                style={[styles.drugCard, { borderColor: theme.border }]}
              >
                <Text style={[styles.drugTitle, { color: theme.accent }]}>
                  {d.name}
                </Text>
                <Field first label="Tür" value={d.drug_type} theme={theme} />
                <Field label="Durum" value={d.groups} theme={theme} />
                <Field label="ATC" value={d.atc_codes} theme={theme} />
                <Field label="Endikasyon" value={d.indication} theme={theme} />
                <Field label="Mekanizma" value={d.mechanism} theme={theme} />
                <Field label="Toksisite" value={d.toxicity} theme={theme} />
                <Field label="Yarı ömür" value={d.half_life} theme={theme} />
                <Field label="Protein bağlanması" value={d.protein_binding} theme={theme} />
                <Field label="Metabolizma" value={d.metabolism} theme={theme} />
                <Field label="Emilim" value={d.absorption} theme={theme} />
                <Field label="Dağılım hacmi" value={d.volume_of_distribution} theme={theme} />
                <Field label="Eliminasyon" value={d.route_of_elimination} theme={theme} />
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  navTitle: { fontFamily: fontBold(), fontSize: 17 },
  scroll: { padding: 16, paddingBottom: 48 },
  lbl: {
    fontFamily: fontBold(),
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  searchWrap: { marginBottom: 12, zIndex: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontReg(),
    fontSize: 16,
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 220,
  },
  ddRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.25)",
  },
  ddName: { fontFamily: fontSemi(), fontSize: 15 },
  ddMeta: { fontFamily: fontReg(), fontSize: 12, marginTop: 4 },
  ddEmpty: { padding: 14, fontFamily: fontReg(), fontSize: 14 },
  warn: { fontFamily: fontReg(), fontSize: 13, marginBottom: 8 },
  selectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  pillTxt: { fontFamily: fontSemi(), fontSize: 13, flexShrink: 1 },
  compareBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  compareBtnTxt: { color: "#fff", fontFamily: fontBold(), fontSize: 16 },
  err: { fontFamily: fontReg(), fontSize: 14, marginBottom: 8 },
  compareList: { gap: 14 },
  drugCard: { padding: 14, borderWidth: 1, borderRadius: 14 },
  drugTitle: { fontFamily: fontBold(), fontSize: 17, marginBottom: 8 },
  field: {
    paddingTop: 10,
    marginTop: 10,
  },
  fieldLbl: {
    fontFamily: fontBold(),
    fontSize: 11,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  fieldVal: { fontFamily: fontReg(), fontSize: 14, lineHeight: 21 },
});
