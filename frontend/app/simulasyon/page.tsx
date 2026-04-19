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
  Zap,
  ChevronRight,
  Stethoscope,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";

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
    <div
      className="min-h-screen flex flex-col transition-colors"
      style={{ background: "var(--bg)", color: "var(--text)" }}
    >
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-lg tracking-tight block leading-tight truncate">
                  Simülasyon
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                  Vaka · acil · soru bankası
                </span>
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
          <h1
            className="text-xl sm:text-2xl font-black tracking-tight mb-3"
            style={{ color: "var(--text)" }}
          >
            Simülasyon merkezi
          </h1>
          <p
            className="text-sm font-medium leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Klinik vaka akışı, acil MCQ ve USMLE soru bankasına buradan geçin. Oturum raporları ve
            istatistikler hesabınıza bağlı kalır.
          </p>
        </div>

        <h2
          className="text-xs font-black uppercase tracking-widest mb-4 px-1"
          style={{ color: "var(--text-muted)" }}
        >
          Şu an
        </h2>

        <div className="flex flex-col gap-6">
          <Link href="/dashboard" className="block">
            <div
              className="group flex flex-col gap-4 rounded-3xl border p-6 sm:p-8 transition-all duration-300"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "color-mix(in srgb, var(--primary) 60%, transparent)";
                (e.currentTarget as HTMLDivElement).style.transform =
                  "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLDivElement).style.transform = "none";
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                }}
              >
                <LayoutDashboard
                  className="w-7 h-7"
                  style={{ color: "var(--primary)" }}
                />
              </div>
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--text)" }}
                >
                  Vaka simülasyonu
                </h3>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  AI destekli hasta öyküsü, tetkik ve tanı — klasik KlinikIQ deneyimi.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-auto">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  Panelden başlat
                </span>
                <ChevronRight
                  className="w-5 h-5 ml-auto opacity-40 group-hover:opacity-100 transition"
                  style={{ color: "var(--primary)" }}
                />
              </div>
            </div>
          </Link>

          <Link href="/simulasyon/acil" className="block">
            <div
              className="group flex flex-col gap-4 rounded-3xl border p-6 sm:p-8 transition-all duration-300"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "color-mix(in srgb, var(--primary) 60%, transparent)";
                (e.currentTarget as HTMLDivElement).style.transform =
                  "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLDivElement).style.transform = "none";
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                }}
              >
                <Zap className="w-7 h-7" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--text)" }}
                >
                  Acil servis — MCQ
                </h3>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  MedQA acil alt kümesi, süre baskısı ve oturum raporu ile pratik.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-auto">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  Önbellekli
                </span>
                <ChevronRight
                  className="w-5 h-5 ml-auto opacity-40 group-hover:opacity-100 transition"
                  style={{ color: "var(--primary)" }}
                />
              </div>
            </div>
          </Link>

          <Link href="/questions" className="block">
            <div
              className="group flex flex-col gap-4 rounded-3xl border p-6 sm:p-8 transition-all duration-300"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "color-mix(in srgb, var(--primary) 60%, transparent)";
                (e.currentTarget as HTMLDivElement).style.transform =
                  "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  "var(--border)";
                (e.currentTarget as HTMLDivElement).style.transform = "none";
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background:
                    "color-mix(in srgb, var(--primary) 12%, transparent)",
                }}
              >
                <BookOpen
                  className="w-7 h-7"
                  style={{ color: "var(--primary)" }}
                />
              </div>
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--text)" }}
                >
                  Soru bankası
                </h3>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  10 000+ USMLE sorusu · Vaka soruları · Branş filtreli
                </p>
              </div>
              <div className="flex items-center gap-3 mt-auto flex-wrap">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{
                    background:
                      "color-mix(in srgb, var(--primary) 10%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  USMLE Step 1 · 2&3
                </span>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{
                    background:
                      "color-mix(in srgb, var(--accent) 30%, transparent)",
                    color: "var(--text-muted)",
                  }}
                >
                  Süresiz pratik
                </span>
                <ChevronRight
                  className="w-5 h-5 ml-auto opacity-40 group-hover:opacity-100 transition shrink-0"
                  style={{ color: "var(--primary)" }}
                />
              </div>
            </div>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
