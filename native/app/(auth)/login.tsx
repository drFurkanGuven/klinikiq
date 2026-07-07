import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { Link, router } from "expo-router";
import { AlertCircle, Eye, EyeOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { BASE_URL, authApi } from "../../lib/api";
import { getApiErrorMessage, checkApiReachable } from "../../lib/api-errors";
import { login as doLogin } from "../../lib/auth";
import { queryClient } from "../../lib/query-client";
import {
  tabletKeyboardOffset,
  useResponsiveLayout,
} from "../../lib/responsive";
import { useTheme } from "../../lib/theme";
import { storage } from "../../lib/storage";
import { PRIVACY_URL } from "../../lib/urls";

const REMEMBERED_EMAIL_KEY = "remembered_email";

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet, authMaxWidth } = useResponsiveLayout();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bioAvailable, setBioAvailable] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    void (async () => {
      const [hasHardware, enrolled, token, savedEmail] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        storage.getToken(),
        AsyncStorage.getItem(REMEMBERED_EMAIL_KEY),
      ]);
      setBioAvailable(hasHardware && enrolled);
      setHasToken(!!token);
      if (savedEmail) {
        setEmail(savedEmail);
        setRemember(true);
      }
    })();
  }, []);

  const onSubmit = async () => {
    if (loading) return;
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("E-posta adresini girin.");
      return;
    }
    if (!password) {
      setError("Şifrenizi girin.");
      return;
    }

    setLoading(true);
    try {
      const reachable = await checkApiReachable(BASE_URL);
      if (!reachable) {
        setError("İnternet bağlantınızı kontrol edin ve tekrar deneyin.");
        return;
      }
      await doLogin(trimmedEmail, password, remember);
      if (remember) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, trimmedEmail);
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Giriş başarısız."));
    } finally {
      setLoading(false);
    }
  };

  const onBiometric = async () => {
    if (loading) return;
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
    if (!res.success) return;

    setLoading(true);
    try {
      await authApi.me();
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.replace("/(tabs)");
    } catch {
      setError("Oturum süresi dolmuş. Lütfen e-posta ve şifre ile giriş yapın.");
      await storage.removeToken();
      setHasToken(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={tabletKeyboardOffset(isTablet)}
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
        <View
          style={[
            styles.formWrap,
            isTablet && { maxWidth: authMaxWidth, alignSelf: "center", width: "100%" },
          ]}
        >
          <AuthHeader
            title="Tekrar hoş geldin"
            subtitle="TUS hazırlığı için çalışmaya devam et"
          />

          {error ? (
            <Card
              style={[
                styles.errCard,
                {
                  borderColor: theme.destructive,
                  backgroundColor: theme.destructiveMuted,
                },
              ]}
            >
              <View style={styles.errRow}>
                <AlertCircle size={18} color={theme.destructive} />
                <Text style={[styles.errText, { color: theme.destructive }]}>
                  {error}
                </Text>
              </View>
            </Card>
          ) : null}

          <Card>
            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              placeholder="ornek@universite.edu.tr"
            />
            <Input
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
              editable={!loading}
              rightIcon={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSecure((s) => !s)}
                  style={styles.iconHit}
                >
                  {secure ? (
                    <Eye size={20} color={theme.textMuted} />
                  ) : (
                    <EyeOff size={20} color={theme.textMuted} />
                  )}
                </Pressable>
              }
            />

            <View style={styles.rememberRow}>
              <Text style={[styles.rememberLabel, { color: theme.textMuted }]}>
                Beni hatırla
              </Text>
              <Switch
                value={remember}
                onValueChange={setRemember}
                disabled={loading}
                trackColor={{ false: theme.border, true: theme.foreground }}
                thumbColor={Platform.OS === "android" ? theme.surface : undefined}
              />
            </View>

            <Button label="Giriş Yap" onPress={onSubmit} loading={loading} size="lg" />

            {bioAvailable && hasToken ? (
              <Button
                variant="outline"
                label="Hızlı giriş"
                onPress={onBiometric}
                loading={loading}
              />
            ) : null}
          </Card>

          <Text style={[styles.registerLine, { color: theme.textMuted }]}>
            Hesabın yok mu?{" "}
            <Link
              href="/(auth)/register"
              style={{ color: theme.foreground, fontWeight: "600" }}
            >
              Kayıt ol
            </Link>
          </Text>

          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(PRIVACY_URL)}
            style={styles.privacyHit}
          >
            <Text style={[styles.privacyLink, { color: theme.textMuted }]}>
              Gizlilik Politikası
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center" },
  formWrap: { width: "100%" },
  errCard: { marginBottom: 16 },
  errRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
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
    marginBottom: 16,
    minHeight: 44,
  },
  rememberLabel: {
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
  },
  iconHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  registerLine: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
  },
  privacyHit: {
    marginTop: 16,
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  privacyLink: {
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
