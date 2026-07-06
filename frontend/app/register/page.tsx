"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/auth";
import { Stethoscope, AlertCircle, ChevronDown } from "lucide-react";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

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
              Hesap oluştur
            </h1>
            <p className="text-sm mt-1.5" style={{ color: "var(--muted)" }}>
              Ücretsiz başla, saniyeler içinde
            </p>
          </div>

          <div className="card p-6">
            {error && (
              <div
                className="flex items-center gap-2 rounded-md px-3.5 py-3 mb-5 text-sm border"
                style={{ background: "var(--destructive-muted)", color: "var(--destructive)", borderColor: "transparent" }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="reg-name"
                label="Ad Soyad"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ahmet Yılmaz"
                autoComplete="name"
              />

              <Input
                id="reg-email"
                label="E-posta"
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="ornek@email.com"
                autoComplete="email"
              />

              <Input
                id="reg-password"
                label="Şifre"
                hint="En az 6 karakter"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="reg-school"
                  label="Üniversite"
                  value={form.school}
                  onChange={(e) => update("school", e.target.value)}
                  placeholder="Hacettepe Tıp"
                />
                <div>
                  <label htmlFor="reg-year" className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                    Sınıf
                  </label>
                  <div className="relative">
                    <select
                      id="reg-year"
                      value={form.year}
                      onChange={(e) => update("year", e.target.value)}
                      className="input-base appearance-none cursor-pointer pr-9"
                    >
                      <option value="">Seç</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}. Sınıf
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                      style={{ color: "var(--muted)" }}
                    />
                  </div>
                </div>
              </div>

              <Button id="reg-submit" type="submit" loading={loading} className="w-full" size="lg">
                {loading ? "Kaydediliyor..." : "Kayıt ol ve başla"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "var(--muted)" }}>
            Zaten hesabın var mı?{" "}
            <Link href="/login" className="font-medium hover:underline underline-offset-4" style={{ color: "var(--foreground)" }}>
              Giriş yap
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
