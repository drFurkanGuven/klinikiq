"use client";

import Link from "next/link";
import { Stethoscope, Heart, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "var(--primary)" }}>
                <Stethoscope className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>KlinikIQ</span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              © {new Date().getFullYear()} Tüm hakları saklıdır —{" "}
              <span className="font-medium" style={{ color: "var(--text)" }}>Furkan Güven</span>
            </p>
          </div>

          {/* Made with love */}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Tüm tıp öğrencileri için</span>
            <Heart className="w-3 h-3 fill-current" style={{ color: "var(--danger)" }} />
            <span>ile yapıldı</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-xs flex-wrap justify-center" style={{ color: "var(--text-muted)" }}>
            <Link href="/topluluk"
              className="transition-colors hover:underline"
              style={{ color: "var(--text-muted)" }}>
              Notlar
            </Link>
            <Link href="/privacy"
              className="transition-colors hover:underline"
              style={{ color: "var(--text-muted)" }}>
              Gizlilik
            </Link>
            <Link href="/terms"
              className="transition-colors hover:underline"
              style={{ color: "var(--text-muted)" }}>
              Kullanım Şartları
            </Link>
            <a href="https://github.com/drFurkanGuven"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors"
              style={{ color: "var(--text-muted)" }}>
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
