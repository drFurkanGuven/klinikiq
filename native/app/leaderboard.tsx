import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft, Trophy } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { LeaderboardItem } from "../lib/api";
import { leaderboardApi } from "../lib/api";
import { useAuth } from "../lib/auth";
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

const COL_W = {
  rank: 44,
  name: 140,
  school: 120,
  cases: 72,
  avg: 64,
  em: 56,
};

const TABLE_MIN_W =
  COL_W.rank +
  COL_W.name +
  COL_W.school +
  COL_W.cases +
  COL_W.avg +
  COL_W.em +
  48;

function SkeletonRow({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skelRow,
        {
          opacity,
          backgroundColor: theme.border,
        },
      ]}
    />
  );
}

function medalForRank(rank: number) {
  if (rank === 1) return "🥇 ";
  if (rank === 2) return "🥈 ";
  if (rank === 3) return "🥉 ";
  return "";
}

export default function LeaderboardScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { width: winW, height: winH } = useWindowDimensions();
  const innerScrollMaxH = Math.max(320, winH - 140);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => (await leaderboardApi.list()).data,
  });

  const rows = data ?? [];
  const meName = user?.name?.trim() ?? "";

  const table = useMemo(() => {
    return rows.map((item, i) => ({
      rank: i + 1,
      item,
      isMe: meName.length > 0 && item.name.trim() === meName,
    }));
  }, [rows, meName]);

  const onRefresh = () => refetch();

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
        <View style={styles.navCenter}>
          <Trophy size={22} color={theme.accent} />
          <Text style={[styles.navTitle, { color: theme.text }]}>Sıralama</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.skelWrap}>
          <SkeletonRow theme={theme} />
          <SkeletonRow theme={theme} />
          <SkeletonRow theme={theme} />
        </View>
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          style={styles.hScroll}
          contentContainerStyle={{ flexGrow: 1 }}
          showsHorizontalScrollIndicator
        >
          <View style={{ minWidth: Math.max(TABLE_MIN_W, winW), flex: 1 }}>
            <ScrollView
              nestedScrollEnabled
              style={{ maxHeight: innerScrollMaxH }}
              contentContainerStyle={styles.vContent}
              stickyHeaderIndices={[0]}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching && !isLoading}
                  onRefresh={onRefresh}
                  tintColor={theme.accent}
                  colors={[theme.accent]}
                />
              }
            >
              <View
                style={[
                  styles.headerRow,
                  {
                    backgroundColor: theme.surface,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.hCell, styles.colRank, { color: theme.textMuted }]}>
                  #
                </Text>
                <Text style={[styles.hCell, styles.colName, { color: theme.textMuted }]}>
                  Ad
                </Text>
                <Text style={[styles.hCell, styles.colSchool, { color: theme.textMuted }]}>
                  Okul / Yıl
                </Text>
                <Text style={[styles.hCell, styles.colCases, { color: theme.textMuted }]}>
                  Vaka
                </Text>
                <Text style={[styles.hCell, styles.colAvg, { color: theme.textMuted }]}>
                  Ort.
                </Text>
                <Text style={[styles.hCell, styles.colEm, { color: theme.textMuted }]}>
                  Acil
                </Text>
              </View>

              {table.map(({ rank, item, isMe }) => (
                <LeaderboardDataRow
                  key={`lb-row-${rank}`}
                  rank={rank}
                  item={item}
                  isMe={isMe}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function LeaderboardDataRow({
  rank,
  item,
  isMe,
  theme,
}: {
  rank: number;
  item: LeaderboardItem;
  isMe: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const schoolLine = [item.school, item.year != null ? String(item.year) : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <View
      style={[
        styles.dataRow,
        {
          borderBottomColor: theme.border,
          backgroundColor: isMe ? `${theme.accent}28` : "transparent",
          borderWidth: isMe ? 1 : 0,
          borderColor: isMe ? "#EAB308" : "transparent",
        },
      ]}
    >
      <Text style={[styles.cell, styles.colRank, { color: theme.text }]} numberOfLines={1}>
        {medalForRank(rank)}
        {rank}
      </Text>
      <Text style={[styles.cell, styles.colName, { color: theme.text }]} numberOfLines={2}>
        {item.name}
      </Text>
      <Text
        style={[styles.cell, styles.colSchool, { color: theme.textMuted }]}
        numberOfLines={2}
      >
        {schoolLine || "—"}
      </Text>
      <Text style={[styles.cell, styles.colCases, { color: theme.text }]}>
        {item.total_cases}
      </Text>
      <Text style={[styles.cell, styles.colAvg, { color: theme.text }]}>
        {item.average_score.toFixed(1)}
      </Text>
      <Text style={[styles.cell, styles.colEm, { color: theme.text }]}>
        {item.emergency_correct}
      </Text>
    </View>
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
    paddingBottom: 10,
    minHeight: 48,
  },
  navBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  navCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  navTitle: {
    fontFamily: fontBold(),
    fontSize: 18,
  },
  hScroll: {
    flex: 1,
  },
  vContent: {
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hCell: {
    fontFamily: fontBold(),
    fontSize: 11,
    textTransform: "uppercase",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  cell: {
    fontFamily: fontReg(),
    fontSize: 13,
  },
  colRank: {
    width: COL_W.rank,
  },
  colName: {
    width: COL_W.name,
    paddingRight: 6,
  },
  colSchool: {
    width: COL_W.school,
    paddingRight: 6,
  },
  colCases: {
    width: COL_W.cases,
    textAlign: "right",
  },
  colAvg: {
    width: COL_W.avg,
    textAlign: "right",
  },
  colEm: {
    width: COL_W.em,
    textAlign: "right",
  },
  skelWrap: {
    paddingHorizontal: 16,
    gap: 10,
    paddingTop: 8,
  },
  skelRow: {
    height: 52,
    borderRadius: 12,
  },
});
