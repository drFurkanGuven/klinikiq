"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FlaskConical, Activity, User, Stethoscope } from "lucide-react";
import { nativeClient } from "@/lib/native";

const LINKS = [
  { href: "/calis", label: "Çalış", icon: BookOpen },
  { href: "/farmakoloji/haritalar", label: "Haritalar", icon: FlaskConical },
  { href: "/simulasyon", label: "Simülasyon", icon: Activity },
  { href: "/dashboard", label: "Profil", icon: User },
] as const;

export function StudyNav() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ background: "color-mix(in srgb, var(--surface) 92%, transparent)", borderColor: "var(--border)" }}
    >
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link
          href="/calis"
          className="flex items-center gap-2 font-black text-sm shrink-0"
          style={{ color: "var(--primary)" }}
          onClick={() => nativeClient.impact()}
        >
          <Stethoscope className="w-5 h-5" />
          KlinikIQ
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/calis" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => nativeClient.impact()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors"
                style={{
                  background: active ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "transparent",
                  color: active ? "var(--primary)" : "var(--text-muted)",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
