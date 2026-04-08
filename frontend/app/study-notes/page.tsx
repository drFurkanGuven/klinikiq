"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi, type StudyNoteItem } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { LogOut, ArrowLeft, BookOpen, AlertCircle, Sparkles, Clock } from "lucide-react";
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
      <nav className="glass border-b sticky top-0 z-50 transition-all" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="mr-2 transition-colors hover:scale-110 active:scale-95" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "var(--primary)" }}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block" style={{ color: "var(--text)" }}>Hata Defterim</span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg hover:bg-slate-500/10"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="mb-10 text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--text)" }}>Hata Defterim</h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Çözdüğün vakalarda gözden kaçırdığın tanılar ve bu vakalardan öğrenmen gereken klinik spot bilgiler. TUS tekrarı için mükemmel bir kaynak.
          </p>
        </div>

        {loading ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 shimmer rounded-2xl break-inside-avoid" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed" style={{ borderColor: "var(--border)" }}>
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium opacity-60" style={{ color: "var(--text-muted)" }}>Harika gidiyorsun!</p>
            <p className="mt-2 text-sm opacity-50">Hiç tanı kaçırmadığın için burada şu an not yok.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {notes.map((note) => (
              <div
                key={note.session_id}
                className="break-inside-avoid relative overflow-hidden rounded-2xl border transition-all card-hover p-6 flex flex-col gap-4 shadow-sm"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md flex items-center gap-1.5"
                      style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--primary)" }}></span>
                      {note.specialty}
                    </span>
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <h3 className="font-bold text-xl leading-tight tracking-tight" style={{ color: "var(--text)" }}>
                    {note.case_title}
                  </h3>
                </div>

                {/* Missed Diagnoses */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--error)" }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Gözden Kaçanlar</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {note.missed_diagnoses.map((diag, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg border"
                        style={{ background: "var(--surface-2)", color: "var(--error)", borderColor: "var(--error-light)" }}
                      >
                        {diag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* TUS Reference */}
                {note.tus_reference && (
                  <div className="rounded-xl p-4 border" style={{ background: "var(--surface-2)", borderColor: "var(--warning-light)" }}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: "var(--warning)" }}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>TUS Spotu</span>
                      </div>
                      <p className="text-sm leading-relaxed font-semibold italic" style={{ color: "var(--text)" }}>
                        "{note.tus_reference}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Pathophysiology */}
                {note.pathophysiology_note && (
                  <div className="mt-2 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                    <p className="text-xs leading-relaxed opacity-70" style={{ color: "var(--text-muted)" }}>
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
