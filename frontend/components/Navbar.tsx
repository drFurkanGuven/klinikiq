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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
            KlinikIQ
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Özellikler
          </Link>
          <Link href="/leaderboard" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Liderlik Tablosu
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <ThemeToggle />
          
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              Dashboard'a Git
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                Hemen Başla
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300"
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
          <Link href="#features" className="text-lg font-medium text-slate-600 dark:text-slate-300">Özellikler</Link>
          <Link href="/leaderboard" className="text-lg font-medium text-slate-600 dark:text-slate-300">Liderlik Tablosu</Link>
          <hr className="border-slate-100 dark:border-slate-800" />
          {isLoggedIn ? (
            <Link href="/dashboard" className="w-full py-3 text-center rounded-xl bg-blue-600 text-white font-semibold">Dashboard'a Git</Link>
          ) : (
            <>
              <Link href="/login" className="w-full py-3 text-center rounded-xl border border-slate-200 dark:border-slate-700 font-semibold">Giriş Yap</Link>
              <Link href="/register" className="w-full py-3 text-center rounded-xl bg-blue-600 text-white font-semibold">Hemen Başla</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
