import * as Haptics from "expo-haptics";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../lib/theme";

type Tab<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  tabs: readonly Tab<T>[];
  active: T;
  onChange: (id: T) => void;
};

export function SegmentedControl<T extends string>({
  tabs,
  active,
  onChange,
}: Props<T>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: theme.border,
          backgroundColor: theme.surfaceMuted,
          borderRadius: theme.radiusLg,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(id);
              }}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? theme.accent : "transparent",
                  borderRadius: theme.radiusMd,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.accentForeground : theme.textMuted,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    padding: 4,
  },
  row: {
    flexGrow: 1,
    flexDirection: "row",
    gap: 2,
  },
  tab: {
    flex: 1,
    minWidth: 72,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabLabel: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 13,
  },
});
