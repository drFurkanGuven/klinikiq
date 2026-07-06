"use client";

import Link from "next/link";
import {
  Stethoscope,
  ExternalLink,
  BookOpen,
  LifeBuoy,
  Trash2,
} from "lucide-react";

const footerLinkClass =
  "inline-flex items-center gap-1 text-sm transition-colors hover:text-foreground";

export default function Footer() {
  return (
    <footer
      className="mt-auto border-t pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={{
        borderColor: "var(--border)",
        background: "var(--background)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "var(--accent)" }}
              >
                <Stethoscope className="w-3.5 h-3.5 text-white" />
              </div>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--foreground)" }}
              >
                KlinikIQ
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              © {new Date().getFullYear()} Furkan Güven
            </p>
          </div>

          <nav
            className="flex items-center gap-x-4 gap-y-2 text-sm flex-wrap justify-center"
            style={{ color: "var(--muted)" }}
            aria-label="Alt bilgi"
          >
            <Link href="/ogrenme" className={footerLinkClass}>
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              Vaka özetleri
            </Link>
            <Link href="/destek" className={footerLinkClass}>
              <LifeBuoy className="w-3.5 h-3.5 shrink-0" />
              Destek
            </Link>
            <Link href="/privacy" className={footerLinkClass}>
              Gizlilik
            </Link>
            <Link href="/terms" className={footerLinkClass}>
              Kullanım şartları
            </Link>
            <Link href="/delete-account" className={footerLinkClass}>
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              Hesap silme
            </Link>
            <a
              href="https://github.com/drFurkanGuven"
              target="_blank"
              rel="noopener noreferrer"
              className={footerLinkClass}
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
