"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import EmergencyMcqReportView from "@/components/EmergencyMcqReportView";
import { emergencyMcqApi, type EmergencyMcqReportOut } from "@/lib/api";
import { ArrowLeft, Loader2, LogOut, Zap } from "lucide-react";

/** Statik export (output: 'export') ile uyum için dinamik [id] yerine ?id= kullanılır. */
function AcilMcqReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id")?.trim() ?? "";
  const [mounted, setMounted] = useState(false);
  const [report, setReport] = useState<EmergencyMcqReportOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      const nextPath = id
        ? `/simulasyon/acil/rapor/?id=${encodeURIComponent(id)}`
        : "/simulasyon/acil/rapor/";
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [mounted, router, id]);

  useEffect(() => {
    if (!mounted || !isAuthenticated() || !id) return;
    void (async () => {
      try {
        const res = await emergencyMcqApi.getReport(id);
        setReport(res.data);
        setError(null);
      } catch {
        setError("Rapor yüklenemedi veya erişim yok.");
      }
    })();
  }, [mounted, id]);

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
                <span className="font-black text-lg tracking-tight block leading-tight truncate">Acil oturum raporu</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">MCQ pratik</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/simulasyon/acil/raporlar"
              className="text-xs font-bold uppercase tracking-wide opacity-70 hover:opacity-100 hidden sm:inline"
              style={{ color: "var(--text-muted)" }}
            >
              Tüm raporlar
            </Link>
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
        {!id && (
          <p className="text-sm font-medium mb-6 px-1" style={{ color: "var(--text-muted)" }}>
            Rapor kimliği yok.{" "}
            <Link href="/simulasyon/acil/raporlar" className="underline font-bold" style={{ color: "var(--primary)" }}>
              Rapor listesinden
            </Link>{" "}
            bir kayıt seçin.
          </p>
        )}
        {error && (
          <p className="text-sm font-medium mb-6 px-1" style={{ color: "var(--error, #b91c1c)" }}>
            {error}
          </p>
        )}
        {id && !report && !error && (
          <div className="flex items-center justify-center gap-2 py-20">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
            <span className="text-sm font-medium opacity-80">Yükleniyor…</span>
          </div>
        )}
        {report && <EmergencyMcqReportView report={report} />}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/simulasyon/acil"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide border"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
          >
            Acil simülasyona dön
          </Link>
          <Link
            href="/simulasyon/acil/raporlar"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold border opacity-90"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            Rapor geçmişi
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ReportFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
    </div>
  );
}

export default function AcilMcqReportPage() {
  return (
    <Suspense fallback={<ReportFallback />}>
      <AcilMcqReportContent />
    </Suspense>
  );
}
