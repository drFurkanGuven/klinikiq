"use client";
import { useState } from "react";
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Arka plan efektleri */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--primary)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--accent)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: "var(--primary)" }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg transition-transform hover:scale-105"
            style={{ background: "var(--primary)" }}>
            <Stethoscope className="w-8 h-8 text-white" />
          </Link>
          <h1 className="text-3xl font-bold gradient-text">KlinikIQ</h1>
          <p className="text-sm mt-1 opacity-60 font-medium" style={{ color: "var(--text-muted)" }}>TUS Hazırlık Platformu</p>
        </div>

        {/* Kart */}
        <div className="glass rounded-3xl p-8 shadow-2xl border transition-all" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text)" }}>Giriş Yap</h2>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-bold border"
              style={{ background: "var(--error-light)", color: "var(--error)", borderColor: "var(--error-light)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 px-1 opacity-60" style={{ color: "var(--text-muted)" }}>
                E-posta
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ornek@email.com"
                className="input-focus w-full border rounded-xl px-4 py-3 transition-all text-sm"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 px-1 opacity-60" style={{ color: "var(--text-muted)" }}>
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
                  className="input-focus w-full border rounded-xl px-4 py-3 pr-11 transition-all text-sm"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
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
              className="w-full text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-60 mt-2 flex items-center justify-center gap-2 group relative overflow-hidden"
              style={{ background: "var(--primary)" }}
            >
              <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300" />
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6 font-medium" style={{ color: "var(--text-muted)" }}>
            Hesabın yok mu?{" "}
            <Link
              href="/register"
              className="font-bold transition-all hover:opacity-80"
              style={{ color: "var(--primary)" }}
            >
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
