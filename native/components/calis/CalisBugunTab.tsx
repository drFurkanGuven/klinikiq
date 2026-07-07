import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  Zap,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SegmentedControl } from "../ui/SegmentedControl";
import { studyApi } from "../../lib/api";
import { useTheme } from "../../lib/theme";

const GOALS = [5, 10, 20] as const;

function fontSemi() {
  return Platform.select({
    ios: "Inter_600SemiBold",
    android: "Inter_600SemiBold",
    default: "Inter_600SemiBold",
  });
}

function fontReg() {
  return Platform.select({
    ios: "Inter_400Regular",
    android: "Inter_400Regular",
    default: "Inter_400Regular",
  });
}

export function CalisBugunTab() {
  const theme = useTheme();
  const [goal, setGoal] = useState<5 | 10 | 20>(10);
  const [savingGoal, setSavingGoal] = useState(false);

  const dashQuery = useQuery({
    queryKey: ["study", "dashboard"],
    queryFn: async () => (await studyApi.dashboard()).data,
  });

  const dash = dashQuery.data;

  useEffect(() => {
    if (dash?.daily_goal === 5 || dash?.daily_goal === 10 || dash?.daily_goal === 20) {
      setGoal(dash.daily_goal);
    }
  }, [dash?.daily_goal]);

  const saveGoal = useCallback(async (g: 5 | 10 | 20) => {
    setGoal(g);
    setSavingGoal(true);
    try {
      await studyApi.patchSettings(g);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* ignore */
    } finally {
      setSavingGoal(false);
    }
  }, []);

  const startDaily = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/calis/oturum", params: { goal: String(goal) } });
  };

  if (dashQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.foreground} size="large" />
      </View>
    );
  }

  if (dashQuery.isError) {
    return (
      <Card style={[styles.errorCard, { borderColor: theme.destructive }]}>
        <AlertCircle size={18} color={theme.destructive} />
        <Text style={[styles.errorText, { color: theme.destructive }]}>
          Çalışma verileri yüklenemedi.
        </Text>
      </Card>
    );
  }

  if (!dash) return null;

  const activeGoal = goal;

  return (
    <View style={styles.wrap}>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Flame size={18} color={theme.foreground} />
          <Text style={[styles.statVal, { color: theme.text }]}>
            {dash.current_streak}
          </Text>
          <Text style={[styles.statLbl, { color: theme.textMuted }]}>
            Gün serisi
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Clock size={18} color={theme.foreground} />
          <Text style={[styles.statVal, { color: theme.text }]}>
            {dash.due_count}
          </Text>
          <Text style={[styles.statLbl, { color: theme.textMuted }]}>
            Tekrar due
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statVal, { color: theme.text }]}>
            {dash.answered_today}/{dash.daily_goal}
          </Text>
          <Text style={[styles.statLbl, { color: theme.textMuted }]}>
            Bugün
          </Text>
        </Card>
      </View>

      <Text style={[styles.sectionLbl, { color: theme.textMuted }]}>
        Günlük hedef
      </Text>
      <SegmentedControl
        tabs={GOALS.map((g) => ({ id: String(g), label: `${g} soru` }))}
        active={String(activeGoal)}
        onChange={(id) => {
          const g = Number(id) as 5 | 10 | 20;
          if (!savingGoal) void saveGoal(g);
        }}
      />

      <Button
        label="Oturumu başlat"
        size="lg"
        onPress={startDaily}
        loading={savingGoal}
      />

      <View style={[styles.divider, { borderColor: theme.border }]} />
      <Text style={[styles.sectionLbl, { color: theme.textMuted }]}>
        İkincil modlar
      </Text>

      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          router.push({ pathname: "/calis/oturum", params: { mode: "acil" } });
        }}
        style={({ pressed }) => [pressed && { opacity: 0.88 }]}
      >
        <Card style={styles.linkCard}>
          <View style={styles.linkRow}>
            <Zap size={16} color={theme.foreground} />
            <Text style={[styles.linkTitle, { color: theme.text }]}>
              Acil simülasyon
            </Text>
            <ChevronRight size={16} color={theme.textMuted} style={{ opacity: 0.4 }} />
          </View>
          <Text style={[styles.linkDesc, { color: theme.textMuted }]}>
            Zamanlayıcı + AI geri bildirim
          </Text>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          router.push({ pathname: "/calis/oturum", params: { mode: "usmle" } });
        }}
        style={({ pressed }) => [pressed && { opacity: 0.88 }]}
      >
        <Card style={styles.linkCard}>
          <View style={styles.linkRow}>
            <GraduationCap size={16} color={theme.foreground} />
            <Text style={[styles.linkTitle, { color: theme.text }]}>
              USMLE havuzu
            </Text>
            <ChevronRight size={16} color={theme.textMuted} style={{ opacity: 0.4 }} />
          </View>
          <Text style={[styles.linkDesc, { color: theme.textMuted }]}>
            İngilizce soru pratiği
          </Text>
        </Card>
      </Pressable>

      <Text style={[styles.footer, { color: theme.textMuted }]}>
        Havuz: {dash.pool_mcq_count.toLocaleString("tr-TR")} TR acil sorusu
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  center: { paddingVertical: 48, alignItems: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 4,
  },
  statVal: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 22,
    marginTop: 2,
  },
  statLbl: {
    fontFamily: fontReg(),
    fontSize: 10,
    fontWeight: "500",
  },
  sectionLbl: {
    fontFamily: fontSemi(),
    fontSize: 12,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    paddingTop: 16,
  },
  linkCard: { gap: 4 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkTitle: {
    flex: 1,
    fontFamily: fontSemi(),
    fontSize: 14,
  },
  linkDesc: {
    fontFamily: fontReg(),
    fontSize: 12,
    marginLeft: 26,
  },
  footer: {
    fontFamily: fontReg(),
    fontSize: 12,
    textAlign: "center",
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  errorText: {
    fontFamily: fontReg(),
    fontSize: 14,
    flex: 1,
  },
});
