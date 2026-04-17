/** Klasör seçiminden gelen dosyaları DZI paketleri ve tek tek dönüştürülebilir görsellere ayırır. */

const RASTER = /\.(jpg|jpeg|png|gif)$/i;
const WSI = /\.(tiff?|tif|svs|ndpi)$/i;
const DZI = /\.dzi$/i;

function norm(p: string): string {
  return p.replace(/\\/g, "/");
}

function dirname(path: string): string {
  const n = norm(path);
  const i = n.lastIndexOf("/");
  return i <= 0 ? "" : n.slice(0, i);
}

function basename(path: string): string {
  const n = norm(path);
  const i = n.lastIndexOf("/");
  return i < 0 ? n : n.slice(i + 1);
}

/** Dosya adından (uzantısız) okunaklı başlık — klasör yüklemesinde varsayılan başlık. */
export function titleFromRelativePath(relativePath: string): string {
  const base = basename(relativePath);
  const noExt = base.replace(/\.[^.]+$/, "");
  return noExt.replace(/[_-]+/g, " ").trim() || base;
}

function isInsideDziTileTree(p: string): boolean {
  return /(^|\/)[^/]+_files(\/|$)/i.test(norm(p));
}

export type DziBundleGroup = { dzi: File; tiles: File[] };

export function categorizeFolderFiles(files: FileList): {
  rasters: File[];
  dziBundles: DziBundleGroup[];
} {
  const list = Array.from(files);

  const dzis = list.filter((f) => DZI.test(f.name) && !isInsideDziTileTree(f.webkitRelativePath));

  const bundles: DziBundleGroup[] = [];
  const used = new Set<string>();

  for (const dzi of dzis) {
    const dir = dirname(dzi.webkitRelativePath);
    const stem = dzi.name.replace(/\.dzi$/i, "");
    const prefix = dir ? `${dir}/${stem}_files/` : `${stem}_files/`;
    const prefixLower = norm(prefix).toLowerCase();
    const tiles = list.filter((f) => {
      if (f === dzi) return false;
      return norm(f.webkitRelativePath).toLowerCase().startsWith(prefixLower);
    });
    bundles.push({ dzi, tiles });
    used.add(norm(dzi.webkitRelativePath));
    tiles.forEach((t) => used.add(norm(t.webkitRelativePath)));
  }

  const rasters = list.filter((f) => {
    const p = norm(f.webkitRelativePath);
    if (used.has(p)) return false;
    if (isInsideDziTileTree(p)) return false;
    const n = f.name.toLowerCase();
    return RASTER.test(n) || WSI.test(n);
  });

  return { rasters, dziBundles: bundles };
}
