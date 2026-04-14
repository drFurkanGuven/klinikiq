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
          <p className="text-[10px] sm:text-xs mt-1 opacity-50 font-black uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Yeni Hesap Oluştur</p>
        </div>

        <div className="glass-card p-8 transition-all" style={{ background: "var(--surface)" }}>
          <h2 className="text-2xl font-black mb-6 tracking-tight" style={{ color: "var(--text-navy)" }}>Hesap Oluştur</h2>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 mb-5 text-sm font-bold border animate-fade-in-up" 
              style={{ background: "var(--error-light)", color: "var(--danger)", borderColor: "var(--error-light)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 opacity-50" style={{ color: "var(--text-muted)" }}>Ad Soyad</label>
              <input
                id="reg-name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="input-focus w-full border rounded-2xl px-5 py-3.5 transition-all text-sm font-medium shadow-sm"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 opacity-50" style={{ color: "var(--text-muted)" }}>E-posta</label>
              <input
                id="reg-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="ornek@email.com"
                className="input-focus w-full border rounded-2xl px-5 py-3.5 transition-all text-sm font-medium shadow-sm"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 opacity-50" style={{ color: "var(--text-muted)" }}>
                Şifre <span className="text-[9px] lowercase opacity-50 font-medium">(min 6 karakter)</span>
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
                className="input-focus w-full border rounded-2xl px-5 py-3.5 transition-all text-sm font-medium shadow-sm"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 opacity-50" style={{ color: "var(--text-muted)" }}>Üniversite</label>
                <input
                  id="reg-school"
                  value={form.school}
                  onChange={(e) => update("school", e.target.value)}
                  placeholder="Hacettepe Tıp"
                  className="input-focus w-full border rounded-2xl px-5 py-3.5 transition-all text-sm font-medium shadow-sm"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 opacity-50" style={{ color: "var(--text-muted)" }}>Sınıf</label>
                <div className="relative">
                  <select
                    id="reg-year"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    className="input-focus w-full border rounded-2xl px-5 py-3.5 transition-all text-sm appearance-none font-medium shadow-sm cursor-pointer"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <option value="">Seç</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}. Sınıf</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 pointer-events-none" style={{ color: "var(--text)" }} />
                </div>
              </div>
            </div>

            <button
              id="reg-submit"
              type="submit"
              disabled={loading}
              className="btn-premium w-full py-4 mt-4"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Kayıt Ol ve Başla"
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-8 font-medium opacity-60">
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="font-black text-primary hover:underline transition-all underline-offset-4">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
