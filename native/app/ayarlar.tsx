import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { authApi, usersApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import {
  DELETE_ACCOUNT_URL,
  PRIVACY_URL,
  SUPPORT_URL,
  TERMS_URL,
  WEB_ORIGIN,
} from "../lib/urls";

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
            <ArrowLeft size={22} color={theme.foreground} />
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

          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Profil</Text>
            <Input label="Ad Soyad" value={name} onChangeText={setName} placeholder="Adınız" />
            <Input label="Okul" value={school} onChangeText={setSchool} placeholder="Üniversite" />
            <Input
              label="Sınıf (yıl)"
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              placeholder="örn. 6"
            />
            <Text style={[styles.email, { color: theme.textMuted }]}>
              E-posta: {user?.email ?? "—"} (değiştirilemez)
            </Text>
            <Button
              label={saving ? "Kaydediliyor…" : "Profili Kaydet"}
              onPress={() => void saveProfile()}
              loading={saving}
            />
          </Card>

          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Şifre</Text>
            <Input
              label="Mevcut şifre"
              value={curPw}
              onChangeText={setCurPw}
              secureTextEntry
              placeholder="••••••"
            />
            <Input
              label="Yeni şifre"
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
              placeholder="En az 6 karakter"
            />
            <Input
              label="Yeni şifre tekrar"
              value={newPw2}
              onChangeText={setNewPw2}
              secureTextEntry
              placeholder="Tekrar"
            />
            <Button
              variant="outline"
              label="Şifreyi Güncelle"
              onPress={() => void changePassword()}
              loading={pwSaving}
            />
          </Card>

          {user?.is_admin ? (
            <Card style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Yönetim</Text>
              <Button
                variant="outline"
                label="Admin paneli"
                onPress={() =>
                  router.push({ pathname: "/web", params: { path: "/admin" } })
                }
              />
            </Card>
          ) : null}

          <View style={styles.legalRow}>
            {legalLink("Gizlilik", PRIVACY_URL)}
            {legalLink("Koşullar", TERMS_URL)}
            {legalLink("Destek", SUPPORT_URL)}
            {legalLink("Hesap sil", DELETE_ACCOUNT_URL)}
          </View>

          <Text style={[styles.webHint, { color: theme.textMuted }]}>
            Web: {WEB_ORIGIN}
          </Text>
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
  card: { marginBottom: 16 },
  cardTitle: {
    fontSize: 17,
    fontFamily: fontBold(),
    marginBottom: 4,
  },
  email: { fontSize: 13, fontFamily: fontReg(), marginBottom: 12 },
  legalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  legalHit: { minHeight: 36, justifyContent: "center" },
  legalText: {
    fontSize: 12,
    textDecorationLine: "underline",
    fontFamily: fontReg(),
  },
  webHint: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 16,
    fontFamily: fontReg(),
  },
});
