"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Stethoscope, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { isAuthenticated } from "@/lib/auth";

const navLinkClass =
  "text-sm font-medium text-muted hover:text-foreground transition-colors";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileMenuOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-[background,border-color] duration-200 ${
        isScrolled ? "glass" : "border-b border-transparent"
      }`}
      style={{
        paddingTop: `calc(0.75rem + var(--safe-top, 0px))`,
        paddingBottom: "0.75rem",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center transition-opacity group-hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            <Stethoscope className="w-4 h-4" style={{ color: "var(--accent-foreground)" }} />
          </div>
          <span
            className="text-base font-semibold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            KlinikIQ
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-5">
          <Link href="#features" className={navLinkClass}>
            Özellikler
          </Link>
          <Link href="/leaderboard" className={navLinkClass}>
            Liderlik
          </Link>
          <Link href="/histology" className={navLinkClass}>
            Histoloji
          </Link>
          <Link href="/sinir-lezyon" className={navLinkClass}>
            Nöroloji
          </Link>

          <div
            className="w-px h-4"
            style={{ background: "var(--border)" }}
            aria-hidden
          />

          <ThemeToggle />

          {isLoggedIn ? (
            <Link href="/dashboard" className="btn-primary text-sm px-4 py-2">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={navLinkClass}>
                Giriş
              </Link>
              <Link href="/register" className="btn-primary text-sm px-4 py-2">
                Başla
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md border transition-colors hover:bg-surface-muted"
            style={{
              color: "var(--muted)",
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="md:hidden border-b px-4 sm:px-6 py-4 flex flex-col gap-3"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <Link
            href="#features"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Özellikler
          </Link>
          <Link
            href="/leaderboard"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Liderlik
          </Link>
          <Link
            href="/histology"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Histoloji
          </Link>
          <Link
            href="/sinir-lezyon"
            className={navLinkClass}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Nöroloji
          </Link>
          <hr style={{ borderColor: "var(--border)" }} />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="btn-primary text-sm py-2.5 text-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/login"
                className="btn-secondary text-sm py-2.5 text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Giriş yap
              </Link>
              <Link
                href="/register"
                className="btn-primary text-sm py-2.5 text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Ücretsiz başla
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
