"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { sessionsApi, type ReportOut } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import ReportView from "@/components/ReportView";
import Footer from "@/components/Footer";
import { ArrowLeft, Home, Bot } from "lucide-react";

export default function ReportPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<ReportOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    fetchReport();
  }, [sessionId]);

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="glass border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Geri</span>
          </button>
          <h1 className="font-semibold text-white text-sm">Vaka Raporu</h1>
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </div>
      </nav>

      {/* AI Disclaimer */}
      <div className="bg-blue-500/5 border-b border-blue-500/10 px-4 py-2 flex items-center gap-2">
        <Bot className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <p className="text-xs text-slate-500">
          <span className="text-blue-400">AI Değerlendirmesi</span>
          {" "}— Bu rapor GPT-4o tarafından üretilmiştir. Akademik referans olarak kullanmayın.
        </p>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Performans Raporu</h2>
          <p className="text-slate-400 text-sm mt-1">AI tarafından oluşturulan detaylı klinik değerlendirme</p>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-blue-500/20 rounded-full" />
              <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Rapor Hazırlanıyor</p>
              <p className="text-slate-400 text-sm mt-1">GPT-4o analiz yapıyor, lütfen bekleyin...</p>
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
