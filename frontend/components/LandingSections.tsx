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
  FlaskConical,
} from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-bg transition-colors">
      {/* Premium Background Ambiance */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-30 blur-[120px]"
          style={{ background: "var(--primary)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full opacity-20 blur-[100px]"
          style={{ background: "var(--accent)" }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 text-center animate-fade-in-up">
        {/* Advanced Badge */}
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] mb-10 border border-metallic glass"
          style={{ color: "var(--primary)" }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "var(--primary)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--primary)" }} />
          </span>
          10.000+ USMLE Vakası ile Hazırlanın
        </div>

        {/* Dynamic Heading */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-8"
          style={{ color: "var(--text)" }}>
          Klinik Karar Verme<br />
          <span className="gradient-text">Yeteneklerini Ateşle</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base md:text-xl leading-relaxed mb-12 font-medium opacity-70"
          style={{ color: "var(--text)" }}>
          TUS ve USMLE hazırlığında bir adım öne geç. AI destekli hasta simülasyonları, 
          gerçekçi tetkik panelleri ve anlık akademik raporlarla sınırlarını zorla.
        </p>

        {/* Fixed Mobile Buttons - No Overlap */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 max-w-lg mx-auto">
          <Link href="/register"
            className="btn-premium w-full sm:w-auto px-10 py-4 text-base shadow-2xl">
            Ücretsiz Başla
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#features"
            className="w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-sm transition-all border-metallic glass hover:bg-white/5 text-center"
            style={{ color: "var(--text)" }}>
            Sistemi Keşfet
          </Link>
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const stats = [
    { label: "Toplam Vaka", value: "10.000+", icon: Database },
    { label: "Uzmanlık Alanı", value: "30+", icon: Stethoscope },
    { label: "Soru Standardı", value: "USMLE", icon: ShieldCheck },
    { label: "Kullanım Ücreti", value: "Ücretsiz", icon: TrendingUp },
  ];

  return (
    <section className="py-20 border-y border-metallic glass" style={{ background: "var(--bg-subtle)" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
          {stats.map((s, i) => (
            <div key={i} className="text-center group">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 transition-all group-hover:scale-110 border-metallic glass shadow-lg">
                <s.icon className="w-6 h-6" style={{ color: "var(--primary)" }} />
              </div>
              <div className="text-3xl md:text-4xl font-black mb-1" style={{ color: "var(--text)" }}>
                {s.value}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40" style={{ color: "var(--text)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FeatureSection() {
  const features = [
    {
      title: "10.000+ Vaka Kütüphanesi",
      description: "MedQA tabanlı, USMLE standardında gerçek klinik senaryolar. Anti-farming mekanizması ile her açılışta farklı bir vaka.",
      icon: Database,
    },
    {
      title: "AI Hasta Personası",
      description: "Doğal dilde şikayetlerini aktaran, tutarlı ve dürüst bir hasta rolü oynayan yapay zeka.",
      icon: Brain,
    },
    {
      title: "Gelişmiş LIS Modülü",
      description: "Hemogram, biyokimya, seroloji ve görüntüleme panelleri. Fizik muayene simülasyonu.",
      icon: FlaskConical,
    },
    {
      title: "Sertifikalı Raporlama",
      description: "Her vaka sonunda patofizyoloji analizi, skor ve TUS odak noktaları içeren akademik rapor.",
      icon: Activity,
    },
    {
      title: "Branş Bazlı Seçim",
      description: "Kardiyoloji, Nöroloji, Enfeksiyon ve daha fazlası. Zorluk seviyesine göre filtreleme.",
      icon: Stethoscope,
    },
    {
      title: "Güvenli Mimari",
      description: "Admin paneli, kullanıcı izolasyonu ve prompt injection koruması.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="features" className="py-32 relative overflow-hidden bg-bg">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20 animate-fade-in-up">
          <h2 className="text-3xl md:text-5xl font-black mb-5" style={{ color: "var(--text)" }}>
            Neden <span className="gradient-text">KlinikIQ?</span>
          </h2>
          <p className="text-base md:text-lg font-medium opacity-60" style={{ color: "var(--text)" }}>
            Geleceğin tıp eğitimini, yapay zeka ve üst düzey simülasyonla bugünden deneyimle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-10 glass-card border-metallic group"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:rotate-12 bg-primary-light border border-metallic">
                <f.icon className="w-7 h-7" style={{ color: "var(--primary)" }} />
              </div>
              <h3 className="text-xl font-black mb-4 tracking-tight" style={{ color: "var(--text)" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed font-medium opacity-60" style={{ color: "var(--text)" }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
