"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi, type StudyNoteItem } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { LogOut, ArrowLeft, BookOpen, AlertCircle, Sparkles, Clock } from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen flex flex-col bg-[#0b1120]">
      {/* Navbar */}
      <nav className="glass border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="mr-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg hidden sm:block">Cep Notlarım</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="mb-8 text-center space-y-2 max-w-2xl mx-auto">
          <h1 className="text-3xl font-black text-white">Hata Defterim</h1>
          <p className="text-slate-400 text-sm">
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
          <div className="text-center py-20 text-slate-500">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-300">Harika gidiyorsun!</p>
            <p className="mt-2 text-sm">Hiç tanı kaçırmadığın için burada şu an not yok.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {notes.map((note) => (
              <div
                key={note.session_id}
                className="break-inside-avoid relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/20 p-5 flex flex-col gap-4 hover:border-indigo-500/30 transition-colors group"
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded pl-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {note.specialty}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-lg leading-tight group-hover:text-indigo-300 transition-colors">
                    {note.case_title}
                  </h3>
                </div>

                {/* Missed Diagnoses */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Gözden Kaçanlar</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {note.missed_diagnoses.map((diag, i) => (
                      <span
                        key={i}
                        className="text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-1 rounded-md"
                      >
                        {diag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* TUS Reference */}
                {note.tus_reference && (
                  <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/10">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>TUS Spotu</span>
                      </div>
                      <p className="text-sm text-amber-50/90 leading-relaxed font-medium">
                        {note.tus_reference}
                      </p>
                    </div>
                  </div>
                )}

                {/* Pathophysiology */}
                {note.pathophysiology_note && (
                  <div className="mt-2 pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-400 leading-relaxed">
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
