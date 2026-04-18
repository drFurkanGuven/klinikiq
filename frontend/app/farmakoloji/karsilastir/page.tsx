"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { drugsApi, type DrugDetail, type DrugSummary } from "@/lib/api";
import { ArrowLeft, Loader2, LogOut, X } from "lucide-react";

const MAX_DRUGS = 4;

export default function KarsilastirPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searchResults, setSearchResults] = useState<DrugSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [selected, setSelected] = useState<DrugSummary[]>([]);
  const [maxWarn, setMaxWarn] = useState(false);

  const [compareData, setCompareData] = useState<DrugDetail[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji/karsilastir");
    }
  }, [mounted, router]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQ.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearchLoading(true);
      try {
        const res = await drugsApi.search(debouncedQ, 1, 10);
        if (!cancelled) setSearchResults(res.data.results ?? []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const addDrug = (item: DrugSummary) => {
    setMaxWarn(false);
    if (selected.some((s) => s.drugbank_id === item.drugbank_id)) {
      setDropdownOpen(false);
      setSearchQuery("");
      return;
    }
    if (selected.length >= MAX_DRUGS) {
      setMaxWarn(true);
      return;
    }
    setSelected((prev) => [...prev, item]);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  const removeDrug = (id: string) => {
    setSelected((prev) => prev.filter((s) => s.drugbank_id !== id));
    setCompareData([]);
    setCompareError(null);
  };

  const runCompare = async () => {
    if (selected.length < 2) return;
    setCompareLoading(true);
    setCompareError(null);
    try {
      const res = await drugsApi.compare(selected.map((s) => s.drugbank_id));
      setCompareData(res.data.drugs ?? []);
    } catch {
      setCompareError("Karşılaştırma yüklenemedi.");
      setCompareData([]);
    } finally {
      setCompareLoading(false);
    }
  };

  const colspan = compareData.length + 1;

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav
        className="glass border-b sticky top-0 z-50 transition-all font-sans"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/farmakoloji" className="p-2.5 rounded-xl transition-all hover:bg-black/5 shrink-0" style={{ color: "var(--text-muted)" }} aria-label="Farmakoloji">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="font-black text-lg tracking-tight truncate">İlaç Karşılaştırma</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <button type="button" onClick={logout} className="group flex items-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-black/5" style={{ color: "var(--text-muted)" }}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        <div ref={wrapRef} className="relative max-w-2xl space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-50 block" style={{ color: "var(--text-muted)" }}>
            İlaç ara ve seç (2–4)
          </label>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="İlaç adı (min. 2 karakter)…"
            className="w-full rounded-xl border px-3 py-2.5 text-sm font-medium"
            style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          {maxWarn && (
            <p className="text-xs font-bold" style={{ color: "var(--warning)" }}>
              En fazla 4 ilaç seçebilirsiniz.
            </p>
          )}
          {dropdownOpen && debouncedQ.length >= 2 && (
            <div
              className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-xl max-h-64 overflow-y-auto py-1"
              style={{ background: "var(--surface)", borderColor: "var(--border)", backdropFilter: "blur(12px)" }}
            >
              {searchLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
                </div>
              )}
              {!searchLoading && searchResults.length === 0 && (
                <p className="px-3 py-3 text-sm font-medium text-center" style={{ color: "var(--text-muted)" }}>
                  Sonuç yok
                </p>
              )}
              {!searchLoading &&
                searchResults.map((r) => (
                  <button
                    key={r.drugbank_id}
                    type="button"
                    onClick={() => addDrug(r)}
                    className="w-full text-left px-3 py-2.5 text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--text)" }}
                  >
                    {r.name}{" "}
                    <span className="text-xs font-medium opacity-50" style={{ color: "var(--text-muted)" }}>
                      {r.drugbank_id}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selected.map((s) => (
            <span
              key={s.drugbank_id}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold"
              style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }}
            >
              {s.name}
              <button type="button" onClick={() => removeDrug(s.drugbank_id)} className="p-0.5 rounded-full hover:bg-black/10" aria-label="Kaldır">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div>
          <button
            type="button"
            disabled={selected.length < 2 || compareLoading}
            onClick={() => void runCompare()}
            className="px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wide border disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
          >
            {compareLoading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : "Karşılaştır"}
          </button>
        </div>

        {compareError && (
          <div className="rounded-xl border px-3 py-2 text-sm font-medium max-w-xl" style={{ borderColor: "var(--error, #b91c1c)", color: "var(--error, #b91c1c)" }}>
            {compareError}
          </div>
        )}

        {compareData.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full min-w-[640px] text-sm border-collapse">
              <thead
                className="sticky top-0 z-20 shadow-sm"
                style={{ background: "var(--surface)" }}
              >
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-3 py-3 font-black text-xs uppercase tracking-wider w-40" style={{ color: "var(--text-muted)" }}>
                    Özellik
                  </th>
                  {compareData.map((d) => (
                    <th key={d.drugbank_id} className="text-left px-3 py-3 font-black text-xs min-w-[140px] max-w-[220px]" style={{ color: "var(--text)" }}>
                      {d.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SectionRow colspan={colspan} label="Genel bilgi" />
                <DataRow label="İlaç adı" values={compareData.map((d) => d.name)} odd={false} />
                <DataRow label="Tür" values={compareData.map((d) => d.drug_type)} odd />
                <DataRow label="Durum" values={compareData.map((d) => d.groups)} odd={false} />
                <DataRow label="ATC" values={compareData.map((d) => d.atc_codes)} odd />
                <SectionRow colspan={colspan} label="Klinik" />
                <ScrollRow label="Endikasyon" values={compareData.map((d) => d.indication)} odd={false} />
                <ScrollRow label="Mekanizma" values={compareData.map((d) => d.mechanism)} odd />
                <ScrollRow label="Toksisite" values={compareData.map((d) => d.toxicity)} odd={false} />
                <SectionRow colspan={colspan} label="Farmakokinetik" />
                <DataRow label="Yarı ömür" values={compareData.map((d) => d.half_life)} odd />
                <DataRow label="Protein bağlanması" values={compareData.map((d) => d.protein_binding)} odd={false} />
                <DataRow label="Metabolizma" values={compareData.map((d) => d.metabolism)} odd />
                <DataRow label="Emilim" values={compareData.map((d) => d.absorption)} odd={false} />
                <DataRow label="Dağılım hacmi" values={compareData.map((d) => d.volume_of_distribution)} odd />
                <DataRow label="Eliminasyon" values={compareData.map((d) => d.route_of_elimination)} odd={false} />
                <SectionRow colspan={colspan} label="Etkileşim" />
                <ScrollRow label="Gıda etkileşimi" values={compareData.map((d) => d.food_interactions)} odd />
              </tbody>
            </table>
          </div>
        )}

        {compareData.length > 0 && (
          <p className="text-xs font-medium max-w-2xl leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Veriler DrugBank veritabanından alınmıştır. Klinik karar vermek için kullanmayın.
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}

function SectionRow({ colspan, label }: { colspan: number; label: string }) {
  return (
    <tr>
      <td
        colSpan={colspan}
        className="px-3 py-2 text-sm font-semibold uppercase tracking-wider"
        style={{ background: "var(--surface)", color: "var(--text)", borderTop: "1px solid var(--border)" }}
      >
        {label}
      </td>
    </tr>
  );
}

function cellVal(v: string | null | undefined): string {
  const s = v?.trim();
  return s ? s : "—";
}

function DataRow({ label, values, odd }: { label: string; values: (string | null | undefined)[]; odd: boolean }) {
  return (
    <tr style={{ background: odd ? "color-mix(in srgb, var(--surface) 65%, transparent)" : undefined }}>
      <td className="px-3 py-2.5 font-bold text-xs align-top" style={{ color: "var(--text-muted)" }}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2.5 font-medium align-top whitespace-pre-wrap break-words" style={{ color: "var(--text)" }}>
          {cellVal(v)}
        </td>
      ))}
    </tr>
  );
}

function ScrollRow({ label, values, odd }: { label: string; values: (string | null | undefined)[]; odd: boolean }) {
  return (
    <tr style={{ background: odd ? "color-mix(in srgb, var(--surface) 65%, transparent)" : undefined }}>
      <td className="px-3 py-2.5 font-bold text-xs align-top" style={{ color: "var(--text-muted)" }}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2.5 font-medium align-top max-w-[280px]">
          <div className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-sm" style={{ color: "var(--text)" }}>
            {cellVal(v)}
          </div>
        </td>
      ))}
    </tr>
  );
}
