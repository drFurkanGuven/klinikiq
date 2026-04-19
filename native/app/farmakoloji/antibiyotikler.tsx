import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, ChevronDown, Shield } from "lucide-react-native";
import { useMemo, useState } from "react";
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
import { Card } from "../../components/ui/Card";
import { antibioticsApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";

function formatClassLabel(raw: string): string {
  let s = raw.trim();
  const lower = s.toLowerCase();
  if (lower.endsWith(" antibiotic")) {
    s = s.slice(0, -" antibiotic".length);
  }
  if (!s) return raw;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

export default function AntibiyotiklerScreen() {
  const theme = useTheme();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const classesQuery = useQuery({
    queryKey: ["antibiotics", "classes"],
    queryFn: async () => (await antibioticsApi.drugClasses()).data.classes ?? [],
  });

  const profileQuery = useQuery({
    queryKey: ["antibiotics", "byClass", selectedClass],
    queryFn: async () =>
      (await antibioticsApi.byDrugClass(selectedClass!)).data,
    enabled: !!selectedClass,
  });

  const sortedClasses = useMemo(
    () => [...(classesQuery.data ?? [])].sort((a, b) => a.localeCompare(b, "tr")),
    [classesQuery.data]
  );

  const profile = profileQuery.data;

  const openDrugbankSearch = () => {
    void Haptics.selectionAsync();
    const q = selectedClass ? formatClassLabel(selectedClass) : "";
    router.push({
      pathname: "/farmakoloji/ilaclar",
      ...(q ? { params: { q } } : {}),
    });
  };

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
        <Text style={[styles.navTitle, { color: theme.text }]}>Antibiyotik rehberi</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.asideTitle, { color: theme.textMuted }]}>
          Antibiyotik sınıfı
        </Text>
        {classesQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : classesQuery.isError ? (
          <Text style={[styles.err, { color: theme.error }]}>
            Sınıf listesi yüklenemedi.
          </Text>
        ) : (
          <View style={styles.chipWrap}>
            {sortedClasses.map((c) => {
              const sel = selectedClass === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setSelectedClass(c);
                    setExpandedIdx(null);
                  }}
                  style={[
                    styles.chip,
                    {
                      borderColor: sel ? theme.accent : theme.border,
                      backgroundColor: sel ? theme.accent + "18" : theme.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipTxt,
                      { color: sel ? theme.accent : theme.text },
                    ]}
                  >
                    {formatClassLabel(c)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <ScrollView
          style={styles.detailScroll}
          contentContainerStyle={styles.detailContent}
          showsVerticalScrollIndicator={false}
        >
          {!selectedClass ? (
            <View style={styles.emptyBox}>
              <Shield size={48} color={theme.textMuted} style={{ opacity: 0.35 }} />
              <Text style={[styles.emptyTxt, { color: theme.textMuted }]}>
                Bir antibiyotik sınıfı seçin
              </Text>
            </View>
          ) : profileQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.accent} />
            </View>
          ) : profileQuery.isError || !profile ? (
            <Text style={[styles.err, { color: theme.error }]}>
              Profil yüklenemedi.
            </Text>
          ) : (
            <>
              <View style={styles.headRow}>
                <Text style={[styles.h2, { color: theme.text }]}>
                  {formatClassLabel(profile.drug_class)}
                </Text>
                <View style={[styles.countPill, { backgroundColor: theme.border + "99" }]}>
                  <Text style={[styles.countTxt, { color: theme.textMuted }]}>
                    {profile.total} kayıt
                  </Text>
                </View>
              </View>

              {profile.resistance_mechanisms.map((g, idx) => {
                const desc = g.entries[0]?.description;
                const open = expandedIdx === idx;
                return (
                  <Card
                    key={`${g.resistance_mechanism}-${idx}`}
                    style={[styles.block, { borderColor: theme.border }]}
                  >
                    <View style={styles.blockHead}>
                      <Text style={[styles.h3, { color: theme.text }]}>
                        {g.resistance_mechanism === "—"
                          ? "Belirtilmemiş"
                          : g.resistance_mechanism}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: theme.accent + "22" }]}>
                        <Text style={[styles.badgeTxt, { color: theme.accent }]}>
                          {g.count}
                        </Text>
                      </View>
                    </View>
                    {g.gene_families.length > 0 ? (
                      <Text style={[styles.geneLine, { color: theme.textMuted }]}>
                        <Text style={{ fontFamily: fontBold(), color: theme.text }}>
                          Gen aileleri:{" "}
                        </Text>
                        {g.gene_families.join(", ")}
                      </Text>
                    ) : null}

                    {g.entries.map((e, ri) => (
                      <View
                        key={`${e.aro_accession ?? "x"}-${e.antibiotic_name}-${ri}`}
                        style={[
                          styles.entryRow,
                          ri > 0 && {
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderTopColor: theme.border,
                          },
                        ]}
                      >
                        <Text style={[styles.mono, { color: theme.textMuted }]}>
                          {e.aro_accession ?? "—"}
                        </Text>
                        <Text style={[styles.entryName, { color: theme.text }]}>
                          {e.antibiotic_name}
                        </Text>
                        <Text style={[styles.small, { color: theme.textMuted }]}>
                          {e.organism ?? "—"}
                        </Text>
                        <Text style={[styles.small, { color: theme.textMuted }]}>
                          {e.amr_gene_family ?? "—"}
                        </Text>
                      </View>
                    ))}

                    {desc ? (
                      <Pressable
                        onPress={() =>
                          setExpandedIdx(open ? null : idx)
                        }
                        style={styles.expandBtn}
                      >
                        <Text style={[styles.expandLbl, { color: theme.accent }]}>
                          Mekanizma açıklaması
                        </Text>
                        <ChevronDown
                          size={18}
                          color={theme.accent}
                          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
                        />
                      </Pressable>
                    ) : null}
                    {open && desc ? (
                      <Text style={[styles.desc, { color: theme.textMuted }]}>
                        {desc}
                      </Text>
                    ) : null}
                  </Card>
                );
              })}

              <Pressable onPress={openDrugbankSearch} style={styles.linkBtn}>
                <Text style={[styles.linkTxt, { color: theme.accent }]}>
                  İlaç rehberinde bu sınıfa göre ara →
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
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
  body: { flex: 1, paddingHorizontal: 16 },
  asideTitle: {
    fontFamily: fontBold(),
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 10,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipTxt: { fontFamily: fontSemi(), fontSize: 13 },
  detailScroll: { flex: 1 },
  detailContent: { paddingBottom: 40 },
  center: { paddingVertical: 24, alignItems: "center" },
  err: { fontFamily: fontReg(), fontSize: 14, marginVertical: 8 },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTxt: { fontFamily: fontSemi(), fontSize: 14 },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  h2: { fontFamily: fontBold(), fontSize: 22 },
  countPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countTxt: { fontFamily: fontSemi(), fontSize: 12 },
  block: {
    marginBottom: 14,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  blockHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  h3: { fontFamily: fontBold(), fontSize: 16, flex: 1, paddingRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeTxt: { fontFamily: fontBold(), fontSize: 11 },
  geneLine: { fontFamily: fontReg(), fontSize: 12, marginBottom: 10, lineHeight: 18 },
  entryRow: { paddingVertical: 10, gap: 4 },
  mono: { fontFamily: fontReg(), fontSize: 11 },
  entryName: { fontFamily: fontSemi(), fontSize: 14 },
  small: { fontFamily: fontReg(), fontSize: 12 },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.3)",
  },
  expandLbl: { fontFamily: fontBold(), fontSize: 14 },
  desc: {
    fontFamily: fontReg(),
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  linkBtn: { marginTop: 8, paddingVertical: 12 },
  linkTxt: { fontFamily: fontSemi(), fontSize: 14 },
});
