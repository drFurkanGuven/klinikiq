"use client";

import Link from "next/link";
import {
  Sparkles,
  PenLine,
  Microscope,
  Brain,
  Pill,
  Trophy,
  GraduationCap,
  Zap,
  ChevronRight,
} from "lucide-react";
import { nativeClient } from "@/lib/native";

const LINKS = [
  { href: "/farmakoloji/haritalar", label: "Farmakoloji", desc: "İlaç haritaları, yolak egzersizi ve quiz", icon: Pill },
  { href: "/ogrenme", label: "Vaka özetleri (havuz)", desc: "Havuzdaki vaka özetleri", icon: Sparkles },
  { href: "/study-notes", label: "Kişisel özetler", desc: "Kendi notların", icon: PenLine },
  { href: "/histology", label: "Histoloji", desc: "Mikroskop slaytları", icon: Microscope },
  { href: "/sinir-lezyon", label: "Nöro lezyon atlası", desc: "Lezyon haritaları", icon: Brain },
  { href: "/leaderboard", label: "Sıralama", desc: "Liderlik tablosu", icon: Trophy },
  { href: "/calis/oturum?mode=usmle", label: "USMLE (gelişmiş)", desc: "İngilizce soru havuzu", icon: GraduationCap },
  { href: "/simulasyon", label: "Simülasyon (acil)", desc: "Zaman baskılı acil modu", icon: Zap },
] as const;

export function CalisOgrenTab() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium mb-4" style={{ color: "var(--muted)" }}>Öğren ve pratik</p>
      {LINKS.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => nativeClient.impact()}
          className="card-hover flex items-center justify-between p-4 rounded-lg border"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <span className="flex items-center gap-3 min-w-0">
            <Icon className="w-4 h-4 shrink-0" style={{ color: "var(--foreground)" }} />
            <span className="min-w-0">
              <span className="block font-medium text-sm">{label}</span>
              <span className="block text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{desc}</span>
            </span>
          </span>
          <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
        </Link>
      ))}
    </div>
  );
}
