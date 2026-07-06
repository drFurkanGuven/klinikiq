"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { Eye, EyeOff, Stethoscope, AlertCircle, Fingerprint } from "lucide-react";
import Footer from "@/components/Footer";
import { biometricsClient } from "@/lib/biometrics";
import { nativeClient } from "@/lib/native";
import PremiumAlert from "@/components/PremiumAlert";
import { storage } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function postLoginPath(): string {
  if (typeof window === "undefined") return "/calis";
  const q = new URLSearchParams(window.location.search).get("next");
  if (q && q.startsWith("/") && !q.startsWith("//") && !q.includes("://")) return q;
  return "/calis";
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = React.useState(false);
  const [showBiometricEnroll, setShowBiometricEnroll] = useState(false);
  const [pendingCreds, setPendingCreds] = useState<{ email: string; pass: string } | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    storage.waitForInit().then(() => {
      if (storage.getItem("access_token")) {
        router.replace(postLoginPath());
        return;
      }
      const savedEmail = localStorage.getItem("remembered_email");
      if (savedEmail) {
        setForm((f) => ({ ...f, email: savedEmail }));
        setRememberMe(true);
      }
      if (biometricsClient.isEnabled()) {
        handleBiometricLogin();
      }
    });
  }, []);

  async function handleBiometricLogin() {
    const creds = await biometricsClient.authenticate();
    if (creds) {
      setLoading(true);
      try {
        await login(creds.email, creds.password, { rememberMe: true });
        router.push(postLoginPath());
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
      await login(form.email, form.password, { rememberMe });
      if (rememberMe) {
        localStorage.setItem("remembered_email", form.email);
      } else {
        localStorage.removeItem("remembered_email");
      }
      try {
        if (!biometricsClient.isEnabled() && (window as any).Capacitor?.isNativePlatform()) {
          const available = await biometricsClient.checkAvailability();
          if (available) {
            setPendingCreds({ email: form.email, pass: form.password });
            setShowBiometricEnroll(true);
            return;
          }
        }
      } catch {
        // Biyometrik kontrol başarısız → görmezden gel, dashboard'a geç
      }
      router.push(postLoginPath());
    } catch (err: any) {
      setError(err.response?.data?.detail || "Giriş yapılamadı");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <main
        className="flex-1 flex flex-col items-center justify-center px-4 py-12"
        style={{ paddingTop: "max(3rem, calc(var(--safe-top) + 3rem))" }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <Stethoscope className="w-6 h-6" style={{ color: "var(--accent-foreground)" }} />
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
              Tekrar hoş geldin
            </h1>
            <p className="text-sm mt-1.5" style={{ color: "var(--muted)" }}>
              KlinikIQ hesabına giriş yap
            </p>
          </div>

          <div className="card p-6">
            {error && (
              <div
                className="flex items-center gap-2 rounded-md px-3.5 py-3 mb-5 text-sm border"
                style={{
                  background: "var(--destructive-muted)",
                  color: "var(--destructive)",
                  borderColor: "transparent",
                }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="login-email"
                label="E-posta"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@email.com"
                autoComplete="email"
              />

              <Input
                id="login-password"
                label="Şifre"
                type={showPass ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                autoComplete="current-password"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="p-1.5 rounded transition-colors hover:bg-surface-hover"
                    style={{ color: "var(--muted)" }}
                    aria-label={showPass ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => {
                    nativeClient.impact();
                    setRememberMe(!rememberMe);
                  }}
                  className="w-4 h-4 rounded accent-[var(--accent)]"
                />
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  Beni hatırla
                </span>
              </label>

              <Button id="login-submit" type="submit" loading={loading} className="w-full" size="lg">
                {loading ? "Giriş yapılıyor..." : "Giriş yap"}
              </Button>
            </form>

            {biometricsClient.isEnabled() && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBiometricLogin}
                className="w-full mt-3"
                size="lg"
              >
                <Fingerprint className="w-4 h-4" />
                Hızlı giriş
              </Button>
            )}
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
            Hesabın yok mu?{" "}
            <Link href="/register" className="font-medium hover:underline underline-offset-4" style={{ color: "var(--foreground)" }}>
              Kayıt ol
            </Link>
          </p>
        </div>
      </main>

      <Footer />

      <PremiumAlert
        isOpen={showBiometricEnroll}
        onClose={() => {
          setShowBiometricEnroll(false);
          router.push(postLoginPath());
        }}
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
