"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Link as LinkIcon,
  Microscope,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { microscopyApi } from "@/lib/api";
import { categorizeFolderFiles, titleFromRelativePath } from "@/lib/folderUploadHistology";
import {
  HISTOLOGY_SPECIALTIES,
  CURRICULUM_TRACK_UPLOAD,
  SCIENCE_UNIT_OPTIONS,
  STAIN_OPTIONS,
  ORGAN_OPTIONS,
} from "@/lib/histologyTaxonomy";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HistologyUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<"tiff" | "url" | "folder">("tiff");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [curriculumTrack, setCurriculumTrack] = useState("");
  const [scienceUnit, setScienceUnit] = useState("");
  const [stain, setStain] = useState("");
  const [organ, setOrgan] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [folderStats, setFolderStats] = useState<{
    rasters: number;
    dziBundles: number;
    fileCount: number;
  } | null>(null);

  const showScienceUnit =
    curriculumTrack === "basic_cell_tissue" || curriculumTrack === "basic_organ_system";

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError(null);
      setProgress(0);
      setIsUploading(false);
      setFolderStats(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (curriculumTrack !== "basic_cell_tissue" && curriculumTrack !== "basic_organ_system") {
      setScienceUnit("");
    }
  }, [curriculumTrack]);

  if (!isOpen) return null;

  const metaBase = () => ({
    description: description || undefined,
    specialty: specialty || undefined,
    stain: stain || undefined,
    organ: organ || undefined,
    curriculum_track: curriculumTrack || undefined,
    science_unit: showScienceUnit && scienceUnit ? scienceUnit : undefined,
  });

  const runFolderBulkUpload = async () => {
    const input = document.getElementById("hist-folder-input") as HTMLInputElement | null;
    const fl = input?.files;
    if (!fl?.length) throw new Error("Lütfen bir klasör seçin.");

    const { rasters, dziBundles } = categorizeFolderFiles(fl);
    const jobs = rasters.length + dziBundles.length;
    if (jobs === 0) {
      throw new Error(
        "Klasörde dönüştürülebilir görüntü bulunamadı (.tif, .jpg, .png, .gif veya .dzi + _files paketi).",
      );
    }

    const meta = metaBase();
    const failures: string[] = [];
    let completed = 0;

    const setStepProgress = (fileIndex: number, pct: number) => {
      setProgress(
        Math.min(99, Math.round(((fileIndex + pct / 100) / jobs) * 100)),
      );
    };

    for (let i = 0; i < rasters.length; i++) {
      const f = rasters[i];
      const t = titleFromRelativePath(f.webkitRelativePath);
      try {
        await microscopyApi.uploadTiff(
          f,
          { ...meta, title: t },
          (pct) => setStepProgress(i, pct),
        );
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        failures.push(`${f.name}: ${typeof detail === "string" ? detail : "yükleme hatası"}`);
      }
      completed++;
      setProgress(Math.round((completed / jobs) * 100));
    }

    const offset = rasters.length;
    for (let j = 0; j < dziBundles.length; j++) {
      const b = dziBundles[j];
      const t = titleFromRelativePath(b.dzi.webkitRelativePath);
      const bundleFiles = [b.dzi, ...b.tiles];
      const paths = bundleFiles.map((x) => x.webkitRelativePath);
      const idx = offset + j;
      if (b.tiles.length === 0) {
        failures.push(`${b.dzi.name}: Deep Zoom _files klasörü veya karoları eksik.`);
        completed++;
        setProgress(Math.round((completed / jobs) * 100));
        continue;
      }
      try {
        await microscopyApi.uploadDziBundle(
          paths,
          bundleFiles,
          { ...meta, title: t },
          (pct) => setStepProgress(idx, pct),
        );
      } catch (err: unknown) {
        const detail =
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        failures.push(`${b.dzi.name}: ${typeof detail === "string" ? detail : "paket hatası"}`);
      }
      completed++;
      setProgress(Math.round((completed / jobs) * 100));
    }

    if (failures.length > 0) {
      throw new Error(
        `${failures.length} öğe tamamlanamadı:\n${failures.slice(0, 8).join("\n")}${
          failures.length > 8 ? "\n…" : ""
        }`,
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const m = metaBase();

      if (tab === "folder") {
        const input = document.getElementById("hist-folder-input") as HTMLInputElement | null;
        if (!input?.files?.length) {
          throw new Error("Önce bir klasör seçin.");
        }
        await runFolderBulkUpload();
        setProgress(100);
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
        return;
      }

      if (tab === "tiff") {
        if (!file) throw new Error("Lütfen bir görüntü dosyası seçin.");
        await microscopyApi.uploadTiff(
          file,
          {
            ...m,
            title,
            description: m.description,
          },
          (pct) => setProgress(pct),
        );
      } else {
        if (!imageUrl) throw new Error("Lütfen bir görüntü URL'si girin.");
        await microscopyApi.createImage({
          ...m,
          title,
          image_url: imageUrl,
        });
        setProgress(100);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      console.error(err);
      const anyErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const d = anyErr.response?.data?.detail;
      setError(typeof d === "string" ? d : anyErr.message || "Bir hata oluştu.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={() => !isUploading && onClose()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl glass rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 animate-fade-in-up">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg bg-primary text-white">
              <Microscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Yeni Görüntü Ekle</h2>
              <p className="text-xs font-bold opacity-50 uppercase tracking-widest">Histoloji Arşivi</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isUploading}
            className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {success ? (
            <div className="py-12 flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center text-success animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black">Başarıyla Eklendi!</h3>
                <p className="text-sm font-medium opacity-60">Görüntü arşive kaydedildi ve işleme alındı.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tabs */}
              <div className="flex flex-wrap justify-center p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 gap-1 w-fit mx-auto mb-8">
                <button
                  type="button"
                  onClick={() => setTab("tiff")}
                  disabled={isUploading}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                    tab === "tiff" ? "bg-white dark:bg-zinc-800 shadow-lg text-primary" : "opacity-40 hover:opacity-100"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Tek dosya
                </button>
                <button
                  type="button"
                  onClick={() => setTab("folder")}
                  disabled={isUploading}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                    tab === "folder" ? "bg-white dark:bg-zinc-800 shadow-lg text-primary" : "opacity-40 hover:opacity-100"
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Klasör
                </button>
                <button
                  type="button"
                  onClick={() => setTab("url")}
                  disabled={isUploading}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                    tab === "url" ? "bg-white dark:bg-zinc-800 shadow-lg text-primary" : "opacity-40 hover:opacity-100"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  URL
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {tab === "tiff" ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">
                        Görüntü dosyası
                      </label>
                      <div className="relative group/file">
                        <input 
                          type="file" 
                          accept=".tiff,.tif,.svs,.ndpi,.jpg,.jpeg,.png,.gif"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          required={tab === "tiff"}
                          disabled={isUploading}
                          className="w-full text-xs file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-white hover:file:opacity-90 transition-all font-bold p-1 rounded-2xl border-2 border-dashed border-border hover:border-primary cursor-pointer disabled:opacity-50"
                        />
                      </div>
                      <p className="text-[10px] font-medium opacity-50 px-1 leading-relaxed">
                        TIFF/SVS/NDPI veya düz JPEG/PNG/GIF; sunucuda Deep Zoom üretilir.
                      </p>
                    </div>
                  ) : tab === "folder" ? (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">
                        Klasör seç (alt klasörler dahil)
                      </label>
                      <input
                        id="hist-folder-input"
                        type="file"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- webkitdirectory
                        {...({ webkitdirectory: "" } as any)}
                        multiple
                        onChange={(e) => {
                          const fl = e.target.files;
                          if (!fl?.length) {
                            setFolderStats(null);
                            return;
                          }
                          const { rasters, dziBundles } = categorizeFolderFiles(fl);
                          setFolderStats({
                            rasters: rasters.length,
                            dziBundles: dziBundles.length,
                            fileCount: fl.length,
                          });
                        }}
                        disabled={isUploading}
                        className="w-full text-xs file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-white hover:file:opacity-90 transition-all font-bold p-1 rounded-2xl border-2 border-dashed border-border hover:border-primary cursor-pointer disabled:opacity-50"
                      />
                      {folderStats && (
                        <div className="rounded-2xl border border-border bg-black/[0.03] dark:bg-white/[0.04] px-4 py-3 text-xs font-semibold space-y-1">
                          <p>
                            <span className="opacity-60">Taranan dosya:</span> {folderStats.fileCount}
                          </p>
                          <p>
                            <span className="opacity-60">Dönüştürülecek görüntü:</span> {folderStats.rasters}{" "}
                            <span className="opacity-40">(tif/jpg/png/gif/svs…)</span>
                          </p>
                          <p>
                            <span className="opacity-60">Hazır DZI paketi:</span> {folderStats.dziBundles}{" "}
                            <span className="opacity-40">(.dzi + _files)</span>
                          </p>
                        </div>
                      )}
                      <p className="text-[10px] font-medium opacity-55 px-1 leading-relaxed">
                        Her dosya için başlık, dosya adından (ve klasör yapısından) üretilir. Açıklama ve başlığı
                        sonra yönetim panelinden düzenleyebilirsiniz. Aynı sınıflandırma (müfredat, branş, boya…)
                        tüm öğelere uygulanır.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Görüntü URL</label>
                      <input 
                        type="url"
                        placeholder="https://example.com/slide.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        required={tab === "url"}
                        disabled={isUploading}
                        className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                  )}

                  {tab !== "folder" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">
                          Başlık
                        </label>
                        <input 
                          type="text"
                          placeholder="Örn: Akut Glomerülonefrit"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          required={tab !== "folder"}
                          disabled={isUploading}
                          className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">
                          Özet açıklama
                        </label>
                        <textarea 
                          rows={3}
                          placeholder="Kısa notlar..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          disabled={isUploading}
                          className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 resize-none"
                        />
                      </div>
                    </>
                  )}

                  {tab === "folder" && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">
                        Ortak açıklama (isteğe bağlı, tüm dosyalara)
                      </label>
                      <textarea 
                        rows={2}
                        placeholder="Boş bırakılabilir; tek tek yönetim panelinden eklenebilir."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isUploading}
                        className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 resize-none"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Akademik iz</label>
                    <select
                      value={curriculumTrack}
                      onChange={(e) => setCurriculumTrack(e.target.value)}
                      disabled={isUploading}
                      className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 cursor-pointer appearance-none"
                    >
                      {CURRICULUM_TRACK_UPLOAD.map((o) => (
                        <option key={o.value || "default"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showScienceUnit && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Temel ünite (konu)</label>
                      <select
                        value={scienceUnit}
                        onChange={(e) => setScienceUnit(e.target.value)}
                        disabled={isUploading}
                        className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 cursor-pointer appearance-none"
                      >
                        <option value="">— Seçin —</option>
                        {SCIENCE_UNIT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Klinik branş</label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      disabled={isUploading}
                      className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 cursor-pointer appearance-none"
                    >
                      <option value="">— Opsiyonel —</option>
                      {Object.entries(HISTOLOGY_SPECIALTIES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Boya</label>
                      <select
                        value={stain}
                        onChange={(e) => setStain(e.target.value)}
                        disabled={isUploading}
                        className="w-full rounded-2xl px-4 py-3 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 cursor-pointer appearance-none"
                      >
                        {STAIN_OPTIONS.map((s) => (
                          <option key={s || "all"} value={s}>
                            {s || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Organ / doku</label>
                      <select
                        value={organ}
                        onChange={(e) => setOrgan(e.target.value)}
                        disabled={isUploading}
                        className="w-full rounded-2xl px-4 py-3 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 cursor-pointer appearance-none"
                      >
                        {ORGAN_OPTIONS.map((o) => (
                          <option key={o || "all"} value={o}>
                            {o || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                        {progress >= 100 ? "İŞLENİYOR / DÖNÜŞTÜRÜLÜYOR..." : "DOSYA YÜKLENİYOR..."}
                      </span>
                    </div>
                    <span className="text-sm font-black text-primary">%{progress}</span>
                  </div>
                  <div className="w-full h-4 bg-black/5 dark:bg-white/5 rounded-full border border-black/5 dark:border-white/5 p-1 overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500 shadow-lg relative overflow-hidden"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-pulse" />
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20" />
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center gap-3 animate-head-shake">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isUploading}
                  className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-border hover:bg-black/5 transition-all disabled:opacity-50"
                >
                  İPTAL
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-primary text-white shadow-xl hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {tab === "folder" ? "KLASÖRÜ İŞLE" : "ŞİMDİ YAYINLA"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
