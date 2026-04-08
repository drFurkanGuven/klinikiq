"use client";
import { useState } from "react";
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#1e3a5f_0%,_transparent_60%)]" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-lg shadow-blue-500/30">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">KlinikIQ</h1>
          <p className="text-slate-400 mt-1 text-sm">TUS Hazırlık Platformu</p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Hesap Oluştur</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Ad Soyad</label>
              <input
                id="reg-name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="input-focus w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">E-posta</label>
              <input
                id="reg-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="ornek@email.com"
                className="input-focus w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Şifre <span className="text-slate-500">(min 6 karakter)</span></label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
                className="input-focus w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Üniversite</label>
                <input
                  id="reg-school"
                  value={form.school}
                  onChange={(e) => update("school", e.target.value)}
                  placeholder="Hacettepe Tıp"
                  className="input-focus w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Sınıf</label>
                <div className="relative">
                  <select
                    id="reg-year"
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    className="input-focus w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm appearance-none"
                  >
                    <option value="">Seç</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}. Sınıf</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              id="reg-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Kayıt oluşturuluyor...
                </>
              ) : (
                "Kayıt Ol"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
