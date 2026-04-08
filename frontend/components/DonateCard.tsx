"use client";
import { useState } from "react";
import { Heart, Coffee, X, Sparkles, Zap, Copy, Check } from "lucide-react";

export default function DonateCard() {
  const [dismissed, setDismissed] = useState(false);
  const [showIban, setShowIban] = useState(false);
  const [copied, setCopied] = useState(false);

  const bankName = "Ziraat Bankası";
  const accountName = "Furkan Güven";
  const iban = "TR75 0001 0017 0083 0017 5850 01";

  if (dismissed) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(iban.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5 p-6 transition-all duration-300">
      {/* Arka plan efekti */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(236,72,153,0.08)_0%,_transparent_70%)]" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl" />

      {/* Kapat butonu */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-slate-700/50 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        aria-label="Kapat"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* İkon */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center flex-shrink-0">
          <Coffee className="w-6 h-6 text-pink-400" />
        </div>

        {/* İçerik */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">Projeyi Destekle ☕</h3>
            <span className="text-xs bg-pink-500/10 border border-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">
              Açık Kaynak
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            KlinikIQ, tüm tıp öğrencileri ve hekimler için gönüllü olarak geliştirilmektedir.
            Projeye destek olarak yapay zeka ve sunucu maliyetlerine katkı sağlayabilirsin.
          </p>
        </div>

        {/* Buton */}
        <button
          onClick={() => setShowIban(!showIban)}
          className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30 hover:scale-105 active:scale-95 whitespace-nowrap"
        >
          <Heart className="w-3.5 h-3.5 fill-white" />
          {showIban ? "Gizle" : "Destek Ol"}
        </button>
      </div>

      {/* IBAN Bölümü (Açılır/Kapanır) */}
      {showIban && (
        <div className="relative mt-4 p-4 rounded-xl border border-pink-500/20 bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1 w-full max-w-full">
            <div className="text-xs text-slate-400">{bankName} - {accountName}</div>
            <div className="font-mono text-sm text-pink-100 break-all">{iban}</div>
          </div>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors w-full sm:w-auto justify-center ${
              copied 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Kopyalandı!" : "IBAN Kopyala"}
          </button>
        </div>
      )}

      {/* Alt istatistikler */}
      <div className="relative mt-4 pt-4 border-t border-slate-800/50 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-yellow-400" />
          <span>Tamamen ücretsiz</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Zap className="w-3 h-3 text-blue-400" />
          <span>AI destekli</span>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <Heart className="w-3 h-3 text-red-400 fill-red-400" />
          <span>Tüm tıp öğrencileri için</span>
        </div>
      </div>
    </div>
  );
}
