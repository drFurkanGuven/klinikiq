"use client";

import React, { useEffect, useState } from "react";
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
  LayoutDashboard,
} from "lucide-react";

function HubCard({
  href,
  icon,
  title,
  description,
  badges,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badges: string[];
}) {
  return (
    <Link href={href} className="block group">
      <div
        className="card-hover flex flex-col gap-4 rounded-lg border p-6 sm:p-7 transition-colors"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center"
          style={{ background: "var(--surface-2)" }}
        >
          {icon}
        </div>
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {title}
          </h3>
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-auto flex-wrap">
          {badges.map((b) => (
            <span
              key={b}
              className="text-xs font-medium px-2 py-0.5 rounded-md border"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              {b}
            </span>
          ))}
          <ChevronRight
            className="w-4 h-4 ml-auto opacity-30 group-hover:opacity-70 transition-opacity shrink-0"
            style={{ color: "var(--foreground)" }}
          />
        </div>
      </div>
    </Link>
  );
}

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
        className="border-b sticky top-0 z-50"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/calis"
              className="p-2 rounded-lg transition-colors hover:bg-black/5 shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--accent)" }}
              >
                <Stethoscope className="w-5 h-5" style={{ color: "var(--accent-foreground)" }} />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-lg tracking-tight block leading-tight truncate">
                  Simülasyon
                </span>
                <span className="text-[10px] font-medium uppercase tracking-widest opacity-50">
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
              className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            Simülasyon merkezi
          </h1>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Vaka sohbeti ve gelişmiş acil modu. Günlük MCQ çalışması için{" "}
            <Link href="/calis" className="underline font-medium" style={{ color: "var(--primary)" }}>
              Çalış
            </Link>{" "}
            sayfasını kullanın.
          </p>
        </div>

        <h2 className="text-xs font-medium uppercase tracking-widest mb-3 px-1" style={{ color: "var(--muted)" }}>
          İkincil modlar
        </h2>

        <div className="flex flex-col gap-3">
          <HubCard
            href="/simulasyon/vaka"
            icon={<LayoutDashboard className="w-5 h-5" style={{ color: "var(--foreground)" }} />}
            title="Vaka simülasyonu"
            description="AI destekli hasta öyküsü, tetkik ve tanı — klasik KlinikIQ deneyimi."
            badges={["OSCE tarzı"]}
          />
          <HubCard
            href="/calis/oturum?mode=acil"
            icon={<Zap className="w-5 h-5" style={{ color: "var(--foreground)" }} />}
            title="Acil servis — MCQ (gelişmiş)"
            description="Süre baskısı, AI asistan ve oturum raporu ile acil pratik."
            badges={["Zamanlayıcı", "AI"]}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
