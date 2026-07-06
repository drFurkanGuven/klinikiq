import { NativeBiometric } from "capacitor-native-biometric";
import { Capacitor } from "@capacitor/core";
import { storage } from "./storage";

const BIOMETRIC_SERVER = "klinikiq_auth";

export const biometricsClient = {
  async checkAvailability() {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      // 3 saniye içinde yanıt gelmezse false dön — login akışını bloklama
      const result = await Promise.race([
        NativeBiometric.isAvailable(),
        new Promise<{ isAvailable: false }>((resolve) =>
          setTimeout(() => resolve({ isAvailable: false }), 3000)
        ),
      ]);
      return !!(result.isAvailable && (result as any).biometryType);
    } catch {
      return false;
    }
  },

  async enroll(email: string, password: string) {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      // Önce Keychain'e yaz, başarılıysa flag'i set et
      await NativeBiometric.setCredentials({
        server: BIOMETRIC_SERVER,
        username: email,
        password: password,
      });
      await storage.setItem("biometrics_enabled", "true");
      return true;
    } catch (err) {
      console.error("Biyometrik kayıt hatası:", err);
      return false;
    }
  },

  async authenticate() {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      await NativeBiometric.verifyIdentity({
        reason: "KlinikIQ'ya hızlı giriş yapmak için parmak izinizi kullanın",
        title: "Biyometrik Giriş",
        subtitle: "Lütfen kimliğinizi doğrulayın",
        description: "",
      });

      const credentials = await NativeBiometric.getCredentials({
        server: BIOMETRIC_SERVER,
      });

      return { email: credentials.username, password: credentials.password };
    } catch {
      return null;
    }
  },

  async disable() {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
      await storage.removeItem("biometrics_enabled");
      return true;
    } catch {
      return false;
    }
  },

  isEnabled() {
    return storage.getItem("biometrics_enabled") === "true";
  },
};
