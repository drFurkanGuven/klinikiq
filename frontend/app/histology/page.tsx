"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  microscopyApi,
  type HistologyImage,
  type HuggingFaceDatasetSpotlight,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import dynamic from "next/dynamic";
import {
  Microscope,
  ArrowLeft,
  ImageOff,
  Sparkles,
  ExternalLink,
  Database,
  Layers,
  ChevronDown,
} from "lucide-react";

const HistologyViewer = dynamic(() => import("@/components/HistologyViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[min(70vh,560px)] flex items-center justify-center rounded-2xl bg-slate-950/80 border border-white/10">
      <span className="text-slate-400 text-sm">Görüntüleyici yükleniyor…</span>
    </div>
  ),
});

const SPECIALTIES: Record<string, string> = {
  pathology: "Patoloji",
  cardiology: "Kardiyoloji",
  endocrinology: "Endokrinoloji",
  neurology: "Nöroloji",
  pulmonology: "Pulmonoloji",
  gastroenterology: "Gastroenteroloji",
  nephrology: "Nefroloji",
  infectious_disease: "Enfeksiyon",
  hematology: "Hematoloji",
  rheumatology: "Romatoloji",
};

const STAIN_FILTERS = ["", "H&E", "PAS", "Masson", "IHC"];

const ORGAN_FILTERS = ["", "Böbrek", "Meme", "Adrenal", "Akciğer", "Serebellum"];

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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") || "";
  return `${baseUrl}${encodeURI(finalPath)}`;
}

export default function HistologyPage() {
  const router = useRouter();
  const [images, setImages] = useState<HistologyImage[]>([]);
  const [selected, setSelected] = useState<HistologyImage | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [stain, setStain] = useState("");
  const [organ, setOrgan] = useState("");
  const [assetSource, setAssetSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [hfLoading, setHfLoading] = useState(true);
  const [hfSets, setHfSets] = useState<HuggingFaceDatasetSpotlight[]>([]);
  const [hfQuery, setHfQuery] = useState("histopathology");
  const [debouncedHfQuery, setDebouncedHfQuery] = useState("histopathology");
  const [hfTick, setHfTick] = useState(0);

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
  }, [specialty, stain, organ, assetSource]);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    loadImages();
  }, [mounted, router, loadImages]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHfQuery(hfQuery.trim() || "histopathology"), 450);
    return () => clearTimeout(t);
  }, [hfQuery]);

  useEffect(() => {
    if (!mounted || !isAuthenticated()) return;
    let cancelled = false;
    (async () => {
      setHfLoading(true);
      try {
        const res = await microscopyApi.exploreHuggingface({ q: debouncedHfQuery, limit: 14 });
        if (!cancelled) setHfSets(res.data.datasets ?? []);
      } catch {
        if (!cancelled) setHfSets([]);
      } finally {
        if (!cancelled) setHfLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, debouncedHfQuery, hfTick]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-violet-950/25 to-slate-950 text-slate-100 transition-colors">
      <nav className="border-b border-white/10 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft size={15} />
              Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <div className="flex items-center gap-2 font-semibold text-sm min-w-0">
              <Microscope size={17} className="text-violet-400 shrink-0" />
              <span className="truncate">Histoloji laboratuvarı</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <Sparkles size={12} className="text-amber-400/90" />
            Dijital patoloji
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-10">
        {/* Hero */}
        <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-violet-950/30 to-slate-900/90 p-8 md:p-10 shadow-2xl shadow-violet-950/20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="relative max-w-3xl space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-300/90">
              <Layers size={12} />
              Açık lisanslı örnekler + keşif
            </p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Preparatları{" "}
              <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                zoom&apos;la incele
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed font-medium">
              Wikimedia Commons ve benzeri açık kaynaklardan derlenen H&amp;E / özel boyalı kesitler.
              Aşağıda Hugging Face üzerindeki histopatoloji veri kümelerine de tek tıkla ulaşabilirsin — tam
              slayt veya patch veri setlerini kendi araştırman için keşfet.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
                {loading ? "…" : images.length} preparat
              </span>
              <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300">
                OpenSeadragon derin zoom
              </span>
            </div>
          </div>
        </header>

        {/* Filters */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Branş</span>
            <div className="relative">
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/80 pl-4 pr-10 py-3 text-sm font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="">Tüm branşlar</option>
                {Object.entries(SPECIALTIES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Boya</span>
            <div className="relative">
              <select
                value={stain}
                onChange={(e) => setStain(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/80 pl-4 pr-10 py-3 text-sm font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {STAIN_FILTERS.map((s) => (
                  <option key={s || "all"} value={s}>
                    {s || "Tüm boyalar"}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Organ / doku</span>
            <div className="relative">
              <select
                value={organ}
                onChange={(e) => setOrgan(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/80 pl-4 pr-10 py-3 text-sm font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {ORGAN_FILTERS.map((o) => (
                  <option key={o || "all"} value={o}>
                    {o || "Tümü"}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kaynak</span>
            <div className="relative">
              <select
                value={assetSource}
                onChange={(e) => setAssetSource(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-900/80 pl-4 pr-10 py-3 text-sm font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {SOURCE_FILTERS.map((s) => (
                  <option key={s.value || "all"} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </label>
        </section>

        {/* Grid + viewer */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-5 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Database size={14} className="text-violet-400" />
              Kütüphane
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                  />
                ))}
              </div>
            ) : images.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 flex flex-col items-center gap-3 text-slate-500">
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
                          ? "border-violet-400/60 bg-violet-950/40 ring-1 ring-violet-400/30 shadow-lg shadow-violet-950/30"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="aspect-[4/3] relative bg-slate-900">
                        {img.thumbnail_url || img.image_url ? (
                          <img
                            src={resolveImageUrl(img.thumbnail_url, img.image_url)}
                            alt=""
                            className="w-full h-full object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Microscope className="text-slate-600" size={28} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-xs font-bold text-white line-clamp-2 leading-snug">{img.title}</p>
                        <div className="flex flex-wrap gap-1">
                          {img.specialty && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                              {SPECIALTIES[img.specialty] ?? img.specialty}
                            </span>
                          )}
                          {img.stain && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-200">
                              {img.stain}
                            </span>
                          )}
                          {img.organ && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-200">
                              {img.organ}
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
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Microscope size={14} className="text-cyan-400" />
              Görüntüleyici
            </h2>
            {selected ? (
              <div className="rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-sm p-5 md:p-6 shadow-2xl">
                <div className="mb-5 space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">{selected.title}</h3>
                  {selected.description && (
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">{selected.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selected.asset_source && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/10 text-slate-300">
                        Kaynak: {selected.asset_source}
                      </span>
                    )}
                  </div>
                </div>
                <HistologyViewer image={selected} />
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-16 flex flex-col items-center justify-center gap-4 text-slate-500">
                <Microscope size={48} className="opacity-40" />
                <p className="text-sm font-medium text-center max-w-xs">
                  Soldan bir preparat seçerek yüksek çözünürlükte incelemeye başla
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hugging Face keşif */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-400/90" />
                Hugging Face veri keşfi
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl font-medium">
                Açık histopatoloji ve WSI veri kümeleri (indirme, lisans ve boyutlar veri kartında). KlinikIQ
                burada yalnızca keşif bağlantısı sunar; veri Hugging Face üzerindedir.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={hfQuery}
                onChange={(e) => setHfQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setDebouncedHfQuery(hfQuery.trim() || "histopathology");
                    setHfTick((t) => t + 1);
                  }
                }}
                placeholder="Ara: breast pathology, WSI…"
                className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
              <button
                type="button"
                onClick={() => {
                  const q = hfQuery.trim() || "histopathology";
                  setHfQuery(q);
                  setDebouncedHfQuery(q);
                  setHfTick((t) => t + 1);
                }}
                className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2.5 transition-colors"
              >
                Yenile
              </button>
            </div>
          </div>

          {hfLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 min-w-[260px] rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : hfSets.length === 0 ? (
            <p className="text-sm text-slate-500">Veri kümeleri yüklenemedi veya sonuç yok.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {hfSets.map((ds) => (
                <a
                  key={ds.id}
                  href={ds.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex-shrink-0 w-[min(100%,280px)] rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-violet-950/20 p-4 hover:border-violet-400/40 transition-all"
                >
                  <p className="text-xs font-bold text-violet-300 line-clamp-2 mb-2 group-hover:text-white">
                    {ds.id}
                  </p>
                  <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed mb-4">
                    {ds.description || "—"}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>⬇ {ds.downloads?.toLocaleString?.() ?? ds.downloads}</span>
                    <span className="inline-flex items-center gap-1 text-violet-400">
                      Hub
                      <ExternalLink size={12} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
