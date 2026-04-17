"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { NotAkisiCard } from "@/components/NotAkisiCard";
import {
  TIP_SECTION_LABEL,
  TUS_GROUP_META,
  type TusGroupId,
  getBranchesForGroup,
} from "@/lib/tus-taxonomy";
import { communityApi, type CommunityNoteItem } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { handleNoteLike, handleNoteSave } from "@/lib/notAkisiActions";
import { Users, Search, Filter, BookOpen, PenLine, Bookmark } from "lucide-react";
import Link from "next/link";

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

export default function ToplulukPage() {
  const router = useRouter();
  const [group, setGroup] = useState<TusGroupId>("temel");
  const [branchId, setBranchId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [notes, setNotes] = useState<CommunityNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [busyLike, setBusyLike] = useState<string | null>(null);
  const [busySave, setBusySave] = useState<string | null>(null);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await communityApi.listNotes({
          group,
          branch_id: branchId || undefined,
          topic_id: topicId || undefined,
          q: debouncedQuery.trim() || undefined,
          limit: 50,
        });
        if (!cancelled) setNotes(res.data);
      } catch (e: unknown) {
        const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        if (!cancelled) {
          setFetchError(typeof detail === "string" ? detail : "Notlar yüklenemedi. Backend çalışıyor mu?");
          setNotes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [group, branchId, topicId, debouncedQuery]);

  const branches = useMemo(() => getBranchesForGroup(group), [group]);

  function onGroupChange(g: TusGroupId) {
    setGroup(g);
    setBranchId("");
    setTopicId("");
  }

  const selectedBranch = branches.find((b) => b.id === branchId);
  const topics = selectedBranch?.topics ?? [];

  async function onLike(note: CommunityNoteItem) {
    setBusyLike(note.id);
    try {
      await handleNoteLike(note, setNotes, router, "/topluluk");
    } finally {
      setBusyLike(null);
    }
  }

  async function onSave(note: CommunityNoteItem) {
    setBusySave(note.id);
    try {
      await handleNoteSave(note, setNotes, router, "/topluluk");
    } finally {
      setBusySave(null);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg transition-colors">
      <Navbar />

      <main className="flex-grow pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="text-center lg:text-left space-y-4 flex-1">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
                style={{
                  background: "var(--primary-light)",
                  color: "var(--primary)",
                  borderColor: "var(--primary-light)",
                }}
              >
                <Users className="w-3.5 h-3.5" />
                {TIP_SECTION_LABEL}
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                Not <span style={{ color: "var(--primary)" }}>akışı</span>
              </h1>
              <p className="max-w-2xl mx-auto lg:mx-0 text-sm md:text-base font-medium leading-relaxed opacity-65" style={{ color: "var(--text-muted)" }}>
                Herkes paylaşılan notları görür. Beğeni sayısı herkese açıktır. Kaydet düğmesi sadece sana özel listene ekler.
                {!loggedIn && " Beğenmek ve kaydetmek için giriş yap."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-center lg:self-end">
              {loggedIn && (
                <Link
                  href="/topluluk/kaydedilenler"
                  className="px-6 py-3.5 rounded-2xl text-xs font-black border inline-flex items-center justify-center gap-2 transition-all"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                >
                  <Bookmark className="w-4 h-4" />
                  Kaydedilenler
                </Link>
              )}
              <Link href="/topluluk/paylas" className="btn-premium px-8 py-4 text-xs inline-flex items-center justify-center gap-2">
                <PenLine className="w-4 h-4" />
                Not paylaş
              </Link>
            </div>
          </div>

          <div
            className="rounded-[1.75rem] border p-6 md:p-8 mb-10 shadow-lg"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <Filter className="w-4 h-4 opacity-50" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs font-black uppercase tracking-widest opacity-50" style={{ color: "var(--text-muted)" }}>
                Sınıflandırma
              </span>
            </div>

            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-2">
                {(["temel", "klinik"] as const).map((g) => {
                  const active = group === g;
                  const meta = TUS_GROUP_META[g];
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => onGroupChange(g)}
                      className="px-4 py-2.5 rounded-2xl text-sm font-black transition-all border"
                      style={{
                        background: active ? "var(--primary)" : "var(--surface-2)",
                        color: active ? "#fff" : "var(--text)",
                        borderColor: active ? "var(--primary)" : "var(--border)",
                        boxShadow: active ? "0 8px 24px rgba(0,0,0,0.12)" : "none",
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-medium opacity-55 -mt-2" style={{ color: "var(--text-muted)" }}>
                {TUS_GROUP_META[group].description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-45" style={{ color: "var(--text-muted)" }}>
                    Dal
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => {
                      setBranchId(e.target.value);
                      setTopicId("");
                    }}
                    className="w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2 transition-all"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="">Tüm dallar</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-45" style={{ color: "var(--text-muted)" }}>
                    Konu
                  </label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    disabled={!branchId}
                    className="w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2 transition-all disabled:opacity-40"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    <option value="">{branchId ? "Tüm konular (bu dalda)" : "Önce dal seçin"}</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-35" style={{ color: "var(--text-muted)" }} />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Başlık veya içerik ara…"
                  className="w-full rounded-xl border pl-11 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 transition-all"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-black" style={{ color: "var(--text)" }}>
                Notlar
              </h2>
              <span className="text-xs font-bold opacity-45" style={{ color: "var(--text-muted)" }}>
                {loading ? "Yükleniyor…" : `${notes.length} sonuç`}
              </span>
            </div>

            {fetchError && (
              <p className="text-sm font-bold px-4 py-3 rounded-xl border" style={{ color: "var(--error)", borderColor: "var(--error-light)", background: "color-mix(in srgb, var(--error) 8%, transparent)" }}>
                {fetchError}
              </p>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 shimmer rounded-[1.5rem] border" style={{ borderColor: "var(--border)" }} />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div
                className="rounded-[2rem] border-2 border-dashed py-20 text-center px-6"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-black text-lg opacity-40" style={{ color: "var(--text)" }}>
                  Henüz not yok veya filtreye uygun sonuç yok
                </p>
                <p className="text-sm font-medium opacity-35 mt-2 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
                  Filtreyi genişlet veya ilk notu sen paylaş.
                </p>
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
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
