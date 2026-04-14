"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Stethoscope, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { isAuthenticated } from "@/lib/auth";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: isScrolled ? "rgba(var(--bg-rgb, 245, 240, 232), 0.85)" : "transparent",
        backdropFilter: isScrolled ? "blur(14px)" : "none",
        borderBottom: isScrolled ? "1px solid var(--border)" : "none",
        backgroundColor: isScrolled ? "var(--bg)" : "transparent",
        opacity: isScrolled ? 0.97 : 1,
        padding: isScrolled ? "10px 0" : "18px 0",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
            style={{ background: "var(--primary)" }}>
            <Stethoscope className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--text)" }}>
            KlinikIQ
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="#features"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            Özellikler
          </Link>
          <Link href="/leaderboard"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            Liderlik
          </Link>
          <Link href="/histology"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            Histoloji
          </Link>
          <Link href="/sinir-lezyon"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            Nöroloji
          </Link>

          <div className="w-px h-4" style={{ background: "var(--border)" }} />

          <ThemeToggle />

          {isLoggedIn ? (
            <Link href="/dashboard"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "var(--primary)" }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login"
                className="text-sm font-semibold transition-colors"
                style={{ color: "var(--text)" }}>
                Giriş Yap
              </Link>
              <Link href="/register"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
                style={{ background: "var(--primary)" }}>
                Başla
              </Link>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg" style={{ color: "var(--text-muted)" }}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 border-b p-5 flex flex-col gap-4"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          <Link href="#features" className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Özellikler</Link>
          <Link href="/leaderboard" className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Liderlik</Link>
          <Link href="/histology" className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Histoloji</Link>
          <Link href="/sinir-lezyon" className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Nöroloji</Link>
          <hr style={{ borderColor: "var(--border)" }} />
          {isLoggedIn ? (
            <Link href="/dashboard" className="py-2.5 text-center rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="py-2.5 text-center rounded-xl text-sm font-semibold border"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                Giriş Yap
              </Link>
              <Link href="/register" className="py-2.5 text-center rounded-xl text-sm font-semibold text-white"
                style={{ background: "var(--primary)" }}>
                Ücretsiz Başla
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
