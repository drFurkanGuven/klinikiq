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
    <section
      className="pt-28 pb-16 md:pt-36 md:pb-24"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p
          className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium mb-6 border"
          style={{
            color: "var(--accent)",
            borderColor: "var(--border)",
            background: "var(--accent-muted)",
          }}
        >
          10.000+ USMLE vakası ile hazırlanın
        </p>

        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-5"
          style={{ color: "var(--foreground)" }}
        >
          Klinik karar verme
          <br />
          <span style={{ color: "var(--accent)" }}>becerilerini geliştir</span>
        </h1>

        <p
          className="max-w-xl mx-auto text-base md:text-lg leading-relaxed mb-3"
          style={{ color: "var(--muted)" }}
        >
          Vaka simülasyonu: tetkik panelleri ve özetlerle pratik yap.
        </p>
        <p
          className="max-w-xl mx-auto text-sm leading-relaxed mb-10"
          style={{ color: "var(--muted)" }}
        >
          Tanı veya tedavi tavsiyesi değildir. Diyalog ve tetkik metinleri
          yapay zeka ile üretilebilir.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <Link
            href="/register"
            className="btn-primary w-full sm:w-auto px-6 py-2.5 text-sm"
          >
            Ücretsiz başla
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="#features"
            className="btn-secondary w-full sm:w-auto px-6 py-2.5 text-sm text-center"
          >
            Özellikleri incele
          </Link>
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  const stats = [
    { label: "Toplam vaka", value: "10.000+", icon: Database },
    { label: "Uzmanlık alanı", value: "30+", icon: Stethoscope },
    { label: "Soru standardı", value: "USMLE", icon: ShieldCheck },
    { label: "Kullanım ücreti", value: "Ücretsiz", icon: TrendingUp },
  ];

  return (
    <section
      className="py-12 md:py-16 border-y"
      style={{
        background: "var(--surface-muted)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-md mb-3 border"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                  color: "var(--accent)",
                }}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <div
                className="text-2xl md:text-3xl font-semibold mb-0.5 tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {s.value}
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type FeatureItem = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href?: string;
};

function FeatureCard({
  feature,
  asLink,
}: {
  feature: FeatureItem;
  asLink?: boolean;
}) {
  const inner = (
    <>
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center mb-4 border"
        style={{
          borderColor: "var(--border)",
          background: "var(--accent-muted)",
          color: "var(--accent)",
        }}
      >
        <feature.icon className="w-5 h-5" />
      </div>
      <h3
        className="text-base font-semibold mb-2"
        style={{ color: "var(--foreground)" }}
      >
        {feature.title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        {feature.description}
      </p>
      {feature.href ? (
        <span
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          Not akışına git
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      ) : null}
    </>
  );

  const className =
    "card p-6 h-full transition-colors hover:border-[var(--accent)]";

  if (asLink && feature.href) {
    return (
      <Link href={feature.href} className={`block ${className}`}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function FeatureSection() {
  const features: FeatureItem[] = [
    {
      title: "10.000+ vaka kütüphanesi",
      description:
        "MedQA tabanlı, USMLE standardında klinik senaryolar. Her açılışta farklı bir vaka.",
      icon: Database,
    },
    {
      title: "AI hasta personası",
      description:
        "Doğal dilde hasta rolü (eğitim); tanı veya muayene yerine geçmez.",
      icon: Brain,
    },
    {
      title: "Gelişmiş LIS modülü",
      description:
        "Hemogram, biyokimya, seroloji ve görüntüleme panelleri. Fizik muayene simülasyonu.",
      icon: FlaskConical,
    },
    {
      title: "Detaylı raporlama",
      description:
        "Her vaka sonunda patofizyoloji analizi, skor ve TUS odak noktaları.",
      icon: Activity,
    },
    {
      title: "Branş bazlı seçim",
      description:
        "Kardiyoloji, nöroloji, enfeksiyon ve daha fazlası. Zorluk seviyesine göre filtreleme.",
      icon: Stethoscope,
    },
    {
      title: "Güvenli mimari",
      description:
        "Admin paneli, kullanıcı izolasyonu ve prompt injection koruması.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section
      id="features"
      className="py-16 md:py-24"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 md:mb-14 max-w-2xl mx-auto">
          <h2
            className="text-2xl md:text-3xl font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Neden KlinikIQ?
          </h2>
          <p className="text-base" style={{ color: "var(--muted)" }}>
            Klinik düşünmeyi pratik etmek için — tıbbi karar aracı değildir.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={i} feature={f} asLink={!!f.href} />
          ))}
        </div>
      </div>
    </section>
  );
}
