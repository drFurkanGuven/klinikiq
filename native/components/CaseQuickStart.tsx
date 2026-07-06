import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Dices, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card } from "./ui/Card";
import {
  CASE_DIFFICULTIES,
  CASE_SPECIALTIES,
  loadCaseRandomPrefs,
  saveCaseRandomPrefs,
  type CaseRandomPrefs,
} from "../lib/case-random";
import { casesApi, sessionsApi } from "../lib/api";
import { useTheme } from "../lib/theme";

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

type Props = {
  /** Üst başlık (ör. Ana sayfa vs vaka listesi) */
  title?: string;
};

export function CaseQuickStart({ title = "Çözülmemiş vaka" }: Props) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<CaseRandomPrefs>({
    specialtyValues: [],
    difficulty: "",
  });
  const [prefsReady, setPrefsReady] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [suggestion, setSuggestion] = useState<{
    label: string;
    apply: () => void;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const p = await loadCaseRandomPrefs();
      if (!cancelled) {
        setPrefs(p);
        setPrefsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: CaseRandomPrefs) => {
    setPrefs(next);
    await saveCaseRandomPrefs(next);
  }, []);

  const selectAllBranches = () => {
    void Haptics.selectionAsync();
    void persist({ ...prefs, specialtyValues: [] });
  };

  const toggleSpec = (value: string) => {
    void Haptics.selectionAsync();
    const set = new Set(prefs.specialtyValues);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    void persist({ ...prefs, specialtyValues: [...set] });
  };

  const setDifficulty = (value: string) => {
    void Haptics.selectionAsync();
    void persist({ ...prefs, difficulty: value });
  };

  const afterStart = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["users", "history"] });
  }, [queryClient]);

  const buildSuggestion = useCallback(
    (status: number) => {
      if (status !== 404) return;
      const diffOrder = ["", "easy", "medium", "hard"];
      const idx = diffOrder.indexOf(prefs.difficulty);
      if (idx > 1) {
        const lower = diffOrder[idx - 1]!;
        const label =
          CASE_DIFFICULTIES.find((d) => d.value === lower)?.label ?? lower;
        setSuggestion({
          label: `Zorluğu "${label}" yaparak dene`,
          apply: () => {
            setSuggestion(null);
            void persist({ ...prefs, difficulty: lower });
          },
        });
        return;
      }
      if (prefs.specialtyValues.length > 0) {
        setSuggestion({
          label: "Tüm branşlara genişlet",
          apply: () => {
            setSuggestion(null);
            void persist({ ...prefs, specialtyValues: [] });
          },
        });
        return;
      }
      setSuggestion({
        label: "Tüm filtreleri temizle",
        apply: () => {
          setSuggestion(null);
          void persist({ specialtyValues: [], difficulty: "" });
        },
      });
    },
    [prefs, persist]
  );

  const startRandom = async () => {
    if (randomLoading) return;
    setErrorMsg("");
    setSuggestion(null);
    setRandomLoading(true);
    try {
      const specsParam =
        prefs.specialtyValues.length > 0
          ? prefs.specialtyValues.join(",")
          : undefined;
      const randomRes = await casesApi.getRandom({
        specialties: specsParam,
        difficulty: prefs.difficulty || undefined,
      });
      const sessionRes = await sessionsApi.create(randomRes.data.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      afterStart();
      router.push({
        pathname: "/simulasyon/vaka",
        params: { session_id: sessionRes.data.id },
      });
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>;
      const status = err.response?.status;
      if (status === 404) {
        setErrorMsg("Bu kriterlerde çözülmemiş yeni vaka bulunamadı.");
        buildSuggestion(404);
      } else if (status === 403) {
        setErrorMsg(
          String(err.response?.data?.detail ?? "Günlük limitinize ulaştınız.")
        );
      } else {
        setErrorMsg("Vaka başlatılırken bir hata oluştu.");
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setRandomLoading(false);
    }
  };

  const startRecommended = async () => {
    if (recLoading) return;
    setErrorMsg("");
    setSuggestion(null);
    setRecLoading(true);
    try {
      const caseRes = await casesApi.getRecommended();
      const sessionRes = await sessionsApi.create(caseRes.data.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      afterStart();
      router.push({
        pathname: "/simulasyon/vaka",
        params: { session_id: sessionRes.data.id },
      });
    } catch (e) {
      const err = e as AxiosError<{ detail?: string }>;
      const status = err.response?.status;
      if (status === 404) {
        setErrorMsg("Önerilebilecek yeni vaka kalmadı.");
      } else if (status === 403) {
        setErrorMsg(
          String(err.response?.data?.detail ?? "Günlük limitinize ulaştınız.")
        );
      } else {
        setErrorMsg("Vaka başlatılırken bir hata oluştu.");
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } finally {
      setRecLoading(false);
    }
  };

  if (!prefsReady) {
    return (
      <Card style={[styles.wrap, { borderColor: theme.border }]}>
        <ActivityIndicator color={theme.accent} />
      </Card>
    );
  }

  return (
    <Card style={[styles.wrap, { borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
        {title}
      </Text>
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        Sunucu, daha önce tamamlamadığın vakalardan seçer; tekrar çözmek için
        geçmişten aç.
      </Text>

      <Text style={[styles.lbl, { color: theme.textMuted }]}>Branş</Text>
      <View style={styles.specGrid}>
        <Pressable
          onPress={selectAllBranches}
          style={[
            styles.chip,
            {
              borderColor:
                prefs.specialtyValues.length === 0 ? theme.accent : theme.border,
              backgroundColor:
                prefs.specialtyValues.length === 0
                  ? theme.accent + "22"
                  : theme.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.chipTxt,
              {
                color:
                  prefs.specialtyValues.length === 0
                    ? theme.accent
                    : theme.text,
              },
            ]}
          >
            Tümü
          </Text>
        </Pressable>
        {CASE_SPECIALTIES.map((s) => {
          const on = prefs.specialtyValues.includes(s.value);
          return (
            <Pressable
              key={s.value}
              onPress={() => toggleSpec(s.value)}
              style={[
                styles.chip,
                {
                  borderColor: on ? theme.accent : theme.border,
                  backgroundColor: on ? theme.accent + "22" : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipTxt,
                  { color: on ? theme.accent : theme.text },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.lbl, { color: theme.textMuted }]}>Zorluk</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.diffRow}
      >
        {CASE_DIFFICULTIES.map((d) => {
          const on = prefs.difficulty === d.value;
          return (
            <Pressable
              key={d.value || "all"}
              onPress={() => setDifficulty(d.value)}
              style={[
                styles.diffChip,
                {
                  borderColor: on ? theme.accent : theme.border,
                  backgroundColor: on ? theme.accent : theme.surface,
                },
              ]}
            >
              <Text
                style={[
                  styles.diffChipTxt,
                  { color: on ? "#fff" : theme.text },
                ]}
              >
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={() => void startRandom()}
          disabled={randomLoading}
          style={[
            styles.btnPrimary,
            { backgroundColor: theme.accent, opacity: randomLoading ? 0.7 : 1 },
          ]}
        >
          {randomLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Dices size={18} color="#fff" />
              <Text style={styles.btnPrimaryTxt}>Rastgele başlat</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={() => void startRecommended()}
          disabled={recLoading}
          style={[
            styles.btnSecondary,
            {
              borderColor: theme.accent,
              opacity: recLoading ? 0.7 : 1,
            },
          ]}
        >
          {recLoading ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <>
              <Sparkles size={18} color={theme.accent} />
              <Text style={[styles.btnSecondaryTxt, { color: theme.accent }]}>
                Sana özel öner
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {errorMsg ? (
        <Text style={[styles.err, { color: theme.error }]}>{errorMsg}</Text>
      ) : null}
      {suggestion ? (
        <Pressable onPress={() => suggestion.apply()} style={[styles.sugg, { borderColor: theme.border }]}>
          <Text style={[styles.suggTxt, { color: theme.accent }]}>
            {suggestion.label}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fontSemi(),
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  hint: {
    fontFamily: fontReg(),
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  lbl: {
    fontFamily: fontSemi(),
    fontSize: 11,
    marginTop: 6,
  },
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipTxt: {
    fontFamily: fontSemi(),
    fontSize: 12,
  },
  diffRow: {
    gap: 8,
    paddingVertical: 4,
  },
  diffChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  diffChipTxt: {
    fontFamily: fontSemi(),
    fontSize: 13,
  },
  actions: {
    gap: 10,
    marginTop: 10,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnPrimaryTxt: {
    color: "#fff",
    fontFamily: fontBold(),
    fontSize: 15,
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  btnSecondaryTxt: {
    fontFamily: fontBold(),
    fontSize: 15,
  },
  err: {
    fontFamily: fontReg(),
    fontSize: 13,
    marginTop: 4,
  },
  sugg: {
    marginTop: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  suggTxt: {
    fontFamily: fontSemi(),
    fontSize: 13,
    textAlign: "center",
  },
});
