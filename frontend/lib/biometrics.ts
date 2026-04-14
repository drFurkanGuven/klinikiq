import { NativeBiometric } from "capacitor-native-biometric";
import { Capacitor } from "@capacitor/core";

const BIOMETRIC_SERVER = "klinikiq_auth";

export const biometricsClient = {
  // ── Uygunluk Kontrolü ──────────────────────────────────────────────────────
  async checkAvailability() {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const result = await NativeBiometric.isAvailable();
      // Hem donanım olmalı hem de biyometri tipi (parmak/yüz) belirlenmiş olmalı
      return !!(result.isAvailable && result.biometryType);
    } catch {
      return false;
    }
  },

  // ── Biyometrik Girişi Aktifleştir (Bilgileri Sakla) ──────────────────────────
  async enroll(email: string, password: string) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await NativeBiometric.setCredentials({
        server: BIOMETRIC_SERVER,
        username: email,
        password: password,
      });
      localStorage.setItem("biometrics_enabled", "true");
      return true;
    } catch (err) {
      console.error("Biyometrik kayıt hatası:", err);
      return false;
    }
  },

  // ── Kimlik Doğrula ve Bilgileri Getir ────────────────────────────────────────
  async authenticate() {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      // 1. Önce parmak izi/yüz tara
      await NativeBiometric.verifyIdentity({
        reason: "KlinikIQ'ya hızlı giriş yapmak için parmak izinizi kullanın",
        title: "Biyometrik Giriş",
        subtitle: "Lütfen kimliğinizi doğrulayın",
        description: "",
      });

      // 2. Başarılı ise saklanan bilgileri Keychain'den çek
      const credentials = await NativeBiometric.getCredentials({
        server: BIOMETRIC_SERVER,
      });

      return {
        email: credentials.username,
        password: credentials.password,
      };
    } catch (err) {
      console.error("Biyometrik doğrulama hatası veya iptal:", err);
      return null;
    }
  },

  // ── Biyometrik Girişi İptal Et ────────────────────────────────────────────────
  async disable() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await NativeBiometric.deleteCredentials({
        server: BIOMETRIC_SERVER,
      });
      localStorage.removeItem("biometrics_enabled");
      return true;
    } catch {
      return false;
    }
  },

  isEnabled() {
    return localStorage.getItem("biometrics_enabled") === "true";
  }
};
