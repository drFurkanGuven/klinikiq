"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  LogOut,
  Pill,
  FlaskConical,
  Activity,
  Syringe,
  HeartPulse,
  Shield,
  BookOpen,
  Sparkles,
  ChevronRight,
  Layers,
  GitCompare,
} from "lucide-react";

const UNITS = [
  {
    icon: Activity,
    title: "Farmakokinetik",
    desc: "Emilim, dağılım, metabolizma ve eliminasyon (ADME); biyoyararlanım, yarı ömür, doz aralığı ve kinetik eğriler.",
  },
  {
    icon: FlaskConical,
    title: "Farmakodinami",
    desc: "Doz-etki ilişkisi, agonist/antagonist kavramları, tolerans ve duyarlılık; terapötik ve toksik doz aralıkları.",
  },
  {
    icon: Pill,
    title: "Reseptörler ve sinyal yolu",
    desc: "G protein bağlı reseptörler, iyon kanalları, enzim bağlı hedefler; ilaçların seçici ve yan etki profilleri.",
  },
  {
    icon: Syringe,
    title: "İlaç grupları (özet)",
    desc: "Analjezikler, antimikrobiyaller, kardiyovasküler ve santral sinir sistemi ilaçları gibi başlıklar; TUS müfredatıyla paralel çalışma.",
  },
  {
    icon: HeartPulse,
    title: "Klinik farmakoloji",
    desc: "Etkileşimler, kontrendikasyonlar, gebelik/emzirme ve doz ayarlama (böbrek/karaciğer yetmezliği).",
  },
  {
    icon: Shield,
    title: "Güvenlilik",
    desc: "Yan etkiler, advers reaksiyon raporlama ve akılcı ilaç kullanımına giriş.",
  },
] as const;

export default function FarmakolojiPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji");
    }
  }, [mounted, router]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
                style={{ background: "var(--primary)" }}
              >
                <Pill className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-lg tracking-tight block leading-tight truncate">Farmakoloji</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">TUS · Temel bilimler</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <ThemeToggle />
            <div className="w-px h-6 bg-current opacity-10 hidden sm:block" />
            <button
              type="button"
              onClick={logout}
              className="group flex items-center gap-2 text-sm font-bold transition-all px-3 sm:px-4 py-2.5 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <div
          className="rounded-3xl border p-6 sm:p-10 mb-10 shadow-xl"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "color-mix(in srgb, var(--primary) 18%, transparent)" }}
            >
              <BookOpen className="w-7 h-7" style={{ color: "var(--primary)" }} />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                Farmakoloji çalışma alanı
              </h1>
              <p className="text-sm sm:text-base font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Konu özeti ve müfredat çerçevesi aşağıda. Onaylı ilaç verisi (DrugBank), endikasyon ve farmakoloji alanları için{" "}
                <Link href="/farmakoloji/ilaclar" className="font-bold underline" style={{ color: "var(--primary)" }}>
                  İlaç Rehberi
                </Link>
                {" "}
                sayfasını kullanın.
              </p>
              <div
                className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border"
                style={{
                  borderColor: "var(--border)",
                  background: "color-mix(in srgb, var(--primary) 8%, transparent)",
                  color: "var(--primary)",
                }}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                İleride flashcard ve soru setleri bu başlıklara bağlanabilir.
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-xs font-black uppercase tracking-widest mb-4 px-1" style={{ color: "var(--text-muted)" }}>
          Müfredat çerçevesi
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {UNITS.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
                <div className="space-y-2 min-w-0">
                  <h3 className="font-black text-base leading-snug" style={{ color: "var(--text)" }}>
                    {title}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {desc}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <h2 className="text-xs font-black uppercase tracking-widest mb-4 mt-12 px-1" style={{ color: "var(--text-muted)" }}>
          Araçlar
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 mb-10">
          <li>
            <Link
              href="/farmakoloji/ilaclar"
              className="flex items-start gap-3 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg h-full group"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Pill className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-base leading-snug" style={{ color: "var(--text)" }}>
                    İlaç Rehberi
                  </h3>
                  <ChevronRight className="w-5 h-5 shrink-0 opacity-40 group-hover:opacity-100" style={{ color: "var(--primary)" }} />
                </div>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  DrugBank verisiyle 2.700+ onaylı ilaç; mekanizma, endikasyon, PK.
                </p>
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/farmakoloji/siniflar"
              className="flex items-start gap-3 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg h-full group"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Layers className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-base leading-snug" style={{ color: "var(--text)" }}>
                    ATC Sınıflandırması
                  </h3>
                  <ChevronRight className="w-5 h-5 shrink-0 opacity-40 group-hover:opacity-100" style={{ color: "var(--primary)" }} />
                </div>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  İlaçları terapötik sınıflarına göre incele ve karşılaştır.
                </p>
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/farmakoloji/karsilastir"
              className="flex items-start gap-3 rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg h-full group"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <GitCompare className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-black text-base leading-snug" style={{ color: "var(--text)" }}>
                    İlaç Karşılaştırma
                  </h3>
                  <ChevronRight className="w-5 h-5 shrink-0 opacity-40 group-hover:opacity-100" style={{ color: "var(--primary)" }} />
                </div>
                <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Aynı sınıftaki ilaçları yan yana: PK, yan etki, etkileşim.
                </p>
              </div>
            </Link>
          </li>
          <li>
            <div
              className="rounded-2xl border p-5 h-full cursor-not-allowed relative opacity-60"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                Yakında
              </span>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
                <div className="space-y-2 min-w-0">
                  <h3 className="font-black text-base leading-snug" style={{ color: "var(--text)" }}>
                    Antibiyotik Rehberi
                  </h3>
                  <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    CARD verisiyle organizma → antibiyotik spektrumu ve direnç.
                  </p>
                </div>
              </div>
            </div>
          </li>
        </ul>

        <div
          className="mt-10 rounded-2xl border px-5 py-4 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <strong style={{ color: "var(--text)" }}>Not:</strong> Tıbbi tedavi kararları bu uygulamadan verilmez; yalnızca eğitim
          amaçlı özet bilgi sunulur.
        </div>
      </main>

      <Footer />
    </div>
  );
}
