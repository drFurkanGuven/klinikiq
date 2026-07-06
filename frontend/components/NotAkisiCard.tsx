"use client";

import Link from "next/link";
import { useState } from "react";
import {
  TUS_GROUP_META,
  findTopicPath,
  type TusGroupId,
} from "@/lib/tus-taxonomy";
import { communityApi, type CommunityNoteDetail, type CommunityNoteItem } from "@/lib/api";
import { resolveCommunityUploadUrl } from "@/lib/communityUploadUrl";
import {
  Heart,
  Bookmark,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
} from "lucide-react";

type Props = {
  note: CommunityNoteItem;
  formatTime: (iso: string) => string;
  onLike: (note: CommunityNoteItem) => void;
  onSave: (note: CommunityNoteItem) => void;
  likeBusy?: boolean;
  saveBusy?: boolean;
  onDelete?: (note: CommunityNoteItem) => void | Promise<void>;
  deleteBusy?: boolean;
};

export function NotAkisiCard({
  note,
  formatTime,
  onLike,
  onSave,
  likeBusy,
  saveBusy,
  onDelete,
  deleteBusy,
}: Props) {
  const g = note.group as TusGroupId;
  const path = findTopicPath(g, note.branch_id, note.topic_id);
  const branchLabel = path?.branch.name ?? note.branch_id;
  const topicLabel = path?.topic.name ?? note.topic_id;

  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<CommunityNoteDetail | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const attachments = detail?.attachments ?? note.attachments ?? [];
  const truncated =
    note.body_truncated ??
    (typeof note.excerpt === "string" && note.excerpt.endsWith("…"));

  async function showFullText() {
    if (detail) {
      setExpanded(true);
      return;
    }
    setLoadingFull(true);
    try {
      const res = await communityApi.getNote(note.id);
      setDetail(res.data);
      setExpanded(true);
    } catch {
      /* sessiz */
    } finally {
      setLoadingFull(false);
    }
  }

  const bodyText =
    expanded && detail ? detail.body : note.excerpt;
  const showExpandBtn = truncated && !expanded;

  return (
    <li
      className="rounded-[1.5rem] border p-6 md:p-8 transition-all hover:-translate-y-0.5 hover:shadow-xl"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
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
            {branchLabel}
          </span>
          <span
            className="text-[10px] font-bold px-3 py-1 rounded-full border"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            {topicLabel}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-tighter opacity-35" style={{ color: "var(--text-muted)" }}>
          {formatTime(note.created_at)}
        </span>
      </div>
      <h3 className="text-xl font-black mb-2 tracking-tight" style={{ color: "var(--text)" }}>
        {note.title}
      </h3>
      <div className="space-y-3 mb-6">
        <p className="text-sm leading-relaxed font-medium opacity-70 whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
          {bodyText}
        </p>
        {expanded && detail && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide opacity-70 hover:opacity-100"
            style={{ color: "var(--primary)" }}
          >
            <ChevronUp className="w-4 h-4" />
            Özeti göster
          </button>
        )}
        {showExpandBtn && (
          <button
            type="button"
            disabled={loadingFull}
            onClick={() => void showFullText()}
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wide rounded-xl px-3 py-2 border transition-all disabled:opacity-50"
            style={{
              borderColor: "var(--border)",
              color: "var(--primary)",
              background: "var(--surface-2)",
            }}
          >
            {loadingFull ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Tüm metni göster
          </button>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)" }}>
            Ekler ({attachments.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((a) => {
              const href = resolveCommunityUploadUrl(a.url);
              if (a.kind === "image") {
                return (
                  <a
                    key={a.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border max-w-[140px] shrink-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={href}
                      alt={a.filename}
                      className="w-full h-24 object-cover"
                      loading="lazy"
                    />
                  </a>
                );
              }
              return (
                <a
                  key={a.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold rounded-xl px-3 py-2 border max-w-full"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text)" }}
                >
                  <FileText className="w-4 h-4 shrink-0 opacity-70" />
                  <span className="truncate">{a.filename}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
      {note.is_mine && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Link
            href={`/topluluk/not-duzenle?id=${encodeURIComponent(note.id)}`}
            className="inline-flex items-center gap-1.5 text-xs font-black rounded-xl px-3 py-2 border transition-all"
            style={{ borderColor: "var(--border)", color: "var(--primary)", background: "var(--surface-2)" }}
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            Düzenle
          </Link>
          {onDelete && (
            <button
              type="button"
              disabled={Boolean(deleteBusy)}
              onClick={() => {
                if (
                  !window.confirm(
                    "Bu notu kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                  )
                ) {
                  return;
                }
                void onDelete(note);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-black rounded-xl px-3 py-2 border transition-all disabled:opacity-50"
              style={{
                borderColor: "var(--border)",
                color: "var(--danger)",
                background: "color-mix(in srgb, var(--danger) 6%, transparent)",
              }}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              {deleteBusy ? "Siliniyor…" : "Sil"}
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <span className="text-xs font-bold opacity-50" style={{ color: "var(--text-muted)" }}>
          {note.author_display}
        </span>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            disabled={Boolean(likeBusy) || note.is_mine}
            onClick={() => onLike(note)}
            className="inline-flex items-center gap-1.5 text-xs font-black rounded-xl px-3 py-2 border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: "var(--border)",
              color: note.liked_by_me ? "var(--danger)" : "var(--text-muted)",
              background: note.liked_by_me ? "color-mix(in srgb, var(--danger) 10%, transparent)" : "var(--surface-2)",
            }}
            title={note.is_mine ? "Kendi notunu beğenemezsin" : note.liked_by_me ? "Beğeniyi kaldır" : "Beğen"}
          >
            <Heart className={`w-4 h-4 shrink-0 ${note.liked_by_me ? "fill-current" : ""}`} />
            {note.likes}
          </button>
          <button
            type="button"
            disabled={Boolean(saveBusy)}
            onClick={() => onSave(note)}
            className="inline-flex items-center gap-1.5 text-xs font-black rounded-xl px-3 py-2 border transition-all"
            style={{
              borderColor: "var(--border)",
              color: note.saved_by_me ? "var(--primary)" : "var(--text-muted)",
              background: note.saved_by_me ? "var(--primary-light)" : "var(--surface-2)",
            }}
            title={note.saved_by_me ? "Kayıttan çıkar" : "Daha sonra oku için kaydet"}
          >
            <Bookmark className={`w-4 h-4 shrink-0 ${note.saved_by_me ? "fill-current" : ""}`} />
            {note.saved_by_me ? "Kayıtlı" : "Kaydet"}
          </button>
        </div>
      </div>
    </li>
  );
}
