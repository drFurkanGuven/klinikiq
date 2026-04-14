"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { Eye, EyeOff, Stethoscope, AlertCircle } from "lucide-react";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
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
        <div className="glass-card p-8 transition-all" style={{ background: "var(--surface)" }}>
          <h2 className="text-2xl font-black mb-6 tracking-tight" style={{ color: "var(--text-navy)" }}>Giriş Yap</h2>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 mb-5 text-sm font-bold border animate-fade-in-up"
              style={{ background: "var(--error-light)", color: "var(--danger)", borderColor: "var(--error-light)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 opacity-50" style={{ color: "var(--text-muted)" }}>
                E-posta Adresi
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@email.com"
                className="input-focus w-full border rounded-2xl px-5 py-4 transition-all text-sm font-medium shadow-sm"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 opacity-50" style={{ color: "var(--text-muted)" }}>
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
                  className="input-focus w-full border rounded-2xl px-5 py-4 pr-12 transition-all text-sm font-medium shadow-sm"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 transition-opacity p-1"
                  style={{ color: "var(--text)" }}
                >
                  {showPass ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-premium w-full py-4.5 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
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
        </div>
      </div>
    </div>
  );
}
