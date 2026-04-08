"use client";

import React from "react";
import { 
  Stethoscope, 
  Brain, 
  Database, 
  Activity, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Users
} from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 mb-8 animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">10.000+ USMLE Vakası Yayında</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
          Klinik Karar Verme Yeteniğinizi{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
            AI ile Test Edin
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
          TUS ve USMLE hazırlığında bir devrim. Yapay zeka destekli "Akıllı Hasta" simülasyonları ile gerçek vakalar üzerinden deneyim kazanın.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="group px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-all shadow-xl shadow-blue-600/25 flex items-center gap-2 active:scale-95"
          >
            Hemen Ücretsiz Başla
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#features"
            className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Özellikleri Keşfet
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FeatureSection() {
  const features = [
    {
      title: "10.000+ Vaka Kütüphanesi",
      description: "MedQA tabanlı, USMLE standardında binlerce gerçek klinik senaryo.",
      icon: Database,
      color: "blue"
    },
    {
      title: "AI Hasta Personası",
      description: "Doğal dilde şikayetlerini aktaran ve reaksiyon veren akıllı hasta simülasyonları.",
      icon: Brain,
      color: "purple"
    },
    {
      title: "Gelişmiş LIS Modülü",
      description: "Kapsamlı laboratuvar testleri ve fizik muayene simülasyonu.",
      icon: Stethoscope,
      color: "cyan"
    },
    {
      title: "Akademik Raporlama",
      description: "Her vaka sonunda patofizyolojik analiz ve performans puanlaması.",
      icon: Activity,
      color: "rose"
    },
    {
      title: "Güvenli Mimari",
      description: "Admin paneli üzerinden maliyet kontrolü ve kişiselleştirilmiş limitler.",
      icon: ShieldCheck,
      color: "emerald"
    },
    {
      title: "Global Rekabet",
      description: "Liderlik tablosu ile diğer hekim adayları arasındaki yerinizi görün.",
      icon: TrendingUp,
      color: "amber"
    }
  ];

  return (
    <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Neden KlinikIQ?</h2>
          <p className="text-slate-600 dark:text-slate-400">Geleceğin tıp eğitimini bugünden deneyimleyin.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div 
              key={i}
              className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 transition-all group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-${f.color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <f.icon className={`w-7 h-7 text-${f.color}-500`} />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const stats = [
    { label: "Toplam Vaka", value: "10.000+", icon: Database },
    { label: "Uzmanlık Alanı", value: "30+", icon: Stethoscope },
    { label: "Soru Tipi", value: "USMLE", icon: ShieldCheck },
    { label: "Kullanım Ücreti", value: "Ücretsiz", icon: Users }
  ];

  return (
    <section className="py-20 border-y border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 mb-4">
                <s.icon className="w-6 h-6 text-blue-600 dark:text-blue-500" />
              </div>
              <div className="text-3xl md:text-4xl font-black mb-1">{s.value}</div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
