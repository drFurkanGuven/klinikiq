"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, GraduationCap, Stethoscope } from "lucide-react";
import { nativeClient } from "@/lib/native";

const OGREN_PATHS = [
  "/histology",
  "/ogrenme",
  "/farmakoloji",
  "/sinir-lezyon",
  "/study-notes",
  "/leaderboard",
];

function isOgrenPath(pathname: string, tab: string | null) {
  if (OGREN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (pathname === "/calis" && tab === "ogren") return true;
  return false;
}

const LINKS = [
  {
    href: "/calis",
    label: "Çalış",
    icon: BookOpen,
    match: (p: string, tab: string | null) =>
      (p === "/calis" || p.startsWith("/calis/")) && tab !== "ogren",
  },
  {
    href: "/vaka",
    label: "Vaka",
    icon: Stethoscope,
    match: (p: string) => p === "/vaka" || p.startsWith("/case") || p.startsWith("/report"),
  },
  {
    href: "/calis?tab=ogren",
    label: "Öğren",
    icon: GraduationCap,
    match: (p: string, tab: string | null) => isOgrenPath(p, tab),
  },
] as const;

function StudyNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{ background: "color-mix(in srgb, var(--surface) 92%, transparent)", borderColor: "var(--border)" }}
    >
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link
          href="/calis"
          className="flex items-center gap-2 font-semibold text-sm shrink-0 tracking-tight"
          style={{ color: "var(--text)" }}
          onClick={() => nativeClient.impact()}
        >
          <Stethoscope className="w-5 h-5" />
          KlinikIQ
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname, tab);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => nativeClient.impact()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--accent-foreground)" : "var(--text-muted)",
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

export function StudyNav() {
  return (
    <Suspense
      fallback={
        <header
          className="sticky top-0 z-50 border-b h-14"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        />
      }
    >
      <StudyNavInner />
    </Suspense>
  );
}
