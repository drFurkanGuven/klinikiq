"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { communityApi, type CommunityNoteDetail } from "@/lib/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { findTopicPath, TUS_GROUP_META, type TusGroupId } from "@/lib/tus-taxonomy";
import { resolveCommunityUploadUrl } from "@/lib/communityUploadUrl";
import { isAuthenticated } from "@/lib/auth";
import { storage } from "@/lib/storage";

export default function ToplulukNotDetayPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [detail, setDetail] = useState<CommunityNoteDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErr("Geçersiz adres.");
      return;
    }
    let cancelled = false;
    (async () => {
      await storage.waitForInit();
      if (!isAuthenticated()) {
        router.replace(`/login?next=${encodeURIComponent(`/topluluk/not/${id}`)}`);
        return;
      }
      setLoading(true);
      setErr(null);
      try {
        const res = await communityApi.getNote(id);
        if (!cancelled) setDetail(res.data);
      } catch {
        if (!cancelled) setErr("Not bulunamadı veya görüntüleme yetkiniz yok.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <Loader2 className="w-10 h-10 animate-spin opacity-40" />
        <p className="text-sm font-medium opacity-60">Not yükleniyor…</p>
      </div>
    );
  }

  if (err || !detail) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <nav className="glass border-b px-4 py-4" style={{ borderColor: "var(--border)" }}>
          <Link href="/topluluk" className="text-sm font-bold inline-flex items-center gap-2" style={{ color: "var(--primary)" }}>
            <ArrowLeft className="w-4 h-4" />
            Akışa dön
          </Link>
        </nav>
        <main className="flex-1 max-w-lg mx-auto px-6 py-16 text-center">
          <p className="text-sm font-bold px-4 py-3 rounded-xl border" style={{ color: "var(--error)", borderColor: "var(--border)" }}>
            {err ?? "Yüklenemedi."}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const g = detail.group as TusGroupId;
  const path = findTopicPath(g, detail.branch_id, detail.topic_id);
  const branchLabel = path?.branch.name ?? detail.branch_id;
  const topicLabel = path?.topic.name ?? detail.topic_id;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav className="glass border-b sticky top-0 z-50 font-sans" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/topluluk" className="p-2.5 rounded-xl hover:bg-black/5 inline-flex items-center gap-2 text-sm font-bold" style={{ color: "var(--text-muted)" }}>
            <ArrowLeft className="w-5 h-5" />
            Akış
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 space-y-6">
        {detail.moderation_status === "pending" && (
          <p
            className="text-sm font-bold px-4 py-3 rounded-2xl border"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent)",
              color: "var(--text)",
            }}
          >
            Bu not henüz yönetici onayı bekliyor; onaylanana kadar topluluk akışında görünmez.
          </p>
        )}
        {detail.moderation_status === "rejected" && (
          <p
            className="text-sm font-bold px-4 py-3 rounded-2xl border"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--error) 8%, transparent)",
              color: "var(--text)",
            }}
          >
            Bu not reddedilmiş. Sahibi düzenleyerek tekrar gönderebilir.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border"
            style={{
              background: "var(--primary-light)",
              color: "var(--primary)",
              borderColor: "var(--primary-light)",
            }}
          >
            {TUS_GROUP_META[g].label}
          </span>
          <span
            className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border opacity-90"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }}
          >
            {branchLabel} · {topicLabel}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{detail.title}</h1>
        <p className="text-xs font-bold opacity-45">{detail.author_display}</p>

        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-[15px] leading-relaxed font-medium opacity-90">{detail.body}</div>

        {(detail.attachments?.length ?? 0) > 0 && (
          <div className="space-y-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-45">Ekler</p>
            <ul className="space-y-2">
              {detail.attachments!.map((a) => (
                <li key={a.id}>
                  <a
                    href={resolveCommunityUploadUrl(a.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-primary hover:underline"
                  >
                    {a.filename}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detail.is_mine && (
          <Link
            href={`/topluluk/not-duzenle?id=${encodeURIComponent(detail.id)}`}
            className="inline-block mt-4 text-sm font-black text-primary hover:underline"
          >
            Notu düzenle →
          </Link>
        )}
      </main>

      <Footer />
    </div>
  );
}
