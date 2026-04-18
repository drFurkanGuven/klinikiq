"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { emergencyMcqApi, type EmergencyMcqReportListItem } from "@/lib/api";
import { ArrowLeft, ChevronRight, FileText, Loader2, LogOut, Zap } from "lucide-react";

export default function AcilMcqReportListPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<EmergencyMcqReportListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/simulasyon/acil/raporlar");
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    void (async () => {
      try {
        const res = await emergencyMcqApi.listReports(50);
        setItems(res.data);
        setError(null);
      } catch {
        setError("Liste yüklenemedi.");
        setItems([]);
      }
    })();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/simulasyon/acil" className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0" style={{ background: "var(--primary)" }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-lg tracking-tight block leading-tight truncate">Acil raporlar</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Oturum geçmişi</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="group flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <p className="text-xs font-medium mb-6 px-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Kayıtlı <strong style={{ color: "var(--text)" }}>acil MCQ oturum</strong> raporlarınız. Klasik vaka simülasyonu raporları paneldeki vaka geçmişindedir.
        </p>

        {error && (
          <p className="text-sm font-medium mb-4" style={{ color: "var(--error, #b91c1c)" }}>
            {error}
          </p>
        )}

        {items === null && (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        )}

        {items && items.length === 0 && (
          <p className="text-sm font-medium opacity-70 py-8">Henüz kayıtlı rapor yok. Acil simülasyonda soru çözüp &quot;Oturum raporu oluştur&quot; ile kaydedin.</p>
        )}

        {items && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/simulasyon/acil/rapor/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 shrink-0 opacity-60" style={{ color: "var(--primary)" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate" style={{ color: "var(--text)" }}>
                        Skor {Math.round(r.score)} · {r.correct_count}/{r.total_count} doğru
                      </p>
                      <p className="text-[11px] font-medium opacity-60">
                        {new Date(r.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 shrink-0 opacity-40" />
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
