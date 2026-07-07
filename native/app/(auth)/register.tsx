import { Link, router } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { BASE_URL } from "../../lib/api";
import { checkApiReachable, getApiErrorMessage } from "../../lib/api-errors";
import { register as doRegister } from "../../lib/auth";
import { queryClient } from "../../lib/query-client";
import {
  tabletKeyboardOffset,
  useResponsiveLayout,
} from "../../lib/responsive";
import { useTheme } from "../../lib/theme";
import {
  DELETE_ACCOUNT_URL,
  PRIVACY_URL,
  SUPPORT_URL,
  TERMS_URL,
} from "../../lib/urls";

const YEARS = ["1", "2", "3", "4", "5", "6"];

export default function RegisterScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet, authMaxWidth } = useResponsiveLayout();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (loading) return;
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Ad, e-posta ve şifre zorunludur.");
      return;
    }
    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const reachable = await checkApiReachable(BASE_URL);
      if (!reachable) {
        setError("İnternet bağlantınızı kontrol edin ve tekrar deneyin.");
        return;
      }
      await doRegister({
        email: email.trim(),
        password,
        name: name.trim(),
        school: school.trim() || undefined,
        year: year ? parseInt(year, 10) : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Kayıt oluşturulamadı."));
    } finally {
      setLoading(false);
    }
  };

  const legalLink = (label: string, url: string) => (
    <Pressable
      key={label}
      onPress={() => void Linking.openURL(url)}
      style={styles.legalHit}
    >
      <Text style={[styles.legalText, { color: theme.textMuted }]}>{label}</Text>
    </Pressable>
  );

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
            title="Hesap oluştur"
            subtitle="Ücretsiz başla — vaka, MCQ ve öğrenme araçları"
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
              label="Ad Soyad"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />
            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            <Input
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
              hint="En az 6 karakter"
            />
            <Input
              label="Okul (isteğe bağlı)"
              value={school}
              onChangeText={setSchool}
              editable={!loading}
            />

            <Text style={[styles.yearLabel, { color: theme.textMuted }]}>
              Sınıf (isteğe bağlı)
            </Text>
            <View style={styles.yearRow}>
              {YEARS.map((y) => {
                const selected = year === y;
                return (
                  <Pressable
                    key={y}
                    accessibilityRole="button"
                    disabled={loading}
                    onPress={() => setYear(selected ? "" : y)}
                    style={[
                      styles.yearChip,
                      {
                        borderColor: selected ? theme.accent : theme.border,
                        backgroundColor: selected ? theme.accent : theme.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.yearChipText,
                        {
                          color: selected ? theme.accentForeground : theme.text,
                        },
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button label="Kayıt Ol" onPress={onSubmit} loading={loading} size="lg" />
          </Card>

          <Text style={[styles.loginLine, { color: theme.textMuted }]}>
            Zaten hesabın var mı?{" "}
            <Link
              href="/(auth)/login"
              style={{ color: theme.foreground, fontWeight: "600" }}
            >
              Giriş yap
            </Link>
          </Text>

          <View style={styles.legalRow}>
            {legalLink("Gizlilik", PRIVACY_URL)}
            {legalLink("Koşullar", TERMS_URL)}
            {legalLink("Destek", SUPPORT_URL)}
            {legalLink("Hesap sil", DELETE_ACCOUNT_URL)}
          </View>
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
  yearLabel: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
    marginBottom: 8,
  },
  yearRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  yearChip: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  yearChipText: {
    fontFamily: Platform.select({
      ios: "Inter_600SemiBold",
      android: "Inter_600SemiBold",
      default: "Inter_600SemiBold",
    }),
    fontSize: 14,
  },
  loginLine: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
    fontSize: 14,
  },
  legalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 20,
  },
  legalHit: { minHeight: 36, justifyContent: "center" },
  legalText: {
    fontSize: 12,
    textDecorationLine: "underline",
    fontFamily: Platform.select({
      ios: "Inter_400Regular",
      android: "Inter_400Regular",
      default: "Inter_400Regular",
    }),
  },
});
