"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { Eye, EyeOff, Stethoscope, AlertCircle, Fingerprint, Loader2, Sparkles, Check } from "lucide-react";
import Footer from "@/components/Footer";
import { useTheme, type Palette } from "@/components/ThemeProvider";
import { biometricsClient } from "@/lib/biometrics";
import { nativeClient } from "@/lib/native";
import PremiumAlert from "@/components/PremiumAlert";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = React.useState(false);
  const [showBiometricEnroll, setShowBiometricEnroll] = useState(false);
  const [pendingCreds, setPendingCreds] = useState<{email:string, pass:string} | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { palette, setPalette } = useTheme();

  React.useEffect(() => {
    setMounted(true);
    // Biyometrik login kontrolü
    if (biometricsClient.isEnabled()) {
        handleBiometricLogin();
    }
  }, []);

  async function handleBiometricLogin() {
    const creds = await biometricsClient.authenticate();
    if (creds) {
        setLoading(true);
        try {
            await login(creds.email, creds.password);
            router.push("/dashboard");
        } catch {
            setError("Biyometrik giriş başarısız, lütfen şifrenizi girin.");
        } finally {
            setLoading(false);
        }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    nativeClient.impact();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      // Başarılı girişte biyometrik teklifi - Gerçek uygunluğu kontrol et
      if (!biometricsClient.isEnabled() && (window as any).Capacitor?.isNativePlatform()) {
          const available = await biometricsClient.checkAvailability();
          if (available) {
              setPendingCreds({ email: form.email, pass: form.password });
              setShowBiometricEnroll(true);
              return; // Router push modal kapanınca olacak
          }
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Giriş yapılamadı");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start sm:justify-center px-4 py-8 sm:py-12 relative overflow-y-auto transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Arka plan efektleri */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--primary)_0%,_transparent_60%)] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--accent)_0%,_transparent_60%)] opacity-10 pointer-events-none" />
      
      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-3 sm:mb-4 shadow-lg transition-transform hover:scale-105"
            style={{ background: "var(--primary)" }}>
            <Stethoscope className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black gradient-text tracking-tight">KlinikIQ</h1>
          <p className="text-[10px] sm:text-xs mt-1 opacity-50 font-black uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>TUS Hazırlık Platformu</p>
        </div>

        {/* Kart */}
        <div className="glass-card p-10 border-metallic transition-all shadow-[0_0_50px_rgba(0,0,0,0.5)]" style={{ background: "var(--surface)" }}>
          <h2 className="text-3xl font-black mb-10 tracking-tight" style={{ color: "var(--text)" }}>Giriş Yap</h2>

          {error && (
            <div className="flex items-center gap-3 rounded-2xl px-5 py-4 mb-8 text-sm font-black border animate-fade-in-up"
              style={{ background: "var(--error-light)", color: "var(--danger)", borderColor: "var(--danger)" }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-1 transition-colors group-focus-within:text-primary" style={{ color: "var(--text-muted)" }}>
                E-posta Adresi
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@email.com"
                className="input-focus w-full border-metallic rounded-2xl px-6 py-4.5 transition-all text-sm font-medium shadow-inner"
                style={{ background: "var(--surface-2)", color: "var(--text)" }}
              />
            </div>

            <div className="group">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-1 transition-colors group-focus-within:text-primary" style={{ color: "var(--text-muted)" }}>
                Şifre
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="••••••••"
                  className="input-focus w-full border-metallic rounded-2xl px-6 py-4.5 pr-14 transition-all text-sm font-medium shadow-inner"
                  style={{ background: "var(--surface-2)", color: "var(--text)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity p-1.5"
                  style={{ color: "var(--text)" }}
                >
                  {showPass ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-premium w-full py-5 mt-4 text-base tracking-widest uppercase"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                   Giriş Yap
                   <Sparkles className="w-5 h-5 opacity-50" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-8 font-medium opacity-60">
            Hesabın yok mu?{" "}
            <Link
              href="/register"
              className="font-black text-primary hover:underline transition-all underline-offset-4"
            >
              Hemen Kayıt Ol
            </Link>
          </p>

          {/* Biometric Login Button */}
          {biometricsClient.isEnabled() && (
            <button
                type="button"
                onClick={handleBiometricLogin}
                className="w-full mt-6 btn-premium py-4 bg-none border-metallic glass shadow-lg transition-transform hover:scale-[1.02] active:scale-95 text-white flex items-center justify-center gap-3"
                style={{ background: "transparent" }}
            >
                <Fingerprint className="w-6 h-6 text-primary" />
                <span className="text-[11px] font-black uppercase tracking-[0.25em]">Hızlı Giriş</span>
            </button>
          )}

          {/* Palette Selector */}
          <div className="mt-10 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-center text-[9px] font-black uppercase tracking-[0.2em] mb-4 opacity-40">Modern Stil Seçini</p>
            <div className="flex justify-center gap-4">
                {(["emerald", "midnight", "violet", "rose"] as Palette[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => { nativeClient.impact(); setPalette(p); }}
                        className={`w-10 h-10 rounded-full transition-all flex items-center justify-center shadow-lg border-2 ${palette === p ? "border-text scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
                        style={{ background: p === "emerald" ? "#4a7c59" : p === "midnight" ? "#334155" : p === "violet" ? "#7c3aed" : "#be123c" }}
                    >
                        {palette === p && <Check className="w-4 h-4 text-white" />}
                    </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      <PremiumAlert 
        isOpen={showBiometricEnroll}
        onClose={() => { setShowBiometricEnroll(false); router.push("/dashboard"); }}
        onConfirm={async () => {
            if (pendingCreds) await biometricsClient.enroll(pendingCreds.email, pendingCreds.pass);
        }}
        title="Biyometrik Giriş"
        message="Gelecek sefer KlinikIQ'ya sadece parmak izinizi veya yüzünüzü kullanarak anında giriş yapmak ister misiniz?"
        confirmText="Evet, Kullan"
        cancelText="Daha Sonra"
      />
    </div>
  );
}
