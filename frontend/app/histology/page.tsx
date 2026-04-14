"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { microscopyApi, type HistologyImage } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import dynamic from "next/dynamic";
import { Microscope, ArrowLeft, ImageOff, ChevronRight } from "lucide-react";

const HistologyViewer = dynamic(() => import("@/components/HistologyViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] flex items-center justify-center bg-zinc-900 rounded-xl">
      <span className="text-zinc-400 text-sm">Görüntüleyici yükleniyor...</span>
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

export default function HistologyPage() {
  const router = useRouter();
  const [images, setImages] = useState<HistologyImage[]>([]);
  const [selected, setSelected] = useState<HistologyImage | null>(null);
  const [specialty, setSpecialty] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    loadImages();
  }, [specialty]);

  const loadImages = async () => {
    setLoading(true);
    try {
      const res = await microscopyApi.listImages(specialty ? { specialty } : undefined);
      setImages(res.data);
      setSelected(res.data.length > 0 ? res.data[0] : null);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
      {/* Navbar */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft size={15} />
              Dashboard
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <div className="flex items-center gap-1.5 font-medium text-sm">
              <Microscope size={16} />
              Histoloji Görüntüleri
            </div>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sol panel: görüntü listesi */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {/* Filtre */}
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm branşlar</option>
                {Object.entries(SPECIALTIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Liste */}
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <li className="p-4 text-sm text-zinc-400 text-center">Yükleniyor...</li>
              ) : images.length === 0 ? (
                <li className="p-6 flex flex-col items-center gap-2 text-zinc-400">
                  <ImageOff size={28} />
                  <span className="text-sm">Görüntü bulunamadı</span>
                </li>
              ) : (
                images.map((img) => (
                  <li key={img.id}>
                    <button
                      onClick={() => setSelected(img)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                        selected?.id === img.id
                          ? "bg-blue-50 dark:bg-blue-950/40"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      }`}
                    >
                      {img.thumbnail_url ? (
                        <img
                          src={img.thumbnail_url}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                          <Microscope size={18} className="text-zinc-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{img.title}</p>
                        {img.specialty && (
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {SPECIALTIES[img.specialty] ?? img.specialty}
                          </p>
                        )}
                      </div>
                      {selected?.id === img.id && (
                        <ChevronRight size={14} className="text-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        {/* Sağ panel: görüntüleyici */}
        <main className="flex-1 min-w-0">
          {selected ? (
            <div className="flex flex-col gap-4">
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
                <h1 className="text-lg font-semibold mb-0.5">{selected.title}</h1>
                {selected.description && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    {selected.description}
                  </p>
                )}
                <HistologyViewer image={selected} />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-12 flex flex-col items-center gap-3 text-zinc-400">
              <Microscope size={40} />
              <p className="text-sm">Sol listeden bir görüntü seçin</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
