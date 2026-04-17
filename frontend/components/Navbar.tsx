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
        paddingTop: `calc(${isScrolled ? "10px" : "18px"} + var(--safe-top, 0px))`,
        paddingBottom: isScrolled ? "10px" : "18px",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all group-hover:scale-110 group-active:scale-95"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)" }}>
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight" style={{ color: "var(--text-navy)" }}>
            KlinikIQ
          </span>
        </Link>
 
        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="#features"
            className="text-sm font-bold opacity-60 hover:opacity-100 transition-all hover:text-primary"
            style={{ color: "var(--text-muted)" }}>
            Özellikler
          </Link>
          <Link href="/leaderboard"
            className="text-sm font-bold opacity-60 hover:opacity-100 transition-all hover:text-primary"
            style={{ color: "var(--text-muted)" }}>
            Liderlik
          </Link>
          <Link href="/topluluk"
            className="text-sm font-bold opacity-60 hover:opacity-100 transition-all hover:text-primary"
            style={{ color: "var(--text-muted)" }}>
            Topluluk
          </Link>
          <Link href="/histology"
            className="text-sm font-bold opacity-60 hover:opacity-100 transition-all hover:text-primary"
            style={{ color: "var(--text-muted)" }}>
            Histoloji
          </Link>
          <Link href="/sinir-lezyon"
            className="text-sm font-bold opacity-60 hover:opacity-100 transition-all hover:text-primary"
            style={{ color: "var(--text-muted)" }}>
            Nöroloji
          </Link>
 
          <div className="w-px h-4 opacity-10" style={{ background: "var(--text-navy)" }} />
 
          <ThemeToggle />
 
          {isLoggedIn ? (
            <Link href="/dashboard"
              className="btn-premium px-6 py-2.5 text-xs">
              DASHBOARD
            </Link>
          ) : (
            <>
              <Link href="/login"
                className="text-sm font-black transition-all hover:text-primary"
                style={{ color: "var(--text-navy)" }}>
                Giriş
              </Link>
              <Link href="/register"
                className="btn-premium px-6 py-2.5 text-xs">
                HEMEN BAŞLA
              </Link>
            </>
          )}
        </div>
 
        {/* Mobile */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-surface-2 border border-border shadow-sm active:scale-90 transition-transform" style={{ color: "var(--text-muted)" }}>
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
 
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 border-b p-6 flex flex-col gap-4 shadow-2xl animate-fade-in-up"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <Link href="#features" className="text-sm font-bold opacity-70" style={{ color: "var(--text-muted)" }}>Özellikler</Link>
          <Link href="/leaderboard" className="text-sm font-bold opacity-70" style={{ color: "var(--text-muted)" }}>Liderlik</Link>
          <Link href="/topluluk" className="text-sm font-bold opacity-70" style={{ color: "var(--text-muted)" }}>Topluluk</Link>
          <Link href="/histology" className="text-sm font-bold opacity-70" style={{ color: "var(--text-muted)" }}>Histoloji</Link>
          <Link href="/sinir-lezyon" className="text-sm font-bold opacity-70" style={{ color: "var(--text-muted)" }}>Nöroloji</Link>
          <hr className="opacity-10" />
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn-premium py-3.5 text-xs">
              DASHBOARD
            </Link>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href="/login" className="btn-premium bg-transparent text-primary border-primary py-3.5 text-xs shadow-none"
                style={{ background: "transparent", color: "var(--primary)", borderColor: "var(--primary)" }}>
                GİRİŞ YAP
              </Link>
              <Link href="/register" className="btn-premium py-3.5 text-xs">
                ÜCRETSİZ BAŞLA
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
