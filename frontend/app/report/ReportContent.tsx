"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { sessionsApi, type ReportOut } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import ReportView from "@/components/ReportView";
import Footer from "@/components/Footer";
import { ArrowLeft, Home, Bot, Share2 } from "lucide-react";
import { nativeClient } from "@/lib/native";

export default function ReportPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id") || "";
  const router = useRouter();
  const [report, setReport] = useState<ReportOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) { router.replace("/login"); return; }
    fetchReport();
  }, [sessionId, mounted]);

  async function fetchReport() {
    try {
      const res = await sessionsApi.getReport(sessionId);
      setReport(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Rapor yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  const handleShare = async () => {
    nativeClient.impact();
    if (!report) return;
    const score = report.score || 0;
    const caseTitle = report.case?.title || "Vaka";
    await nativeClient.share({
      title: "KlinikIQ Başarı Raporu",
      text: `🦾 KlinikIQ'da bir vakayı daha başarıyla tamamladım!\n🎯 Vaka: ${caseTitle}\n📊 Başarı Skoru: %${score}\n🩺 Sen de hasta simülasyonu ile TUS'a hazırlan!`,
      url: window.location.href,
      dialogTitle: "Başarı Raporunu Paylaş"
    });
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="glass border-b sticky top-0 z-50 transition-all" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold transition-all hover:scale-105 px-4 py-2 rounded-2xl" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Geri</span>
          </button>
          <h1 className="font-bold text-sm uppercase tracking-widest" style={{ color: "var(--text)" }}>Vaka Raporu</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={handleShare} className="flex items-center gap-2 text-primary font-bold transition-all hover:scale-110 p-2 rounded-2xl bg-primary-light border border-primary-light">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Paylaş</span>
            </button>
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-sm font-bold transition-all hover:scale-105 px-4 py-2 rounded-2xl" style={{ color: "var(--text-muted)" }}>
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      {/* AI Disclaimer */}
      <div className="px-4 py-2.5 flex items-center gap-2 justify-center border-b" style={{ background: "var(--primary-light)", borderColor: "var(--primary-light)" }}>
        <Bot className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--primary)" }} />
        <p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: "var(--primary)" }}>
          AI Değerlendirmesi — Bu rapor GPT-4o tarafından üretilmiştir.
        </p>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 transition-colors" style={{ background: "var(--bg)" }}>
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-black" style={{ color: "var(--text)" }}>Performans Raporu</h2>
          <p className="text-sm font-medium mt-1 opacity-60" style={{ color: "var(--text-muted)" }}>AI tarafından oluşturulan detaylı klinik değerlendirme</p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 rounded-full opacity-20" style={{ borderColor: "var(--primary)" }} />
              <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--primary)" }} />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "var(--text)" }}>Rapor Hazırlanıyor</p>
              <p className="text-sm font-medium mt-1 opacity-50" style={{ color: "var(--text-muted)" }}>GPT-4o analiz yapıyor, lütfen bekleyin...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="glass rounded-2xl p-8 border border-red-500/20 text-center">
            <p className="text-red-400 font-medium">{error}</p>
            <button onClick={fetchReport} className="mt-4 text-sm text-blue-400 hover:underline">Tekrar Dene</button>
          </div>
        )}

        {report && <ReportView report={report} />}
      </main>

      <Footer />
    </div>
  );
}
