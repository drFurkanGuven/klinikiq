"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, LogOut, Zap, ChevronRight, Clock, Stethoscope } from "lucide-react";

export default function SimulasyonHubPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/simulasyon");
    }
  }, [mounted, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/dashboard" className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0" style={{ background: "var(--primary)" }}>
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-lg tracking-tight block leading-tight truncate">Simülasyon</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Acil vaka · ayrı modül</span>
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
        <div
          className="rounded-3xl border p-6 sm:p-8 mb-8"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h1 className="text-xl sm:text-2xl font-black tracking-tight mb-3" style={{ color: "var(--text)" }}>
            Acil vaka simülatörü
          </h1>
          <p className="text-sm font-medium leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
            Bu başlık <strong style={{ color: "var(--text)" }}>farmakolojiden ayrıdır</strong>. Hedef: acil veri seti, süre baskısı, yalnızca acilde yapılabilecek
            tetkikler ve doğru triyaj / yönlendirme değerlendirmesi. Ana paneldeki klasik AI vaka akışını değiştirmez.
          </p>
          <ul className="text-xs sm:text-sm font-medium space-y-2 mb-0" style={{ color: "var(--text-muted)" }}>
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
              <span>
                Simüle süre: acil MCQ sayfasında <strong style={{ color: "var(--text)" }}>8 dk</strong> geri sayım ve çubuk; tam simülatörde tetkik süreleri eklenecek.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
              <span>Planlanan: ED menüsü (sadece acil uygun tetkikler).</span>
            </li>
          </ul>
        </div>

        <h2 className="text-xs font-black uppercase tracking-widest mb-4 px-1" style={{ color: "var(--text-muted)" }}>
          Şu an
        </h2>
        <Link
          href="/simulasyon/acil"
          className="flex items-center gap-4 rounded-3xl border p-6 sm:p-8 mb-6 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl group"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
          >
            <Zap className="w-7 h-7" style={{ color: "var(--primary)" }} />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-lg font-black tracking-tight" style={{ color: "var(--text)" }}>
              Acil — çoktan seçmeli pratik (önbellek)
            </h3>
            <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
              MedQA acil filtresiyle soru çözümü; çok soruluk <strong style={{ color: "var(--text)" }}>oturum raporu</strong> (AI özet, kayıtlı) ile klasik vaka raporuna benzer geri bildirim.
            </p>
          </div>
          <ChevronRight className="w-6 h-6 shrink-0 opacity-40 group-hover:opacity-100 transition" style={{ color: "var(--primary)" }} />
        </Link>

        <p className="text-xs font-medium px-1" style={{ color: "var(--text-muted)" }}>
          Klasik vaka oturumları: <Link href="/dashboard" className="underline underline-offset-2 font-bold">Panel</Link> → Vaka başlat.
        </p>
      </main>

      <Footer />
    </div>
  );
}
