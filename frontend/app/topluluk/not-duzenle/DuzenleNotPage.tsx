"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  TIP_SECTION_LABEL,
  TUS_GROUP_META,
  type TusGroupId,
  getBranchesForGroup,
  findTopicPath,
} from "@/lib/tus-taxonomy";
import { isAuthenticated, logout } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { communityApi } from "@/lib/api";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, PenLine, Send, CheckCircle2, LogOut, Loader2 } from "lucide-react";

function apiErrMessage(err: unknown): string {
  const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d.map((x: { msg?: string }) => x?.msg).filter(Boolean).join(" ") || "Doğrulama hatası.";
  }
  return "Kaydedilemedi. Bağlantınızı kontrol edin.";
}

export default function DuzenleNotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("id")?.trim() ?? "";

  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingNote, setLoadingNote] = useState(true);

  const [group, setGroup] = useState<TusGroupId>("temel");
  const [branchId, setBranchId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!noteId) {
      setLoadingNote(false);
      return;
    }
    let cancelled = false;
    (async () => {
      await storage.waitForInit();
      if (cancelled) return;
      if (!isAuthenticated()) {
        setLoadingNote(false);
        const next = `/topluluk/not-duzenle?id=${encodeURIComponent(noteId)}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setLoadingNote(true);
      setLoadError(null);
      try {
        const res = await communityApi.getNote(noteId);
        if (cancelled) return;
        const n = res.data;
        if (!n.is_mine) {
          router.replace("/topluluk");
          return;
        }
        setGroup(n.group);
        setBranchId(n.branch_id);
        setTopicId(n.topic_id);
        setTitle(n.title);
        setBody(n.body);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (cancelled) return;
        if (status === 404) {
          setLoadError("Not bulunamadı veya kaldırılmış.");
        } else {
          setLoadError(apiErrMessage(err));
        }
      } finally {
        if (!cancelled) setLoadingNote(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, noteId, router]);

  const branches = useMemo(() => getBranchesForGroup(group), [group]);
  const selectedBranch = branches.find((b) => b.id === branchId);
  const topics = selectedBranch?.topics ?? [];

  function onGroupChange(g: TusGroupId) {
    setGroup(g);
    setBranchId("");
    setTopicId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!branchId || !topicId) {
      setError("Dal ve konu seçimi zorunludur.");
      return;
    }
    const path = findTopicPath(group, branchId, topicId);
    if (!path) {
      setError("Seçilen konu geçersiz. Lütfen tekrar seçin.");
      return;
    }
    if (!title.trim()) {
      setError("Başlık girin.");
      return;
    }
    if (body.trim().length < 20) {
      setError("Not metni en az 20 karakter olsun.");
      return;
    }

    setSubmitting(true);
    try {
      await communityApi.updateNote(noteId, {
        group,
        branch_id: branchId,
        topic_id: topicId,
        title: title.trim(),
        body: body.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(apiErrMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  if (!noteId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <p className="font-bold">Geçersiz adres — not kimliği eksik.</p>
      </div>
    );
  }

  if (loadingNote) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <Loader2 className="w-10 h-10 animate-spin opacity-40" />
        <p className="text-sm font-medium opacity-60">Not yükleniyor…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <nav className="glass border-b px-4 py-4" style={{ borderColor: "var(--border)" }}>
          <Link href="/topluluk" className="text-sm font-bold inline-flex items-center gap-2" style={{ color: "var(--primary)" }}>
            <ArrowLeft className="w-4 h-4" />
            Akışa dön
          </Link>
        </nav>
        <main className="flex-1 max-w-lg mx-auto px-6 py-16 text-center">
          <p className="text-sm font-bold px-4 py-3 rounded-xl border" style={{ color: "var(--error)", borderColor: "var(--error-light)", background: "color-mix(in srgb, var(--error) 8%, transparent)" }}>
            {loadError}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav className="glass border-b sticky top-0 z-50 transition-all font-sans" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/topluluk" className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <span className="font-black text-sm sm:text-base tracking-tight block truncate">Notu düzenle</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{TIP_SECTION_LABEL}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold px-2 py-2 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">
        {done ? (
          <div
            className="rounded-[2rem] border p-8 sm:p-10 text-center space-y-4"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color: "var(--success)" }} />
            <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>
              Not güncellendi
            </h1>
            <p className="text-sm font-medium opacity-70 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Değişiklikler kaydedildi. Akışta güncel hâliyle görünür.
            </p>
            <Link href="/topluluk" className="btn-premium inline-block px-8 py-3 text-xs mt-4">
              Akışa dön
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                style={{ background: "var(--primary)" }}
              >
                <PenLine className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                  Notu düzenle
                </h1>
                <p className="text-sm font-medium opacity-60 mt-1" style={{ color: "var(--text-muted)" }}>
                  Sınıflandırma, başlık veya metni değiştirebilirsin. Kaydettiğinde akışta güncellenir.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                className="rounded-[1.75rem] border p-6 sm:p-8 space-y-5"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div className="flex flex-wrap gap-2">
                  {(["temel", "klinik"] as const).map((g) => {
                    const active = group === g;
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
                        }}
                      >
                        {TUS_GROUP_META[g].label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-45" style={{ color: "var(--text-muted)" }}>
                      Dal *
                    </label>
                    <select
                      required
                      value={branchId}
                      onChange={(e) => {
                        setBranchId(e.target.value);
                        setTopicId("");
                      }}
                      className="w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      <option value="">Seçin</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-45" style={{ color: "var(--text-muted)" }}>
                      Konu *
                    </label>
                    <select
                      required
                      value={topicId}
                      onChange={(e) => setTopicId(e.target.value)}
                      disabled={!branchId}
                      className="w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2 disabled:opacity-40"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      <option value="">{branchId ? "Konu seçin" : "Önce dal seçin"}</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-45" style={{ color: "var(--text-muted)" }}>
                    Başlık *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Başlık"
                    maxLength={200}
                    className="w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-45" style={{ color: "var(--text-muted)" }}>
                    Not metni *
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Not metni…"
                    rows={12}
                    className="w-full rounded-xl border px-4 py-3 text-sm font-medium leading-relaxed outline-none focus:ring-2 resize-y min-h-[200px]"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <p className="text-[10px] font-bold opacity-35 mt-1.5" style={{ color: "var(--text-muted)" }}>
                    {body.length} karakter
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm font-bold px-4 py-3 rounded-xl border" style={{ color: "var(--error)", borderColor: "var(--error-light)", background: "color-mix(in srgb, var(--error) 8%, transparent)" }}>
                  {error}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <Link href="/topluluk" className="text-sm font-bold opacity-50 hover:opacity-100 transition-opacity text-center sm:text-left" style={{ color: "var(--text-muted)" }}>
                  İptal — akışa dön
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-premium px-8 py-3.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
