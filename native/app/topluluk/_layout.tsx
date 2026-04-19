import { Stack } from "expo-router";
import { useTheme } from "../../lib/theme";

export default function ToplulukLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    />
  );
}
