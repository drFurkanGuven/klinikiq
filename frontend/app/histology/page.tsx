"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { microscopyApi, type HistologyImage } from "@/lib/api";
import {
  HISTOLOGY_SPECIALTIES,
  CURRICULUM_FILTER_OPTIONS,
  SCIENCE_UNIT_LABELS,
  STAIN_OPTIONS,
  ORGAN_OPTIONS,
} from "@/lib/histologyTaxonomy";
import { isAuthenticated } from "@/lib/auth";
import {
  Microscope,
  ArrowLeft,
  ImageOff,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronDown,
  BookOpen,
  Lightbulb,
  GraduationCap,
  Database,
} from "lucide-react";
import HistologyViewer from "@/components/HistologyViewer";

const SOURCE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Tüm kaynaklar" },
  { value: "wikimedia", label: "Wikimedia" },
  { value: "huggingface", label: "Hugging Face bağlamı" },
  { value: "upload", label: "Yüklenenler" },
];

function resolveImageUrl(url?: string | null, fullUrl?: string | null) {
  const targetUrl = url || fullUrl;
  if (!targetUrl) return "";
  if (targetUrl.startsWith("http")) return targetUrl;
  let cleanPath = targetUrl.replace(/^\/+/, "");
  if (!url && cleanPath.endsWith(".dzi")) {
    cleanPath = cleanPath.replace(".dzi", "_thumb.jpg");
  }
  const finalPath = cleanPath.startsWith("tiles/") ? `/${cleanPath}` : `/tiles/${cleanPath}`;
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${baseUrl}${encodeURI(finalPath)}`;
}

function HistologyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [images, setImages] = useState<HistologyImage[]>([]);
  const [selected, setSelected] = useState<HistologyImage | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [stain, setStain] = useState("");
  const [organ, setOrgan] = useState("");
  const [assetSource, setAssetSource] = useState("");
  const [curriculumTrack, setCurriculumTrack] = useState("");
  const [scienceUnit, setScienceUnit] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await microscopyApi.listImages({
        specialty: specialty || undefined,
        stain: stain || undefined,
        organ: organ || undefined,
        asset_source: assetSource || undefined,
        curriculum_track: curriculumTrack || undefined,
        science_unit: scienceUnit || undefined,
      });
      setImages(res.data);
      setSelected((prev) => {
        if (res.data.length === 0) return null;
        if (prev && res.data.some((i) => i.id === prev.id)) return prev;
        return res.data[0];
      });
    } catch {
      setImages([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [specialty, stain, organ, assetSource, curriculumTrack, scienceUnit]);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    loadImages();
  }, [mounted, router, loadImages]);

  useEffect(() => {
    const id = searchParams.get("image");
    if (!id || images.length === 0) return;
    const found = images.find((i) => i.id === id);
    if (found) setSelected(found);
  }, [searchParams, images]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <nav className="border-b border-border bg-surface-muted backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/calis?tab=ogren"
              className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft size={15} />
              Dashboard
            </Link>
            <span className="text-muted">/</span>
            <div className="flex items-center gap-2 font-semibold text-sm min-w-0">
              <Microscope size={17} className="text-muted shrink-0" />
              <span className="truncate">Histoloji laboratuvarı</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted">
            <Sparkles size={12} className="text-warning" />
            Dijital patoloji
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-3xl border border-border bg-surface-muted p-8 md:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-surface-hover blur-3xl pointer-events-none hidden" />
          <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-surface-hover blur-3xl pointer-events-none hidden" />
          <div className="relative max-w-3xl space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-hover px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              <Layers size={12} />
              Açık lisanslı preparatlar
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              Preparatları zoom&apos;la incele
            </h1>
            <p className="text-sm md:text-base text-muted leading-relaxed font-medium">
              Wikimedia Commons ve benzeri açık kaynaklardan derlenen H&amp;E / özel boyalı kesitleri
              yüksek çözünürlükte inceleyebilirsin. Müfredat, branş, boya ve organ filtreleriyle temel
              bilim ve klinik izleri ayırabilirsin; görüntü üzerinde alan seçerek not tutabilirsin.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <span className="rounded-xl border border-border bg-surface-hover px-4 py-2 text-xs font-bold text-foreground">
                {loading ? "…" : images.length} preparat
              </span>
              <span className="rounded-xl border border-border bg-surface-hover px-4 py-2 text-xs font-bold text-foreground">
                OpenSeadragon derin zoom
              </span>
            </div>
          </div>
        </header>

        {/* Filters */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Akademik iz</span>
            <div className="relative">
              <select
                value={curriculumTrack}
                onChange={(e) => {
                  setCurriculumTrack(e.target.value);
                  setScienceUnit("");
                }}
                className="w-full appearance-none rounded-2xl border border-border bg-surface-muted pl-4 pr-10 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-border-strong"
              >
                {CURRICULUM_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">
              Konu (temel ünite)
            </span>
            <div className="relative">
              <select
                value={scienceUnit}
                onChange={(e) => setScienceUnit(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-border bg-surface-muted pl-4 pr-10 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-border-strong disabled:opacity-40"
                disabled={!!curriculumTrack && curriculumTrack === "clinical"}
              >
                <option value="">Tümü</option>
                {Object.entries(SCIENCE_UNIT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Branş</span>
            <div className="relative">
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-border bg-surface-muted pl-4 pr-10 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-border-strong"
              >
                <option value="">Tüm branşlar</option>
                {Object.entries(HISTOLOGY_SPECIALTIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </label>
        </section>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Boya</span>
            <div className="relative">
              <select
                value={stain}
                onChange={(e) => setStain(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-border bg-surface-muted pl-4 pr-10 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-border-strong"
              >
                {STAIN_OPTIONS.map((s) => (
                  <option key={s || "all"} value={s}>
                    {s || "Tüm boyalar"}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Organ / doku</span>
            <div className="relative">
              <select
                value={organ}
                onChange={(e) => setOrgan(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-border bg-surface-muted pl-4 pr-10 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-border-strong"
              >
                {ORGAN_OPTIONS.map((o) => (
                  <option key={o || "all"} value={o}>
                    {o || "Tümü"}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Kaynak</span>
            <div className="relative">
              <select
                value={assetSource}
                onChange={(e) => setAssetSource(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-border bg-surface-muted pl-4 pr-10 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-border-strong"
              >
                {SOURCE_FILTERS.map((s) => (
                  <option key={s.value || "all"} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
          </label>
        </section>

        {/* Grid + viewer */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-5 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
              <Database size={14} className="text-muted" />
              Kütüphane
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-surface-hover border border-border animate-pulse"
                  />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface-hover p-10 flex flex-col items-center gap-3 text-muted">
                <ImageOff size={36} />
                <p className="text-sm font-medium">Filtreye uygun preparat yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
                {images.map((img) => {
                  const active = selected?.id === img.id;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelected(img)}
                      className={`text-left rounded-2xl border transition-all overflow-hidden group ${
                        active
                          ? "border-foreground bg-surface-hover ring-1 ring-border-strong shadow-lg shadow-none"
                          : "border-border bg-surface/[0.03] hover:border-border hover:bg-surface-hover/[0.06]"
                      }`}
                    >
                      <div className="aspect-[4/3] relative bg-surface-muted">
                        {img.thumbnail_url || img.image_url ? (
                          <img
                            src={resolveImageUrl(img.thumbnail_url, img.image_url)}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Microscope className="text-muted" size={28} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{img.title}</p>
                        <div className="flex flex-wrap gap-1">
                          {img.specialty && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-surface-hover text-foreground">
                              {HISTOLOGY_SPECIALTIES[img.specialty] ?? img.specialty}
                            </span>
                          )}
                          {img.stain && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-surface-hover text-muted">
                              {img.stain}
                            </span>
                          )}
                          {img.organ && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-surface-hover text-muted">
                              {img.organ}
                            </span>
                          )}
                          {img.science_unit && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-surface-hover text-warning">
                              {SCIENCE_UNIT_LABELS[img.science_unit] ?? img.science_unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="xl:col-span-7 space-y-4 min-w-0">
            <h2 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
              <Microscope size={14} className="text-muted" />
              Görüntüleyici
            </h2>
            {selected ? (
              <div className="rounded-3xl border border-border bg-surface-muted p-5 md:p-6 shadow-2xl">
                <HistologyViewer
                  image={selected}
                  title={selected.title}
                  description={selected.description ?? undefined}
                  assetSource={selected.asset_source}
                  allImages={images}
                  onNavigateToImage={(img) => setSelected(img)}
                />
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-surface/[0.02] p-16 flex flex-col items-center justify-center gap-4 text-muted">
                <Microscope size={48} className="opacity-40" />
                <p className="text-sm font-medium text-center max-w-xs">
                  Soldan bir preparat seçerek yüksek çözünürlükte incelemeye başla
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Öğrenme kaynakları + ipuçları */}
        <section className="rounded-3xl border border-border bg-surface-muted backdrop-blur-md p-6 md:p-8 space-y-8">
          <div className="space-y-2">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-muted shrink-0" />
              Öğrenme ve pratik
            </h2>
            <p className="text-sm text-muted max-w-2xl font-medium leading-relaxed">
              Histoloji çalışırken sık başvurulan açık kaynaklar. Bunlar harici sitelerdir; KlinikIQ ile bağlantılı
              değildir — müfredatınızı desteklemek için seçilmiştir.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                <BookOpen size={14} className="text-muted" />
                Seçilmiş kaynaklar
              </h3>
              <ul className="space-y-3">
                {[
                  {
                    href: "https://histologyguide.com/",
                    title: "Histology Guide",
                    desc: "Etiketli slaytlar; epitel, bağ doku, organ sistemleri.",
                  },
                  {
                    href: "https://med.libretexts.org/Bookshelves/Anatomy_and_Physiology/Anatomy_and_Physiology_2e_(OpenStax)",
                    title: "LibreTexts — OpenStax Anatomi & Fizyoloji",
                    desc: "Açık ders kitabı (2. baskı); doku ve organ sistemleri bölümleri LibreTexts üzerinde.",
                  },
                  {
                    href: "https://www.pathologyoutlines.com/topic/livernormalhistology.html",
                    title: "Pathology Outlines — Normal histoloji",
                    desc: "Kısa özet ve görüntüler (örnek: karaciğer). Sitede diğer organlar için benzer sayfaları arayın.",
                  },
                  {
                    href: "https://openstax.org/books/anatomy-and-physiology/pages/4-introduction",
                    title: "OpenStax — Doku tipleri",
                    desc: "Açık ders kitabı; epitel, bağ doku, kas ve sinir temelleri (İngilizce).",
                  },
                ].map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex gap-3 rounded-2xl border border-border bg-surface-muted p-4 transition-colors hover:border-border hover:bg-surface-muted"
                    >
                      <span className="mt-0.5 text-muted group-hover:text-foreground">
                        <ExternalLink size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-foreground group-hover:text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted leading-relaxed">
                          {item.desc}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 rounded-2xl border border-border bg-surface-hover p-5 md:p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                <Lightbulb size={14} className="text-warning" />
                Bu sayfada neler var?
              </h3>
              <ul className="space-y-3">
                {[
                  {
                    k: "Filtreler",
                    t: "Soldan müfredat, branş, boya ve organa göre preparat listesini daraltın.",
                  },
                  {
                    k: "Görüntüleyici",
                    t: (
                      <>
                        <strong className="text-foreground font-semibold">Yakın / Uzak / Tümü</strong> ile yakınlaştırın;
                        sağ alttaki küçük haritadan genel görünümü izleyin.
                      </>
                    ),
                  },
                  {
                    k: "Not alanı",
                    t: (
                      <>
                        Dikdörtgen seçerek işaretleyin; her oturumda farklı renkte çerçeve kullanılır. Notları kaydedin ve
                        listeden yönetin.
                      </>
                    ),
                  },
                  {
                    k: "Yükleme",
                    t: "Kendi TIFF/SVS dosyanızı veya uygun bir bağlantıyı, hesabınıza tanımlı yükleme ile ekleyebilirsiniz (kurum politikası ve yetkilere bağlıdır).",
                  },
                ].map((row) => (
                  <li
                    key={row.k}
                    className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground leading-relaxed"
                  >
                    <span className="block text-[11px] font-black uppercase tracking-wider text-muted mb-1">
                      {row.k}
                    </span>
                    <span className="text-muted">{row.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function HistologyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-muted text-sm">
          Histoloji yükleniyor…
        </div>
      }
    >
      <HistologyPageInner />
    </Suspense>
  );
}
