"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { microscopyApi, AnnotationOut, AnnotationCreate, HistologyImage } from "@/lib/api";
import { ZoomIn, ZoomOut, Maximize2, StickyNote, X, Trash2, Layers } from "lucide-react";
import "./histology-viewer.css";

declare global {
  interface Window {
    OpenSeadragon: (options: Record<string, unknown>) => OSDViewer;
  }
}

interface OSDViewer {
  viewport: { zoomBy: (f: number) => void; goHome: () => void };
  addHandler: (event: string, cb: () => void) => void;
  destroy: () => void;
}

interface Props {
  image: HistologyImage;
}

interface PendingAnnotation {
  x: number; y: number; width: number; height: number;
  // piksel koordinatları (overlay çizimi için)
  px: number; py: number; pw: number; ph: number;
}

const OSD_CDN =
  "https://cdn.jsdelivr.net/npm/openseadragon@6.0.2/build/openseadragon/openseadragon.min.js";

/**
 * Wikimedia Commons URL'lerini thumbnail servisine yönlendirir.
 * Büyük JPEG'ler (5-15MB) tarayıcı canvas limitine takılır;
 * 2000px thumbnail (~300KB) hem kaliteli hem güvenilir yüklenir.
 */
/**
 * Görüntü URL'lerini sistem ayarlarına göre tam URL'ye dönüştürür.
 */
function resolveFullImageUrl(url: string): string {
  if (!url) return "";
  
  // Eğer link zaten bir dış URL ise (örn: Wikimedia), doğrudan onu kullan.
  if (url.startsWith("http")) return url;
  
  // Yerel dosyalar için URL temizliği
  const cleanPath = url.replace(/^\/+/, "");
  // Eğer yol zaten tiles/ ile başlamıyorsa, başına ekle
  const finalPath = cleanPath.startsWith("tiles/") ? `/${cleanPath}` : `/tiles/${cleanPath}`;
  
  // Unicode karakterleri (böbrek -> b%C3%B6brek) encode etmeliyiz
  const encodedPath = encodeURI(finalPath);
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/?$/, "");
  const baseUrl =
    fromEnv ||
    (typeof window !== "undefined" ? window.location.origin : "");
  
  return `${baseUrl}${encodedPath}`;
}

export default function HistologyViewer({ image }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef   = useRef<HTMLDivElement>(null);
  const viewerRef    = useRef<OSDViewer | null>(null);

  const [osdReady, setOsdReady]       = useState(false);
  const [annotations, setAnnotations] = useState<AnnotationOut[]>([]);
  const annotationsRef                = useRef<AnnotationOut[]>([]);
  const [pending, setPending]         = useState<PendingAnnotation | null>(null);
  const pendingRef                    = useRef<PendingAnnotation | null>(null);
  const [noteText, setNoteText]       = useState("");
  const [labelText, setLabelText]     = useState("");
  const [annotateMode, setAnnotateMode] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Çizim state'i — ref ile sakla, re-render gerektirmiyor
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const selBox    = useRef<HTMLDivElement | null>(null);

  // Annotationları yükle
  useEffect(() => {
    microscopyApi
      .listAnnotations(image.id)
      .then((res) => setAnnotations(res.data))
      .catch(() => setAnnotations([]));
  }, [image.id]);

  useEffect(() => {
    annotationsRef.current = annotations;
    if (osdReady) updateAnnotationsOverlay();
  }, [annotations, osdReady]);

  useEffect(() => {
    pendingRef.current = pending;
    if (osdReady) updateAnnotationsOverlay();
  }, [pending, osdReady]);

  const updateAnnotationsOverlay = () => {
    if (!viewerRef.current || !window.OpenSeadragon) return;
    const v = viewerRef.current;
    
    // update saved
    annotationsRef.current.forEach((a) => {
      const el = document.getElementById(`anno-${a.id}`);
      if (!el) return;
      const pt1 = v.viewport.viewportToViewerElementCoordinates(new window.OpenSeadragon.Point(a.x, a.y));
      const pt2 = v.viewport.viewportToViewerElementCoordinates(new window.OpenSeadragon.Point(a.x + a.width, a.y + a.height));
      el.style.left = `${pt1.x}px`;
      el.style.top = `${pt1.y}px`;
      el.style.width = `${pt2.x - pt1.x}px`;
      el.style.height = `${pt2.y - pt1.y}px`;
    });

    // update pending
    if (pendingRef.current) {
        const el = document.getElementById("anno-pending");
        if (el) {
          const pt1 = v.viewport.viewportToViewerElementCoordinates(new window.OpenSeadragon.Point(pendingRef.current.x, pendingRef.current.y));
          const pt2 = v.viewport.viewportToViewerElementCoordinates(new window.OpenSeadragon.Point(pendingRef.current.x + pendingRef.current.width, pendingRef.current.y + pendingRef.current.height));
          el.style.left = `${pt1.x}px`;
          el.style.top = `${pt1.y}px`;
          el.style.width = `${pt2.x - pt1.x}px`;
          el.style.height = `${pt2.y - pt1.y}px`;
        }
    }
  };

  // OpenSeadragon başlat
  useEffect(() => {
    if (!osdReady || !containerRef.current || !window.OpenSeadragon) return;

    const fullUrl = resolveFullImageUrl(image.image_url);
    console.log("OSD Loading:", fullUrl);

    const viewer = window.OpenSeadragon({
      element: containerRef.current,
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@6.0.2/build/openseadragon/images/",
      tileSources: fullUrl.endsWith(".dzi")
        ? fullUrl
        : {
            type: "image",
            url: fullUrl,
            crossOriginPolicy: "Anonymous",
          },
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
      navigatorSizeRatio: 0.18,
      navigatorMaintainSizeRatio: true,
      showNavigationControl: false,
      showZoomControl: false,
      showHomeControl: false,
      showFullPageControl: false,
      animationTime: 0.35,
      blendTime: 0.12,
      constrainDuringPan: true,
      maxZoomPixelRatio: 12,
      minZoomImageRatio: 0.45,
      visibilityRatio: 0.55,
      zoomPerClick: 1,
      zoomPerScroll: 1.15,
      gestureSettingsMouse: { clickToZoom: false },
    });

    viewer.addHandler("open", () => {
      setLoading(false);
      setError(null);
    });
    
    viewer.addHandler("open-failed", (event) => {
      console.error("OSD Failed to open:", event);
      setLoading(false);
      setError("Görüntü dosyasına erişilemedi. Lütfen sunucu bağlantısını ve dosya yolunu kontrol edin.");
    });

    viewer.addHandler("animation", updateAnnotationsOverlay);
    viewer.addHandler("update-viewport", updateAnnotationsOverlay);
    viewer.addHandler("resize", updateAnnotationsOverlay);
    viewer.addHandler("animation-finish", updateAnnotationsOverlay);

    viewerRef.current = viewer;
    return () => { viewer.destroy(); viewerRef.current = null; };
  }, [osdReady, image.image_url]);

  // ── Annotation overlay mouse/touch handler'ları ─────────────────────────────
  const onOverlayDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!overlayRef.current) return;
    if ("touches" in e && e.touches.length > 1) return;
    const pos = "touches" in e ? e.touches[0] : e;
    
    const rect = overlayRef.current.getBoundingClientRect();
    drawStart.current = { x: pos.clientX - rect.left, y: pos.clientY - rect.top };

    // Canlı seçim kutusu oluştur
    const box = document.createElement("div");
    box.style.cssText = `
      position:absolute; border:2px dashed #3b82f6; background:rgba(59,130,246,0.08);
      pointer-events:none; z-index:30;
    `;
    overlayRef.current.appendChild(box);
    selBox.current = box;
  };

  const onOverlayMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawStart.current || !selBox.current || !overlayRef.current) return;
    const pos = "touches" in e ? e.touches[0] : e;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const curX = pos.clientX - rect.left;
    const curY = pos.clientY - rect.top;
    const x = Math.min(drawStart.current.x, curX);
    const y = Math.min(drawStart.current.y, curY);
    const w = Math.abs(curX - drawStart.current.x);
    const h = Math.abs(curY - drawStart.current.y);
    selBox.current.style.left   = `${x}px`;
    selBox.current.style.top    = `${y}px`;
    selBox.current.style.width  = `${w}px`;
    selBox.current.style.height = `${h}px`;
  };

  const onOverlayUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawStart.current || !overlayRef.current) return;
    const pos = "changedTouches" in e ? e.changedTouches[0] : (e as React.MouseEvent);
    const rect = overlayRef.current.getBoundingClientRect();
    const endX = pos.clientX - rect.left;
    const endY = pos.clientY - rect.top;
    const w = Math.abs(endX - drawStart.current.x);
    const h = Math.abs(endY - drawStart.current.y);

    // Canlı kutuyu temizle
    if (selBox.current) { selBox.current.remove(); selBox.current = null; }

    if (w < 12 || h < 12) { drawStart.current = null; return; }

    const x = Math.min(drawStart.current.x, endX);
    const y = Math.min(drawStart.current.y, endY);
    drawStart.current = null;

    if (viewerRef.current && window.OpenSeadragon) {
      const ptTopLeft = viewerRef.current.viewport.viewerElementToViewportCoordinates(new window.OpenSeadragon.Point(x, y));
      const ptBottomRight = viewerRef.current.viewport.viewerElementToViewportCoordinates(new window.OpenSeadragon.Point(x + w, y + h));
      
      setPending({
        x: ptTopLeft.x, y: ptTopLeft.y,
        width: ptBottomRight.x - ptTopLeft.x, height: ptBottomRight.y - ptTopLeft.y,
        px: x, py: y, pw: w, ph: h,
      });
    } else {
        setPending({
          x: x / rect.width, y: y / rect.height,
          width: w / rect.width, height: h / rect.height,
          px: x, py: y, pw: w, ph: h,
        });
    }

    setNoteText("");
    setLabelText("");
  };

  const saveAnnotation = async () => {
    if (!pending || !noteText.trim()) return;
    const payload: AnnotationCreate = {
      x: pending.x, y: pending.y, width: pending.width, height: pending.height,
      label: labelText.trim() || undefined,
      note: noteText.trim(),
    };
    try {
      const res = await microscopyApi.addAnnotation(image.id, payload);
      setAnnotations((prev) => [...prev, res.data]);
      setPending(null);
      setAnnotateMode(false);
    } catch { /* sessiz */ }
  };

  const deleteAnnotation = async (id: string) => {
    await microscopyApi.deleteAnnotation(image.id, id);
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <>
      <Script src={OSD_CDN} onLoad={() => setOsdReady(true)} strategy="afterInteractive" />

      <div className="flex flex-col gap-4">
        {/* Görüntüleyici + overlay — HistAI benzeri cam çerçeve + yüzen kontroller */}
        <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_24px_80px_-12px_rgba(88,28,135,0.35)] bg-slate-950 select-none">
          <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none flex items-center justify-between px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent">
            <div className="pointer-events-none flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-violet-300/90">
              <Layers size={14} className="text-violet-400" />
              Dijital preparat
            </div>
          </div>

          {(loading || !osdReady) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-[35] gap-2">
              <div className="h-9 w-9 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
              <span className="text-slate-300 text-sm font-medium">
                {!osdReady ? "Görüntüleyici hazırlanıyor…" : "Pyramidal görüntü yükleniyor…"}
              </span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 z-[35] px-6">
              <span className="text-red-400 text-sm text-center">{error}</span>
            </div>
          )}

          <div
            key={image.id}
            ref={(el) => {
              if (el) {
                if (containerRef.current !== el) {
                  el.innerHTML = "";
                  containerRef.current = el;
                }
              }
            }}
            className="hist-osd-root w-full h-[min(72vh,640px)] min-h-[360px]"
          />

          <div
            ref={overlayRef}
            className={`absolute inset-0 z-20 ${
              annotateMode ? "cursor-crosshair" : "pointer-events-none"
            }`}
            onMouseDown={annotateMode ? onOverlayDown : undefined}
            onMouseMove={annotateMode ? onOverlayMove : undefined}
            onMouseUp={annotateMode ? onOverlayUp : undefined}
            onTouchStart={annotateMode ? onOverlayDown : undefined}
            onTouchMove={annotateMode ? onOverlayMove : undefined}
            onTouchEnd={annotateMode ? onOverlayUp : undefined}
            style={{ touchAction: annotateMode ? "none" : "auto" }}
          >
            {/* Kaydedilmiş annotation kutuları */}
            {annotations.map((a) => (
              <div
                id={`anno-${a.id}`}
                key={a.id}
                className="absolute border-2 border-yellow-400 group pointer-events-auto"
              >
                {a.label && (
                  <span className="absolute -top-5 left-0 bg-yellow-400 text-black text-xs px-1 rounded whitespace-nowrap">
                    {a.label}
                  </span>
                )}
                <div className="hidden group-hover:flex absolute top-full left-0 mt-1 bg-zinc-900 text-white text-xs p-2 rounded-lg shadow-lg max-w-[220px] z-30 whitespace-pre-wrap flex-col gap-1">
                  <span>{a.note}</span>
                  <button
                    onClick={() => deleteAnnotation(a.id)}
                    className="text-red-400 hover:text-red-300 flex items-center gap-0.5 self-start"
                  >
                    <Trash2 size={11} /> sil
                  </button>
                </div>
              </div>
            ))}

            {/* Onay bekleyen (yeni çizilen) kutu */}
            {pending && (
              <div
                id="anno-pending"
                className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
              />
            )}
          </div>

          {/* Yüzen araç çubuğu — overlay üstünde, tıklanabilir */}
          <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center justify-center gap-1.5 px-2 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-xl max-w-[95%]">
            <button
              type="button"
              onClick={() => viewerRef.current?.viewport.zoomBy(1.45)}
              disabled={annotateMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-100 text-xs font-bold transition-colors disabled:opacity-35 border border-white/5"
            >
              <ZoomIn size={16} className="text-violet-400" /> Yakın
            </button>
            <button
              type="button"
              onClick={() => viewerRef.current?.viewport.zoomBy(0.69)}
              disabled={annotateMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-100 text-xs font-bold transition-colors disabled:opacity-35 border border-white/5"
            >
              <ZoomOut size={16} className="text-cyan-400" /> Uzak
            </button>
            <button
              type="button"
              onClick={() => viewerRef.current?.viewport.goHome()}
              disabled={annotateMode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-100 text-xs font-bold transition-colors disabled:opacity-35 border border-white/5"
            >
              <Maximize2 size={16} className="text-slate-400" /> Tümü
            </button>
            <div className="w-px h-6 bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={() => {
                setAnnotateMode((v) => !v);
                setPending(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                annotateMode
                  ? "bg-violet-600 text-white border-violet-400/50 shadow-lg shadow-violet-500/20"
                  : "bg-white/5 text-slate-200 border-white/5 hover:bg-white/10"
              }`}
            >
              <StickyNote size={16} />
              {annotateMode ? "Çiz — kare seç" : "Not alanı"}
            </button>
          </div>
          {annotateMode && (
            <p className="pointer-events-none absolute bottom-[5.25rem] left-1/2 -translate-x-1/2 z-40 text-[11px] font-semibold text-violet-300/90 animate-pulse">
              Görüntü üzerinde sürükleyerek alan seç
            </p>
          )}
        </div>

        {/* Not formu — kare çizildikten sonra açılır */}
        {pending && (
          <div className="rounded-xl border-2 border-blue-500 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                Seçili alan için not ekle
              </span>
              <button onClick={() => setPending(null)}>
                <X size={16} className="text-zinc-400 hover:text-zinc-600" />
              </button>
            </div>
            <input
              autoFocus
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kısa etiket (örn: Granülom, Glomerül)"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
            />
            <textarea
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Eğitim notu, patolojik bulgu açıklaması..."
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPending(null)}
                className="px-4 py-1.5 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={saveAnnotation}
                disabled={!noteText.trim()}
                className="px-4 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        )}

        {/* Annotation listesi */}
        {annotations.length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <p className="text-sm font-medium mb-3">Notlar ({annotations.length})</p>
            <ul className="flex flex-col gap-2">
              {annotations.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                  <div className="flex-1">
                    {a.label && (
                      <span className="font-medium text-yellow-600 dark:text-yellow-400 mr-1">{a.label}:</span>
                    )}
                    {a.note}
                  </div>
                  <button onClick={() => deleteAnnotation(a.id)} className="text-zinc-400 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
