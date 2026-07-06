import { Link, router } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
          <View style={styles.header}>
            <Text style={[styles.brand, { color: theme.text }]}>KlinikIQ</Text>
            <Text style={[styles.sub, { color: theme.textMuted }]}>
              Yeni hesap oluştur
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
          />
          <Input
            label="Okul (isteğe bağlı)"
            value={school}
            onChangeText={setSchool}
            editable={!loading}
          />

          <Text style={[styles.yearLabel, { color: theme.textMuted }]}>Sınıf (isteğe bağlı)</Text>
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
                      backgroundColor: selected ? `${theme.accent}22` : theme.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.yearChipText,
                      { color: selected ? theme.accent : theme.text },
                    ]}
                  >
                    {y}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button label="Kayıt Ol" onPress={onSubmit} loading={loading} />

          <Text style={[styles.loginLine, { color: theme.textMuted }]}>
            Zaten hesabın var mı?{" "}
            <Link href="/(auth)/login" style={{ color: theme.accent, fontWeight: "700" }}>
              Giriş yap
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center" },
  formWrap: { width: "100%" },
  header: { alignItems: "center", marginBottom: 24 },
  brand: {
    fontFamily: "Inter_900Black",
    fontSize: 32,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 8,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  errCard: { marginBottom: 16 },
  errRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  errText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  yearLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },
  yearRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  yearChip: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  yearChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  loginLine: {
    marginTop: 20,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
