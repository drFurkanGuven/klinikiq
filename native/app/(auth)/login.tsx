import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import { AlertCircle, Eye, EyeOff, Fingerprint, ScanFace } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { login as doLogin } from "../../lib/auth";
import { queryClient } from "../../lib/query-client";
import { useTheme } from "../../lib/theme";
import { storage } from "../../lib/storage";

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bioAvailable, setBioAvailable] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    (async () => {
      const [hasHardware, enrolled, token] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        storage.getToken(),
      ]);
      setBioAvailable(hasHardware && enrolled);
      setHasToken(!!token);
    })();
  }, []);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await doLogin(email.trim(), password, remember);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? String((e as { message?: string }).message)
          : "Giriş başarısız.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onBiometric = async () => {
    setError(null);
    const token = await storage.getToken();
    if (!token) {
      setError("Önce e-posta ile giriş yapın.");
      return;
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "KlinikIQ",
      fallbackLabel: "Şifre kullan",
    });
    if (res.success) {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.replace("/(tabs)");
    }
  };

  const bioIcon =
    Platform.OS === "ios" ? (
      <ScanFace size={22} color={theme.accent} />
    ) : (
      <Fingerprint size={22} color={theme.accent} />
    );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.brand, { color: theme.text }]}>KlinikIQ</Text>
          <Text style={[styles.sub, { color: theme.textMuted }]}>
            TUS&apos;a hazırlık platformu
          </Text>
        </View>

        {error ? (
          <Card
            style={[
              styles.errCard,
              {
                borderColor: theme.error,
                backgroundColor: `${theme.error}18`,
              },
            ]}
          >
            <View style={styles.errRow}>
              <AlertCircle size={20} color={theme.error} />
              <Text style={[styles.errText, { color: theme.error }]}>{error}</Text>
            </View>
          </Card>
        ) : null}

        <Input
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={secure}
          rightIcon={
            <Pressable
              accessibilityRole="button"
              onPress={() => setSecure((s) => !s)}
              style={styles.iconHit}
            >
              {secure ? (
                <Eye size={22} color={theme.textMuted} />
              ) : (
                <EyeOff size={22} color={theme.textMuted} />
              )}
            </Pressable>
          }
        />

        <View style={styles.rememberRow}>
          <Text style={[styles.rememberLabel, { color: theme.text }]}>Beni hatırla</Text>
          <Switch
            value={remember}
            onValueChange={setRemember}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor={Platform.OS === "android" ? theme.surface : undefined}
          />
        </View>

        <Button label="Giriş Yap" onPress={onSubmit} loading={loading} />

        {bioAvailable && hasToken ? (
          <Pressable
            accessibilityRole="button"
            onPress={onBiometric}
            style={({ pressed }) => [
              styles.bioBtn,
              {
                borderColor: theme.accent,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            {bioIcon}
            <Text style={[styles.bioLabel, { color: theme.accent }]}>
              Biyometrik ile devam et
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  brand: {
    fontFamily: Platform.select({
      ios: "Inter_900Black",
      android: "Inter_900Black",
      default: "Inter_900Black",
    }),
    fontSize: 36,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 8,
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 15,
  },
  errCard: {
    marginBottom: 16,
  },
  errRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  errText: {
    flex: 1,
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
    lineHeight: 20,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    minHeight: 44,
  },
  rememberLabel: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 15,
  },
  iconHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  bioBtn: {
    marginTop: 14,
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  bioLabel: {
    fontFamily: Platform.select({
      ios: "Inter_700Bold",
      android: "Inter_700Bold",
      default: "Inter_700Bold",
    }),
    fontSize: 15,
  },
});
