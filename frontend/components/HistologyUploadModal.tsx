"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, Link as LinkIcon, Microscope, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { microscopyApi } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HistologyUploadModal({ isOpen, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<"tiff" | "url">("tiff");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [specialty, setSpecialty] = useState("pathology");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError(null);
      setProgress(0);
      setIsUploading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      if (tab === "tiff") {
        if (!file) throw new Error("Lütfen bir TIFF dosyası seçin.");
        await microscopyApi.uploadTiff(
          file, 
          { title, description, specialty }, 
          (pct) => setProgress(pct)
        );
      } else {
        if (!imageUrl) throw new Error("Lütfen bir görüntü URL'si girin.");
        await microscopyApi.createImage({ 
          title, description, specialty, image_url: imageUrl 
        });
        setProgress(100);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || "Bir hata oluştu.");
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
              <div className="flex p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 w-fit mx-auto mb-8">
                <button
                  type="button"
                  onClick={() => setTab("tiff")}
                  disabled={isUploading}
                  className={`flex items-center gap-2 px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                    tab === "tiff" ? "bg-white dark:bg-zinc-800 shadow-lg text-primary" : "opacity-40 hover:opacity-100"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  TIFF YÜKLE
                </button>
                <button
                  type="button"
                  onClick={() => setTab("url")}
                  disabled={isUploading}
                  className={`flex items-center gap-2 px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                    tab === "url" ? "bg-white dark:bg-zinc-800 shadow-lg text-primary" : "opacity-40 hover:opacity-100"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  URL İLE EKLE
                </button>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* File/URL Input */}
                  {tab === "tiff" ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">TIFF Dosyası</label>
                      <div className="relative group/file">
                        <input 
                          type="file" 
                          accept=".tiff,.tif,.svs"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          required={tab === "tiff"}
                          disabled={isUploading}
                          className="w-full text-xs file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-white hover:file:opacity-90 transition-all font-bold p-1 rounded-2xl border-2 border-dashed border-border hover:border-primary cursor-pointer disabled:opacity-50"
                        />
                      </div>
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

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Vaka Başlığı</label>
                    <input 
                      type="text"
                      placeholder="Örn: Akut Glomerülonefrit"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      disabled={isUploading}
                      className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Branş / Kategori</label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      disabled={isUploading}
                      className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 cursor-pointer appearance-none"
                    >
                      <option value="pathology">Genel Patoloji</option>
                      <option value="nephrology">Nefroloji (Böbrek)</option>
                      <option value="pulmonology">Göğüs Hastalıkları</option>
                      <option value="neurology">Nöroloji</option>
                      <option value="cardiology">Kardiyoloji</option>
                      <option value="hematology">Hematoloji</option>
                      <option value="gastroenterology">Gastroenteroloji</option>
                      <option value="dermatology">Dermatoloji</option>
                      <option value="other">Diğer</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Özet Açıklama</label>
                    <textarea 
                      rows={3}
                      placeholder="Vaka hakkında kısa notlar..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isUploading}
                      className="w-full rounded-2xl px-5 py-4 text-sm font-bold border border-border bg-black/5 dark:bg-white/5 focus:ring-4 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 resize-none"
                    />
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
                  ŞİMDİ YAYINLA
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
