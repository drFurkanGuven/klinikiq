"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi, type StudyNoteItem } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { LogOut, ArrowLeft, BookOpen, AlertCircle, Sparkles, Clock, Stethoscope, Bot } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function StudyNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<StudyNoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    fetchNotes();
  }, []);

  async function fetchNotes() {
    setLoading(true);
    try {
      const res = await usersApi.getStudyNotes();
      setNotes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Navbar */}
      <nav className="glass border-b sticky top-0 z-50 transition-all font-sans" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2.5 rounded-xl transition-all hover:bg-black/5 hover:scale-105 active:scale-90" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: "var(--primary)" }}>
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-lg tracking-tight block leading-tight">Hata Defterim</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-0.5">Kişisel Analiz</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <ThemeToggle />
            <div className="w-px h-6 bg-current opacity-10 hidden sm:block" />
            <button
              onClick={logout}
              className="group flex items-center gap-2 text-sm font-bold transition-all px-4 py-2.5 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        {/* Header Section */}
        <div className="mb-16 text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] shadow-sm mb-2"
            style={{ background: "var(--primary-light)", color: "var(--primary)", borderColor: "var(--primary-light)" }}>
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Spot Bilgiler
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight" style={{ color: "var(--text)" }}>Akılda <span style={{ color: "var(--primary)" }}>Kalanlar</span></h1>
          <p className="text-sm sm:text-base font-medium leading-relaxed opacity-60" style={{ color: "var(--text-muted)" }}>
            Çözdüğün vakalarda gözden kaçırdığın tanılar ve klinik spot bilgiler. TUS tekrarı için kişiselleştirilmiş mükemmel bir kaynak.
          </p>
        </div>

        {loading ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 shimmer rounded-[2rem] break-inside-avoid" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-24 rounded-[3rem] border-4 border-dashed transition-all" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <BookOpen className="w-12 h-12 opacity-10" />
            </div>
            <p className="text-2xl font-black opacity-30">Harika gidiyorsun!</p>
            <p className="mt-2 text-sm font-bold opacity-20">Hiç tanı kaçırmadığın için burada henüz bir not yok.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {notes.map((note) => (
              <div
                key={note.session_id}
                className="break-inside-avoid relative overflow-hidden rounded-[2rem] border transition-all hover:-translate-y-2 hover:shadow-2xl p-8 flex flex-col gap-6"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {/* Header Info */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm"
                      style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                      <Stethoscope className="w-3 h-3" />
                      {note.specialty}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold opacity-40 uppercase tracking-tighter" style={{ color: "var(--text-muted)" }}>
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <h3 className="font-black text-2xl leading-tight tracking-tight mb-1" style={{ color: "var(--text)" }}>
                    {note.case_title}
                  </h3>
                  <div className="h-1 w-12 rounded-full" style={{ background: "var(--primary-light)" }} />
                </div>

                {/* Missed Diagnoses Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--error)" }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Gözden Kaçan Tanılar</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {note.missed_diagnoses.map((diag, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-black px-3 py-1.5 rounded-xl border shadow-sm transition-transform hover:scale-105"
                        style={{ background: "var(--surface-2)", color: "var(--error)", borderColor: "var(--error-light)" }}
                      >
                        {diag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* TUS Reference Highlight */}
                {note.tus_reference && (
                  <div className="rounded-[1.5rem] p-5 border relative overflow-hidden group/tus shadow-md" style={{ background: "var(--bg)", borderColor: "var(--warning-light)" }}>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-400/10 blur-2xl -mr-8 -mt-8 transition-transform group-hover/tus:scale-150" />
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--warning)" }}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Klinik İnci / TUS Spotu</span>
                      </div>
                      <p className="text-sm leading-relaxed font-bold italic" style={{ color: "var(--text)" }}>
                        "{note.tus_reference}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Pathophysiology Analysis */}
                {note.pathophysiology_note && (
                  <div className="mt-2 pt-6 border-t border-dashed" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-30" style={{ color: "var(--text-muted)" }}>Patofizyoloji Özeti</div>
                    <p className="text-xs leading-relaxed font-medium opacity-70 italic" style={{ color: "var(--text-muted)" }}>
                      {note.pathophysiology_note}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
