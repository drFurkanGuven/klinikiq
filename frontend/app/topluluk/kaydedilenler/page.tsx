"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { NotAkisiCard } from "@/components/NotAkisiCard";
import { communityApi, type CommunityNoteItem } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { handleNoteLike, handleNoteSave } from "@/lib/notAkisiActions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Bookmark, LogOut, Search, BookOpen } from "lucide-react";

function formatNoteTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} gün önce`;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export default function KaydedilenlerPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [notes, setNotes] = useState<CommunityNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyLike, setBusyLike] = useState<string | null>(null);
  const [busySave, setBusySave] = useState<string | null>(null);
  const [busyDelete, setBusyDelete] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!mounted) return;
    storage.waitForInit().then(() => {
      if (!isAuthenticated()) {
        router.replace("/login?next=/topluluk/kaydedilenler");
      }
    });
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    storage.waitForInit().then(async () => {
      if (!isAuthenticated()) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await communityApi.listSavedNotes({
          q: debouncedQuery.trim() || undefined,
          limit: 80,
        });
        if (!cancelled) setNotes(res.data);
      } catch (e: unknown) {
        const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        if (!cancelled) {
          setErr(typeof detail === "string" ? detail : "Liste yüklenemedi.");
          setNotes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, debouncedQuery]);

  async function onLike(note: CommunityNoteItem) {
    setBusyLike(note.id);
    try {
      await handleNoteLike(note, setNotes, router, "/topluluk/kaydedilenler");
    } finally {
      setBusyLike(null);
    }
  }

  async function onSave(note: CommunityNoteItem) {
    setBusySave(note.id);
    try {
      await handleNoteSave(note, setNotes, router, "/topluluk/kaydedilenler", { removeWhenUnsaved: true });
    } finally {
      setBusySave(null);
    }
  }

  async function onDeleteNote(note: CommunityNoteItem) {
    setBusyDelete(note.id);
    try {
      await communityApi.deleteNote(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      window.alert(typeof detail === "string" ? detail : "Not silinemedi.");
    } finally {
      setBusyDelete(null);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav className="glass border-b sticky top-0 z-50 font-sans" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/topluluk" className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Bookmark className="w-5 h-5 shrink-0" style={{ color: "var(--primary)" }} />
            <div className="min-w-0">
              <span className="font-black text-sm sm:text-base tracking-tight block truncate">Kaydedilenler</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Sadece senin listen</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-bold px-2 py-2 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        <p className="text-sm font-medium opacity-60 mb-6 max-w-xl" style={{ color: "var(--text-muted)" }}>
          Burada yalnızca senin &quot;Kaydet&quot; dediğin notlar listelenir. Başkaları bu listeyi göremez.
        </p>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-35" style={{ color: "var(--text-muted)" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kayıtlı notlarda ara…"
            className="w-full rounded-xl border pl-11 pr-4 py-3 text-sm font-medium outline-none focus:ring-2"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        </div>

        {err && (
          <p className="text-sm font-bold px-4 py-3 rounded-xl border mb-6" style={{ color: "var(--error)", borderColor: "var(--error-light)", background: "color-mix(in srgb, var(--error) 8%, transparent)" }}>
            {err}
          </p>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 shimmer rounded-[1.5rem] border" style={{ borderColor: "var(--border)" }} />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-[2rem] border-2 border-dashed py-16 text-center px-6" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-black opacity-50" style={{ color: "var(--text)" }}>
              Henüz kayıtlı not yok
            </p>
            <Link href="/topluluk" className="inline-block mt-4 text-sm font-black" style={{ color: "var(--primary)" }}>
              Akışa dön →
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {notes.map((note) => (
              <NotAkisiCard
                key={note.id}
                note={note}
                formatTime={formatNoteTime}
                onLike={onLike}
                onSave={onSave}
                likeBusy={busyLike === note.id}
                saveBusy={busySave === note.id}
                onDelete={onDeleteNote}
                deleteBusy={busyDelete === note.id}
              />
            ))}
          </ul>
        )}
      </main>

      <Footer />
    </div>
  );
}
