"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { antibioticsApi, type AntibioticByDrugClass } from "@/lib/api";
import { ArrowLeft, ChevronDown, Loader2, LogOut, Shield } from "lucide-react";

/** "macrolide antibiotic" → "Macrolide" */
function formatClassLabel(raw: string): string {
  let s = raw.trim();
  const lower = s.toLowerCase();
  if (lower.endsWith(" antibiotic")) {
    s = s.slice(0, -" antibiotic".length);
  }
  if (!s) return raw;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AntibiyotiklerPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [classes, setClasses] = useState<string[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [profile, setProfile] = useState<AntibioticByDrugClass | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [expandedDesc, setExpandedDesc] = useState<number | null>(null);

  const sortedClasses = useMemo(() => [...classes].sort((a, b) => a.localeCompare(b, "tr")), [classes]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login?next=/farmakoloji/antibiyotikler");
    }
  }, [mounted, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setClassesLoading(true);
      setClassesError(null);
      try {
        const res = await antibioticsApi.drugClasses();
        if (!cancelled) setClasses(res.data.classes ?? []);
      } catch {
        if (!cancelled) {
          setClassesError("Sınıf listesi yüklenemedi.");
          setClasses([]);
        }
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setProfile(null);
      setExpandedDesc(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      setProfileError(null);
      setExpandedDesc(null);
      try {
        const res = await antibioticsApi.byDrugClass(selectedClass);
        if (!cancelled) setProfile(res.data);
      } catch {
        if (!cancelled) {
          setProfileError("Profil yüklenemedi.");
          setProfile(null);
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  if (!mounted) return null;

  const drugbankLink = selectedClass
    ? `/farmakoloji/ilaclar?q=${encodeURIComponent(selectedClass)}`
    : "/farmakoloji/ilaclar";

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
            <span className="font-black text-lg tracking-tight truncate">Antibiyotik Rehberi</span>
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

      <main className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full min-h-0">
        <aside
          className="w-full md:w-[30%] border-b md:border-b-0 md:border-r flex flex-col min-h-[36vh] md:min-h-[calc(100vh-4rem)]"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="p-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: "var(--text-muted)" }}>
              Antibiyotik sınıfı
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {classesLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
              </div>
            )}
            {classesError && (
              <div className="rounded-xl border px-3 py-2 text-sm font-medium m-2" style={{ borderColor: "var(--error, #b91c1c)", color: "var(--error, #b91c1c)" }}>
                {classesError}
              </div>
            )}
            <ul className="space-y-1">
              {sortedClasses.map((c) => {
                const sel = selectedClass === c;
                return (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setSelectedClass(c)}
                      className="w-full text-left rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors"
                      style={{
                        borderColor: sel ? "var(--primary)" : "var(--border)",
                        background: sel ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "var(--surface)",
                        color: sel ? "var(--primary)" : "var(--text)",
                      }}
                    >
                      {formatClassLabel(c)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-h-[50vh] md:min-h-[calc(100vh-4rem)]">
          {!selectedClass && !profileLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 py-16">
              <Shield className="w-16 h-16 opacity-25" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>
                Bir antibiyotik sınıfı seçin
              </p>
            </div>
          )}

          {selectedClass && profileLoading && (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
          )}

          {selectedClass && profileError && (
            <div className="p-4">
              <div className="rounded-xl border px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--error, #b91c1c)", color: "var(--error, #b91c1c)" }}>
                {profileError}
              </div>
            </div>
          )}

          {selectedClass && profile && !profileLoading && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl md:text-2xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                  {formatClassLabel(profile.drug_class)}
                </h2>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums"
                  style={{ background: "color-mix(in srgb, var(--text-muted) 15%, transparent)", color: "var(--text-muted)" }}
                >
                  {profile.total} kayıt
                </span>
              </div>

              <div className="space-y-4">
                {profile.resistance_mechanisms.map((g, idx) => {
                  const desc = g.entries[0]?.description;
                  const open = expandedDesc === idx;
                  return (
                    <div
                      key={`${g.resistance_mechanism}-${idx}`}
                      className="rounded-xl border p-4 backdrop-blur-sm"
                      style={{
                        background: "color-mix(in srgb, var(--surface) 92%, transparent)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h3 className="font-black text-base" style={{ color: "var(--text)" }}>
                          {g.resistance_mechanism === "—" ? "Belirtilmemiş" : g.resistance_mechanism}
                        </h3>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
                          style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)" }}
                        >
                          {g.count}
                        </span>
                      </div>

                      {g.gene_families.length > 0 && (
                        <p className="text-xs font-medium mb-3 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                          <span className="font-black" style={{ color: "var(--text)" }}>
                            Gen aileleri:{" "}
                          </span>
                          {g.gene_families.join(", ")}
                        </p>
                      )}

                      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                        <table className="w-full text-sm min-w-[520px]">
                          <thead className="sticky top-0 z-10" style={{ background: "var(--surface)" }}>
                            <tr style={{ borderBottom: "1px solid var(--border)" }}>
                              <th className="text-left px-2 py-2 font-black text-[10px] uppercase">ARO Accession</th>
                              <th className="text-left px-2 py-2 font-black text-[10px] uppercase">İsim</th>
                              <th className="text-left px-2 py-2 font-black text-[10px] uppercase">Organizma</th>
                              <th className="text-left px-2 py-2 font-black text-[10px] uppercase">AMR aile</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.entries.map((e, ri) => (
                              <tr
                                key={`${e.aro_accession ?? "x"}-${e.antibiotic_name}-${ri}`}
                                style={{
                                  borderTop: "1px solid var(--border)",
                                  background:
                                    ri % 2 === 1 ? "color-mix(in srgb, var(--surface) 65%, transparent)" : undefined,
                                }}
                              >
                                <td className="px-2 py-2 font-mono text-xs align-top" style={{ color: "var(--text-muted)" }}>
                                  {e.aro_accession ?? "—"}
                                </td>
                                <td className="px-2 py-2 font-medium align-top" style={{ color: "var(--text)" }}>
                                  {e.antibiotic_name}
                                </td>
                                <td className="px-2 py-2 align-top" style={{ color: "var(--text-muted)" }}>
                                  {e.organism ?? "—"}
                                </td>
                                <td className="px-2 py-2 align-top text-xs" style={{ color: "var(--text-muted)" }}>
                                  {e.amr_gene_family ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {desc ? (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                          <button
                            type="button"
                            onClick={() => setExpandedDesc(open ? null : idx)}
                            className="flex items-center gap-2 text-sm font-black w-full text-left"
                            style={{ color: "var(--primary)" }}
                          >
                            Mekanizma açıklaması
                            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                          </button>
                          {open && (
                            <p className="text-sm font-medium mt-2 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
                              {desc}
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <p className="text-sm font-medium pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <Link href={drugbankLink} className="font-bold underline" style={{ color: "var(--primary)" }}>
                  Bu antibiyotik sınıfı hakkında DrugBank kaydını incele →
                </Link>
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
