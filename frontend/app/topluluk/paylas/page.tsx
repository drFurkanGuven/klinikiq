"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, PenLine, Send, CheckCircle2, LogOut, Loader2, Paperclip } from "lucide-react";

const DRAFT_KEY = "klinikiq:topluluk-not-taslak";

type DraftShape = {
  group: TusGroupId;
  branchId: string;
  topicId: string;
  title: string;
  body: string;
  savedAt?: string;
};

export default function PaylasPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [group, setGroup] = useState<TusGroupId>("temel");
  const [branchId, setBranchId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [publishWarn, setPublishWarn] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    storage.waitForInit().then(() => {
      if (!isAuthenticated()) {
        router.replace("/login?next=/topluluk/paylas");
        return;
      }
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as DraftShape;
          if (d.group === "temel" || d.group === "klinik") setGroup(d.group);
          if (typeof d.branchId === "string") setBranchId(d.branchId);
          if (typeof d.topicId === "string") setTopicId(d.topicId);
          if (typeof d.title === "string") setTitle(d.title);
          if (typeof d.body === "string") setBody(d.body);
        }
      } catch {
        /* ignore */
      }
    });
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted || done) return;
    const t = setTimeout(() => {
      try {
        const draft: DraftShape = { group, branchId, topicId, title, body };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        /* quota */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [mounted, done, group, branchId, topicId, title, body]);

  const branches = useMemo(() => getBranchesForGroup(group), [group]);
  const selectedBranch = branches.find((b) => b.id === branchId);
  const topics = selectedBranch?.topics ?? [];

  function onGroupChange(g: TusGroupId) {
    setGroup(g);
    setBranchId("");
    setTopicId("");
  }

  function apiErrMessage(err: unknown): string {
    const d = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d.map((x: { msg?: string }) => x?.msg).filter(Boolean).join(" ") || "Doğrulama hatası.";
    }
    return "Kaydedilemedi. Bağlantınızı kontrol edin.";
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

    if (pendingFiles.length > 12) {
      setError("En fazla 12 ek dosya seçebilirsin (PDF veya görsel).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await communityApi.createNote({
        group,
        branch_id: branchId,
        topic_id: topicId,
        title: title.trim(),
        body: body.trim(),
      });
      const noteId = res.data.id;
      let attachFailed = 0;
      for (const file of pendingFiles) {
        try {
          await communityApi.uploadNoteAttachment(noteId, file);
        } catch {
          attachFailed += 1;
        }
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setPendingFiles([]);
      setPublishWarn(
        attachFailed > 0
          ? `${attachFailed} ek dosya yüklenemedi; not metni yayınlandı. Notu düzenleyerek ekleri tekrar yükleyebilirsin.`
          : null,
      );
      setDone(true);
    } catch (err) {
      setError(apiErrMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav className="glass border-b sticky top-0 z-50 transition-all font-sans" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/topluluk" className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <span className="font-black text-sm sm:text-base tracking-tight block truncate">Not paylaş</span>
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
              Not yayınlandı
            </h1>
            {publishWarn && (
              <p
                className="text-sm font-bold px-4 py-3 rounded-xl border text-left"
                style={{
                  color: "var(--warning, #b45309)",
                  borderColor: "var(--border)",
                  background: "color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent)",
                }}
              >
                {publishWarn}
              </p>
            )}
            <p className="text-sm font-medium opacity-70 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Notun topluluk akışında listeleniyor. İstersen aşağıdan yeni bir not daha paylaşabilirsin.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link href="/topluluk" className="btn-premium px-8 py-3 text-xs">
                Akışa dön
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDone(false);
                  setPublishWarn(null);
                }}
                className="px-8 py-3 rounded-2xl text-xs font-black border transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                Yeni not
              </button>
            </div>
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
                  Topluluğa not
                </h1>
                <p className="text-sm font-medium opacity-60 mt-1" style={{ color: "var(--text-muted)" }}>
                  {TIP_SECTION_LABEL} → {TUS_GROUP_META[group].label} → dal → konu. Gönderince not sunucuya kaydedilir ve akışta görünür.
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
                    placeholder="Örn. Loop diüretiklerde hipokalemi"
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
                    placeholder="Özet, tablo veya hatırlatıcı maddeler…"
                    rows={12}
                    className="w-full rounded-xl border px-4 py-3 text-sm font-medium leading-relaxed outline-none focus:ring-2 resize-y min-h-[200px]"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  />
                  <p className="text-[10px] font-bold opacity-35 mt-1.5" style={{ color: "var(--text-muted)" }}>
                    {body.length} karakter · form alanları tarayıcıda taslak olarak saklanır (sayfa yenilenince)
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-45" style={{ color: "var(--text-muted)" }}>
                    Ek dosyalar (isteğe bağlı)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black cursor-pointer transition-all hover:opacity-90" style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }}>
                      <Paperclip className="w-4 h-4" />
                      PDF / görsel seç
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          const fl = e.target.files;
                          if (!fl?.length) return;
                          setPendingFiles((prev) => [...prev, ...Array.from(fl)].slice(0, 12));
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <span className="text-[10px] font-bold opacity-40">En fazla 12 · not yayından sonra da eklenebilir</span>
                  </div>
                  {pendingFiles.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-xs font-semibold text-left opacity-80">
                      {pendingFiles.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{f.name}</span>
                          <button
                            type="button"
                            className="shrink-0 text-[10px] font-black uppercase opacity-50 hover:opacity-100"
                            style={{ color: "var(--danger)" }}
                            onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                          >
                            Kaldır
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
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
                  {submitting ? "Gönderiliyor…" : "Yayınla"}
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
