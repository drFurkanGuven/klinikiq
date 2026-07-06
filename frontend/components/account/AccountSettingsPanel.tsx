"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  Edit2,
  Save,
  Loader2,
  KeyRound,
  Fingerprint,
  Sun,
  Moon,
  LogOut,
  Check,
  ShieldAlert,
} from "lucide-react";
import { authApi, usersApi, type UserOut } from "@/lib/api";
import { logout } from "@/lib/auth";
import { biometricsClient } from "@/lib/biometrics";
import { useTheme } from "@/components/ThemeProvider";
import { nativeClient } from "@/lib/native";
import PremiumAlert from "@/components/PremiumAlert";

export function AccountSettingsPanel() {
  const { theme, toggleTheme } = useTheme();
  const [userProfile, setUserProfile] = useState<UserOut | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [showBioInfo, setShowBioInfo] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileSchool, setProfileSchool] = useState("");
  const [profileYear, setProfileYear] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<"ok" | "err" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<"ok" | string | null>(null);

  useEffect(() => {
    authApi.me().then((res) => {
      setUserProfile(res.data);
      setProfileName(res.data.name || "");
      setProfileSchool(res.data.school || "");
      setProfileYear(res.data.year ? String(res.data.year) : "");
    }).catch(() => {});
    biometricsClient.checkAvailability().then((available) => {
      setBiometricsAvailable(available);
      setIsBiometricsEnabled(biometricsClient.isEnabled());
    });
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileSaveMsg(null);
    try {
      const res = await usersApi.updateProfile({
        name: profileName.trim() || undefined,
        school: profileSchool.trim() || undefined,
        year: profileYear ? parseInt(profileYear) : undefined,
      });
      setUserProfile(res.data);
      setIsEditingProfile(false);
      setProfileSaveMsg("ok");
      setTimeout(() => setProfileSaveMsg(null), 2500);
    } catch {
      setProfileSaveMsg("err");
      setTimeout(() => setProfileSaveMsg(null), 2500);
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      setPasswordMsg("Mevcut ve yeni şifre alanlarını doldurun.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg("Yeni şifre ve doğrulama eşleşmiyor.");
      return;
    }

    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg("ok");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPasswordMsg(typeof detail === "string" ? detail : "Şifre güncellenemedi.");
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setPasswordMsg(null), 3000);
    }
  }

  async function toggleBiometrics() {
    nativeClient.impact();
    if (isBiometricsEnabled) {
      await biometricsClient.disable();
      setIsBiometricsEnabled(false);
    } else {
      setShowBioInfo(true);
      setIsBiometricsEnabled(true);
    }
  }

  return (
    <div className="space-y-8">
      {userProfile?.is_admin && (
        <Link
          href="/admin"
          onClick={() => nativeClient.impact()}
          className="flex items-center gap-3 p-4 rounded-lg border text-sm font-medium transition-colors"
          style={{
            borderColor: "color-mix(in srgb, var(--destructive) 25%, transparent)",
            background: "color-mix(in srgb, var(--destructive) 8%, transparent)",
            color: "var(--destructive)",
          }}
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Yönetim paneli
        </Link>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>Profil bilgileri</p>
          {!isEditingProfile ? (
            <button
              type="button"
              onClick={() => { nativeClient.impact(); setIsEditingProfile(true); setProfileSaveMsg(null); }}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              <Edit2 className="w-3 h-3" /> Düzenle
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditingProfile(false);
                  setProfileName(userProfile?.name || "");
                  setProfileSchool(userProfile?.school || "");
                  setProfileYear(userProfile?.year ? String(userProfile.year) : "");
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={profileSaving}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg btn-primary"
              >
                {profileSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Kaydet
              </button>
            </div>
          )}
        </div>

        {profileSaveMsg === "ok" && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px] font-medium flex items-center gap-2"
            style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
            <Check className="w-3.5 h-3.5" /> Profil başarıyla güncellendi
          </div>
        )}
        {profileSaveMsg === "err" && (
          <div className="mb-3 px-3 py-2 rounded-lg text-[11px] font-medium"
            style={{ background: "color-mix(in srgb, var(--destructive) 15%, transparent)", color: "var(--destructive)" }}>
            Kayıt sırasında bir hata oluştu.
          </div>
        )}

        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 shrink-0 opacity-40" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted)" }}>E-posta</p>
              <p className="text-xs font-medium truncate" style={{ color: "var(--text-muted)" }}>{userProfile?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted)" }}>Ad soyad</p>
              {isEditingProfile ? (
                <input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium outline-none border-b pb-0.5"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  placeholder="Adınız Soyadınız"
                />
              ) : (
                <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{userProfile?.name || "—"}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted)" }}>Okul</p>
              {isEditingProfile ? (
                <input
                  value={profileSchool}
                  onChange={(e) => setProfileSchool(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium outline-none border-b pb-0.5"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  placeholder="Tıp Fakültesi"
                />
              ) : (
                <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{userProfile?.school || "—"}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium mb-0.5" style={{ color: "var(--muted)" }}>Sınıf</p>
              {isEditingProfile ? (
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={profileYear}
                  onChange={(e) => setProfileYear(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium outline-none border-b pb-0.5"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  placeholder="1–6"
                />
              ) : (
                <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{userProfile?.year ? `${userProfile.year}. Sınıf` : "—"}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>Şifre değiştir</p>
        <div className="rounded-lg border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <div className="flex items-center gap-2 text-[11px] font-medium opacity-70" style={{ color: "var(--text-muted)" }}>
            <KeyRound className="w-3.5 h-3.5" />
            Güvenlik için mevcut şifreniz doğrulanır.
          </div>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-transparent text-xs font-medium outline-none border rounded-lg px-3 py-2"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            placeholder="Mevcut şifre"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-transparent text-xs font-medium outline-none border rounded-lg px-3 py-2"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            placeholder="Yeni şifre (min 6 karakter)"
          />
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full bg-transparent text-xs font-medium outline-none border rounded-lg px-3 py-2"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            placeholder="Yeni şifre (tekrar)"
          />
          <button
            type="button"
            onClick={changePassword}
            disabled={passwordSaving}
            className="w-full btn-primary flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg"
          >
            {passwordSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Şifreyi Güncelle
          </button>
          {passwordMsg === "ok" && (
            <div className="px-3 py-2 rounded-lg text-[11px] font-medium" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
              Şifre başarıyla güncellendi.
            </div>
          )}
          {passwordMsg && passwordMsg !== "ok" && (
            <div className="px-3 py-2 rounded-lg text-[11px] font-medium" style={{ background: "color-mix(in srgb, var(--destructive) 15%, transparent)", color: "var(--destructive)" }}>
              {passwordMsg}
            </div>
          )}
        </div>
      </div>

      {biometricsAvailable && (
        <div className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
          <div className="flex items-center gap-3">
            <Fingerprint className="w-5 h-5" style={{ color: "var(--foreground)" }} />
            <div>
              <p className="text-xs font-semibold">Parmak İzi</p>
              <p className="text-[10px] opacity-50">Hızlı Giriş</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleBiometrics}
            className="w-12 h-6 rounded-full transition-all relative"
            style={{ background: isBiometricsEnabled ? "var(--accent)" : "var(--border-strong)" }}
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full transition-all ${isBiometricsEnabled ? "left-7" : "left-1"}`}
              style={{ background: isBiometricsEnabled ? "var(--accent-foreground)" : "var(--surface)" }}
            />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => { nativeClient.impact(); toggleTheme(); }}
        className="w-full flex items-center justify-between p-4 rounded-lg border"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-3">
          {theme === "dark" ? <Sun className="w-5 h-5" style={{ color: "var(--foreground)" }} /> : <Moon className="w-5 h-5" style={{ color: "var(--foreground)" }} />}
          <p className="text-xs font-semibold">{theme === "dark" ? "Gündüz Modu" : "Gece Modu"}</p>
        </div>
        <span className="text-[10px] font-medium opacity-40 uppercase">Değiştir</span>
      </button>

      <button
        type="button"
        onClick={logout}
        className="w-full py-4 text-xs font-medium flex items-center justify-center gap-2 border-t"
        style={{ borderColor: "var(--border)", color: "var(--destructive)" }}
      >
        <LogOut className="w-4 h-4" /> Oturumu Kapat
      </button>

      <PremiumAlert
        isOpen={showBioInfo}
        onClose={() => setShowBioInfo(false)}
        title="Sistem Hazır"
        message="Biyometrik giriş altyapısı hazırlandı. Tam aktif olması için bir sonraki girişinizde size sorulduğunda 'Evet' demeniz yeterlidir."
        confirmText="Anladım"
        type="success"
      />
    </div>
  );
}
