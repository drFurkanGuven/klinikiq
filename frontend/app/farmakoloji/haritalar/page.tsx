"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import { pharmaApi, type PharmaMapSummary } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  LogOut,
  Waypoints,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function PharmaMapsListPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [maps, setMaps] = useState<PharmaMapSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji/haritalar");
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await pharmaApi.listMaps();
        setMaps(res.data);
      } catch {
        setError("Haritalar yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    })();
  }, [mounted, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0"
              style={{ color: "var(--text-muted)" }}
              aria-label="Ana sayfa"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--accent)" }}>
                <Waypoints className="w-5 h-5" style={{ color: "var(--accent-foreground)" }} />
              </div>
              <div className="min-w-0">
                <span className="font-black text-lg tracking-tight block leading-tight truncate">Mantık Haritaları</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Farmakoloji · İnteraktif</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button type="button" onClick={logout} className="group flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-black/5" style={{ color: "var(--text-muted)" }}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">İnteraktif farmakoloji mantık haritaları</h1>
          <p className="text-sm sm:text-base font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
            İlaçların mantığını reseptör → organ → etki zinciriyle görselleştirin. Bir ilaç sınıfı seçtiğinizde etkilediği
            reseptörler ve aşağı yönlü sonuçlar haritada vurgulanır.
          </p>
          <div
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--primary) 8%, transparent)",
              color: "var(--primary)",
            }}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            İçerik curated (elle doğrulanmış) statik veridir — çalışma anında üretilmez.
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border px-5 py-4 text-sm font-medium" style={{ borderColor: "var(--danger)", color: "var(--danger)", background: "var(--error-light)" }}>
            {error}
          </div>
        )}

        {!loading && !error && maps.length === 0 && (
          <p className="text-sm font-medium py-12 text-center" style={{ color: "var(--text-muted)" }}>
            Henüz harita eklenmemiş.
          </p>
        )}

        {!loading && !error && maps.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {maps.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/farmakoloji/haritalar/${m.id}`}
                  className="flex flex-col h-full rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg group"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}>
                      <Waypoints className="w-5 h-5" />
                    </div>
                    <ChevronRight className="w-5 h-5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: "var(--primary)" }} />
                  </div>
                  <h3 className="font-black text-base leading-snug mb-1" style={{ color: "var(--text)" }}>
                    {m.title_tr}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>
                    {m.description_tr}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </div>
  );
}
