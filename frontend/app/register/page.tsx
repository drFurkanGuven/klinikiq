"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/auth";
import { Stethoscope, AlertCircle, ChevronDown } from "lucide-react";

const YEARS = [1, 2, 3, 4, 5, 6];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    school: "",
    year: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        ...form,
        year: form.year ? parseInt(form.year) : undefined,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Kayıt oluşturulamadı");
    } finally {
      setLoading(false);
    }
  }

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Arka plan efektleri */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--primary)_0%,_transparent_60%)] opacity-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-10" style={{ background: "var(--accent)" }} />

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

        <div className="glass rounded-3xl p-8 shadow-2xl border transition-all" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text)" }}>Hesap Oluştur</h2>

          {error && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-bold border" 
              style={{ background: "var(--error-light)", color: "var(--error)", borderColor: "var(--error-light)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 px-1 opacity-60" style={{ color: "var(--text-muted)" }}>Ad Soyad</label>
              <input
                id="reg-name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="input-focus w-full border rounded-xl px-4 py-3 transition-all text-sm"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 px-1 opacity-60" style={{ color: "var(--text-muted)" }}>E-posta</label>
              <input
                id="reg-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="ornek@email.com"
                className="input-focus w-full border rounded-xl px-4 py-3 transition-all text-sm"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 px-1 opacity-60" style={{ color: "var(--text-muted)" }}>
                Şifre <span className="text-[10px] lowercase font-medium opacity-50">(min 6 karakter)</span>
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
                className="input-focus w-full border rounded-xl px-4 py-3 transition-all text-sm"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 px-1 opacity-60" style={{ color: "var(--text-muted)" }}>Üniversite</label>
                <input
                  id="reg-school"
                  value={form.school}
                  onChange={(e) => update("school", e.target.value)}
                  placeholder="Hacettepe Tıp"
                  className="input-focus w-full border rounded-xl px-4 py-3 transition-all text-sm"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 px-1 opacity-60" style={{ color: "var(--text-muted)" }}>Sınıf</label>
                <div className="relative">
                  <select
                    id="reg-year"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    className="input-focus w-full border rounded-xl px-4 py-3 transition-all text-sm appearance-none"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <option value="">Seç</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}. Sınıf</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 pointer-events-none" style={{ color: "var(--text)" }} />
                </div>
              </div>
            </div>

            <button
              id="reg-submit"
              type="submit"
              disabled={loading}
              className="w-full text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-60 mt-4 flex items-center justify-center gap-2 group relative overflow-hidden"
              style={{ background: "var(--primary)" }}
            >
              <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300" />
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Hazırlanıyor...
                </>
              ) : (
                "Kayıt Ol"
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6 font-medium" style={{ color: "var(--text-muted)" }}>
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="font-bold transition-all hover:opacity-80" style={{ color: "var(--primary)" }}>
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
