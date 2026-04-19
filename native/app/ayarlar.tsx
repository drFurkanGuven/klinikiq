import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { authApi, usersApi } from "../lib/api";
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
function fontSemi() {
  return Platform.select({
    ios: "Inter_600SemiBold",
    android: "Inter_600SemiBold",
    default: "Inter_600SemiBold",
  });
}

export default function AyarlarScreen() {
  const theme = useTheme();
  const { user, refetchUser } = useAuth();

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setSchool(user.school ?? "");
      setYear(user.year != null ? String(user.year) : "");
    }
  }, [user]);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile({
        name: name.trim() || undefined,
        school: school.trim() || undefined,
        year: year.trim() ? parseInt(year, 10) : undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchUser();
      Alert.alert("Kaydedildi", "Profil bilgilerin güncellendi.");
    } catch {
      Alert.alert("Hata", "Profil kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }, [name, school, year, refetchUser]);

  const changePassword = useCallback(async () => {
    if (!curPw || !newPw) {
      Alert.alert("Eksik alan", "Mevcut ve yeni şifreyi girin.");
      return;
    }
    if (newPw.length < 6) {
      Alert.alert("Şifre", "Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPw !== newPw2) {
      Alert.alert("Şifre", "Yeni şifreler eşleşmiyor.");
      return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword({
        current_password: curPw,
        new_password: newPw,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurPw("");
      setNewPw("");
      setNewPw2("");
      Alert.alert("Tamam", "Şifren güncellendi.");
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { detail?: string } } };
      Alert.alert("Hata", ax.response?.data?.detail ?? "Şifre değiştirilemedi.");
    } finally {
      setPwSaving(false);
    }
  }, [curPw, newPw, newPw2]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <ArrowLeft size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>Hesap Ayarları</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Profil bilgilerin liderlik tablosu ve raporlarda görünür.
          </Text>

          <Card style={[styles.card, { borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Profil</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>Ad Soyad</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  fontFamily: fontReg(),
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Adınız"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.label, { color: theme.textMuted }]}>Okul</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  fontFamily: fontReg(),
                },
              ]}
              value={school}
              onChangeText={setSchool}
              placeholder="Üniversite"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.label, { color: theme.textMuted }]}>Sınıf (yıl)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  fontFamily: fontReg(),
                },
              ]}
              value={year}
              onChangeText={setYear}
              placeholder="örn. 6"
              keyboardType="number-pad"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.email, { color: theme.textMuted }]}>
              E-posta: {user?.email ?? "—"} (değiştirilemez)
            </Text>
            <Button
              label={saving ? "Kaydediliyor…" : "Profili Kaydet"}
              onPress={() => void saveProfile()}
              disabled={saving}
            />
          </Card>

          <Card style={[styles.card, { borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Şifre</Text>
            <Text style={[styles.label, { color: theme.textMuted }]}>Mevcut şifre</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  fontFamily: fontReg(),
                },
              ]}
              value={curPw}
              onChangeText={setCurPw}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.label, { color: theme.textMuted }]}>Yeni şifre</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  fontFamily: fontReg(),
                },
              ]}
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              placeholder="En az 6 karakter"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.label, { color: theme.textMuted }]}>Yeni şifre tekrar</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  fontFamily: fontReg(),
                },
              ]}
              value={newPw2}
              onChangeText={setNewPw2}
              secureTextEntry
              placeholder="Tekrar"
              placeholderTextColor={theme.textMuted}
            />
            {pwSaving ? (
              <ActivityIndicator color={theme.accent} style={{ marginTop: 8 }} />
            ) : (
              <Button
                variant="outline"
                label="Şifreyi Güncelle"
                onPress={() => void changePassword()}
              />
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 17, fontFamily: fontBold() },
  scroll: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, fontFamily: fontReg(), marginBottom: 16 },
  card: { padding: 16, marginBottom: 16, borderWidth: 1, borderRadius: 16 },
  cardTitle: {
    fontSize: 17,
    fontFamily: fontBold(),
    marginBottom: 12,
  },
  label: { fontSize: 12, fontFamily: fontSemi(), marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  email: { fontSize: 13, fontFamily: fontReg(), marginTop: 12, marginBottom: 12 },
});
