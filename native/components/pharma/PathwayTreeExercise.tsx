import * as Haptics from "expo-haptics";
import { GitBranch, MapPin } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PharmaMap } from "../../lib/api";
import {
  buildPathTree,
  getFillOrder,
  getWalkOrder,
  shuffleOptions,
  type PathTreeNode,
} from "../../lib/pharmaPathTree";
import { markPathTreeCompleted } from "../../lib/pharmaProgress";
import { useTheme } from "../../lib/theme";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type Mode = "idle" | "watch" | "fill" | "done";

function TreeNodeView({
  node,
  revealed,
  currentId,
  walkerId,
  depth = 0,
}: {
  node: PathTreeNode;
  revealed: Set<string>;
  currentId: string | null;
  walkerId: string | null;
  depth?: number;
}) {
  const theme = useTheme();
  const isRevealed = revealed.has(node.id);
  const isCurrent = currentId === node.id;
  const hasWalker = walkerId === node.id;

  return (
    <View style={styles.treeNode}>
      <View
        style={[
          styles.treeChip,
          {
            borderColor: isCurrent ? theme.foreground : theme.border,
            backgroundColor: isCurrent
              ? theme.surfaceMuted
              : isRevealed
                ? theme.card
                : theme.surfaceMuted,
            opacity: isRevealed || isCurrent ? 1 : 0.55,
          },
          hasWalker && { borderWidth: 2, borderColor: theme.foreground },
        ]}
      >
        {hasWalker ? (
          <View style={[styles.walkerPin, { backgroundColor: theme.foreground }]}>
            <MapPin size={8} color={theme.bg} />
          </View>
        ) : null}
        <Text
          style={[
            styles.treeChipText,
            { color: isRevealed ? theme.text : theme.textMuted },
          ]}
          numberOfLines={3}
        >
          {isRevealed ? node.label : "?"}
        </Text>
      </View>
      {node.edgeLabel && depth > 0 && isRevealed ? (
        <Text style={[styles.edgeLabel, { color: theme.textMuted }]} numberOfLines={2}>
          {node.edgeLabel}
        </Text>
      ) : null}
      {node.children.length > 0 ? (
        <View style={styles.treeChildren}>
          <View style={[styles.treeConnector, { backgroundColor: theme.border }]} />
          <View style={styles.treeRow}>
            {node.children.map((child) => (
              <View key={child.id} style={styles.treeChildCol}>
                <View style={[styles.treeConnectorShort, { backgroundColor: theme.border }]} />
                <TreeNodeView
                  node={child}
                  revealed={revealed}
                  currentId={currentId}
                  walkerId={walkerId}
                  depth={depth + 1}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function PathwayTreeExercise({
  mapId,
  map,
}: {
  mapId: string;
  map: PharmaMap;
}) {
  const theme = useTheme();
  const tree = useMemo(() => buildPathTree(map), [map]);
  const fillOrder = useMemo(() => (tree ? getFillOrder(tree) : []), [tree]);
  const walkOrder = useMemo(() => (tree ? getWalkOrder(tree) : []), [tree]);
  const labelPool = useMemo(() => map.nodes.map((n) => n.label_tr), [map]);

  const [mode, setMode] = useState<Mode>("idle");
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set(tree ? [tree.id] : []));
  const [walkerId, setWalkerId] = useState<string | null>(null);
  const [fillIdx, setFillIdx] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"ok" | "err" | null>(null);
  const [watchIdx, setWatchIdx] = useState(0);

  const reset = useCallback(() => {
    setMode("idle");
    setRevealed(new Set(tree ? [tree.id] : []));
    setWalkerId(null);
    setFillIdx(0);
    setOptions([]);
    setFeedback(null);
    setWatchIdx(0);
  }, [tree]);

  useEffect(() => {
    if (tree) setRevealed(new Set([tree.id]));
  }, [tree]);

  const startWatch = () => {
    if (!tree) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode("watch");
    setRevealed(new Set([tree.id]));
    setWalkerId(tree.id);
    setWatchIdx(0);
  };

  useEffect(() => {
    if (mode !== "watch" || !tree) return;
    if (watchIdx >= walkOrder.length) {
      const t = setTimeout(() => {
        setWalkerId(null);
        setMode("idle");
      }, 600);
      return () => clearTimeout(t);
    }
    const node = walkOrder[watchIdx];
    const t = setTimeout(() => {
      setRevealed((prev) => new Set([...prev, node.id]));
      setWalkerId(node.id);
      setWatchIdx((i) => i + 1);
    }, watchIdx === 0 ? 400 : 900);
    return () => clearTimeout(t);
  }, [mode, watchIdx, walkOrder, tree]);

  const startFill = () => {
    if (!tree || fillOrder.length === 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode("fill");
    setRevealed(new Set([tree.id]));
    setFillIdx(0);
    setWalkerId(fillOrder[0].id);
    setOptions(shuffleOptions(fillOrder[0].label, labelPool));
    setFeedback(null);
  };

  const currentFill = fillOrder[fillIdx];

  const pickOption = (label: string) => {
    if (!currentFill || feedback) return;
    void Haptics.selectionAsync();
    if (label === currentFill.label) {
      setFeedback("ok");
      setRevealed((prev) => new Set([...prev, currentFill.id]));
      const nextIdx = fillIdx + 1;
      if (nextIdx >= fillOrder.length) {
        setTimeout(() => {
          void markPathTreeCompleted(mapId);
          setMode("done");
          setWalkerId(null);
        }, 700);
      } else {
        setTimeout(() => {
          setFillIdx(nextIdx);
          setWalkerId(fillOrder[nextIdx].id);
          setOptions(shuffleOptions(fillOrder[nextIdx].label, labelPool));
          setFeedback(null);
        }, 700);
      }
    } else {
      setFeedback("err");
      setTimeout(() => setFeedback(null), 1200);
    }
  };

  if (!tree || fillOrder.length < 2) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <GitBranch size={18} color={theme.foreground} />
        <Text style={[styles.title, { color: theme.text }]}>Yolak yürüyüşü</Text>
      </View>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Kökten dallara inen yolu izle, boşlukları doldur — mekanizmayı yerleştir.
      </Text>

      <Card style={styles.treeCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TreeNodeView
            node={tree}
            revealed={revealed}
            currentId={mode === "fill" ? (currentFill?.id ?? null) : null}
            walkerId={walkerId}
          />
        </ScrollView>
      </Card>

      {mode === "idle" ? (
        <View style={styles.actions}>
          <View style={styles.actionBtn}>
            <Button variant="outline" label="Yolu izle" onPress={startWatch} />
          </View>
          <View style={styles.actionBtn}>
            <Button label="Sen doldur" onPress={startFill} />
          </View>
        </View>
      ) : null}

      {mode === "watch" ? (
        <View style={styles.watchRow}>
          <ActivityIndicator size="small" color={theme.foreground} />
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            Yolak boyunca ilerleniyor… ({Math.min(watchIdx, walkOrder.length)} /{" "}
            {walkOrder.length})
          </Text>
        </View>
      ) : null}

      {mode === "fill" && currentFill ? (
        <Card style={styles.fillCard}>
          <Text style={[styles.fillStep, { color: theme.textMuted }]}>
            Durak {fillIdx + 1} / {fillOrder.length}
          </Text>
          {currentFill.edgeLabel ? (
            <Text style={[styles.fillHint, { color: theme.textMuted }]}>
              İpucu: {currentFill.edgeLabel}
            </Text>
          ) : null}
          <Text style={[styles.fillQuestion, { color: theme.text }]}>
            Bu düğümde ne var?
          </Text>
          <View style={styles.optionsGrid}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                disabled={feedback === "ok"}
                onPress={() => pickOption(opt)}
                style={({ pressed }) => [
                  styles.optionBtn,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceMuted,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <Text style={[styles.optionText, { color: theme.text }]}>{opt}</Text>
              </Pressable>
            ))}
          </View>
          {feedback === "ok" ? (
            <Text style={[styles.feedbackOk, { color: theme.success }]}>
              Doğru — sonraki durağa geçiliyor…
            </Text>
          ) : null}
          {feedback === "err" ? (
            <Text style={[styles.feedbackErr, { color: theme.destructive }]}>
              Tekrar dene.
            </Text>
          ) : null}
        </Card>
      ) : null}

      {mode === "done" ? (
        <Card style={styles.doneCard}>
          <Text style={[styles.doneTitle, { color: theme.text }]}>Yolak tamamlandı</Text>
          <Text style={[styles.doneBody, { color: theme.textMuted }]}>
            Mekanizma yolunu baştan sona yerleştirdin.
          </Text>
          <Button variant="outline" label="Tekrar" onPress={reset} />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 18,
  },
  subtitle: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 13,
    lineHeight: 18,
  },
  treeCard: { paddingVertical: 16, paddingHorizontal: 12 },
  treeNode: { alignItems: "center" },
  treeChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 88,
    maxWidth: 120,
    position: "relative",
  },
  treeChipText: {
    fontSize: 11,
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
  },
  walkerPin: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  edgeLabel: { fontSize: 9, marginTop: 4, textAlign: "center", maxWidth: 100 },
  treeChildren: { alignItems: "center", marginTop: 10 },
  treeConnector: { width: 1, height: 12 },
  treeRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  treeChildCol: { alignItems: "center" },
  treeConnectorShort: { width: 1, height: 10 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexGrow: 1, minWidth: "45%" },
  watchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  fillCard: { gap: 10 },
  fillStep: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  fillHint: { fontSize: 11 },
  fillQuestion: {
    fontSize: 14,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
  },
  optionsGrid: { gap: 8 },
  optionBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  optionText: { fontSize: 13 },
  feedbackOk: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  feedbackErr: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  doneCard: { alignItems: "center", gap: 10, paddingVertical: 20 },
  doneTitle: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 16,
  },
  doneBody: { fontSize: 13, textAlign: "center" },
});
