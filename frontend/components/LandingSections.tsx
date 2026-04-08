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
    <section className="relative pt-28 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      {/* Soft background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-8%] left-[-5%] w-[35%] h-[40%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(74,124,89,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-8%] right-[-5%] w-[30%] h-[35%] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,197,160,0.15) 0%, transparent 70%)" }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8"
          style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 25%, transparent)", color: "var(--primary)" }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "var(--primary)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--primary)" }} />
          </span>
          10.000+ USMLE Vakası ile Hazırlanın
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6"
          style={{ color: "var(--text)" }}>
          Klinik Karar Verme Yeteneğini
          <br />
          <span style={{
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Yapay Zeka ile Test Et
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-base md:text-lg leading-relaxed mb-10"
          style={{ color: "var(--text-muted)" }}>
          TUS ve USMLE hazırlığında bir adım öne geç. AI destekli hasta simülasyonları, gerçekçi tetkik panelleri ve anlık akademik raporlarla.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register"
            className="group px-7 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-md"
            style={{ background: "var(--primary)", color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--primary-h)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--primary)")}>
            Ücretsiz Başla
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="#features"
            className="px-7 py-3.5 rounded-xl font-semibold text-sm transition-all border"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            Özellikleri Gör
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
    <section className="py-12 border-y" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                <s.icon className="w-5 h-5" style={{ color: "var(--primary)" }} />
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-0.5" style={{ color: "var(--text)" }}>
                {s.value}
              </div>
              <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
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
    <section id="features" className="py-20" style={{ background: "var(--bg-subtle)" }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--text)" }}>
            Neden KlinikIQ?
          </h2>
          <p className="text-sm md:text-base" style={{ color: "var(--text-muted)" }}>
            Geleceğin tıp eğitimini bugünden deneyimle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border card-hover"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                <f.icon className="w-6 h-6" style={{ color: "var(--primary)" }} />
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
