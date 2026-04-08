"use client";
import Link from "next/link";
import { Stethoscope, Heart, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/60 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Stethoscope className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-white">KlinikIQ</span>
            </div>
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Tüm hakları saklıdır —{" "}
              <span className="text-slate-400 font-medium">Furkan Güven</span>
            </p>
          </div>

          {/* Orta: Made with love */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Tüm tıp öğrencileri için</span>
            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
            <span>ile yapıldı</span>
          </div>

          {/* Sağ: Linkler */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors cursor-pointer">Gizlilik</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors cursor-pointer">Kullanım Şartları</Link>
            <a
              href="https://github.com/drFurkanGuven"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
              aria-label="GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}
