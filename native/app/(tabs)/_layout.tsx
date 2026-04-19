import { Tabs } from "expo-router";
import {
  Activity,
  FlaskConical,
  House,
  User,
  Zap,
} from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme";

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: { marginBottom: -2 },
        tabBarItemStyle: { minHeight: 44 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <House size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="simulasyon"
        options={{
          title: "Simülasyon",
          tabBarIcon: ({ color }) => <Activity size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="farmakoloji"
        options={{
          title: "Farmakoloji",
          tabBarIcon: ({ color }) => <FlaskConical size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="acil"
        options={{
          title: "Acil",
          tabBarIcon: ({ color }) => <Zap size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 10,
  },
});
