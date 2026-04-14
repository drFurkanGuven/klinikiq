"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi, type LeaderboardItem } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { Stethoscope, LogOut, ArrowLeft, Trophy, Medal, Award, Sparkles, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    fetchLeaderboard();
  }, [mounted]);

  async function fetchLeaderboard() {
    setLoading(true);
    try {
      const res = await usersApi.getLeaderboard();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6" style={{ color: "var(--warning)" }} />;
      case 1:
        return <Medal className="w-6 h-6" style={{ color: "var(--text-muted)" }} />;
      case 2:
        return <Award className="w-6 h-6" style={{ color: "#d97706" }} />;
      default:
        return <span className="font-bold text-lg w-6 text-center" style={{ color: "var(--text-muted)" }}>{index + 1}</span>;
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Navbar */}
      <nav className="glass border-b sticky top-0 z-50 transition-all font-sans" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2.5 rounded-xl transition-all hover:bg-black/5 hover:scale-105 active:scale-90" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: "var(--warning)" }}>
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-lg tracking-tight block leading-tight">Liderlik Tablosu</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-0.5">Global Sıralama</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <ThemeToggle />
            <div className="w-px h-6 bg-current opacity-10 hidden sm:block" />
            <button
              onClick={logout}
              className="group flex items-center gap-2 text-sm font-bold transition-all px-4 py-2.5 rounded-xl hover:bg-black/5"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12">
        {/* Page Header */}
        <div className="mb-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] shadow-sm mb-2"
            style={{ background: "var(--primary-light)", color: "var(--primary)", borderColor: "var(--primary-light)" }}>
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Zirvedekiler
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight" style={{ color: "var(--text)" }}>Klinik <span style={{ color: "var(--primary)" }}>Üstadları</span></h1>
          <p className="text-sm sm:text-base font-medium max-w-xl mx-auto leading-relaxed opacity-60" style={{ color: "var(--text-muted)" }}>
            Sıralama "Toplam Puan" (Vaka × Ortalama Skor) üzerinden gerçek zamanlı hesaplanmaktadır. Zirveye giden yol klinik doğruluktan geçer.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 shimmer rounded-[2rem]" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-24 rounded-[3rem] border-4 border-dashed transition-all" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Trophy className="w-12 h-12 opacity-10" />
            </div>
            <p className="text-xl font-black opacity-30">Henüz kimse vaka çözmedi.</p>
            <Link href="/dashboard" className="inline-block mt-6 text-sm font-black uppercase tracking-widest style={{ color: 'var(--primary)' }}">Henüz ilk sırayı sen al!</Link>
          </div>
        ) : (
          <div className="space-y-4 relative">
            {data.map((user, index) => {
              const isTop3 = index < 3;
              const rankColor = index === 0 ? "var(--warning)" : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : "var(--text-muted)";
              
              return (
                <div
                  key={index}
                  className={`group relative overflow-hidden rounded-[2.25rem] border flex flex-col sm:flex-row items-center p-6 sm:p-8 transition-all shadow-lg ${isTop3 ? "scale-[1.02] sm:scale-105 z-10 mb-6" : "hover:-translate-y-1"}`}
                  style={{ 
                    background: isTop3 ? "var(--surface)" : "var(--surface-2)", 
                    borderColor: isTop3 ? rankColor : "var(--border)",
                    boxShadow: isTop3 ? `0 20px 40px -15px ${index === 0 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(0,0,0,0.05)'}` : "none"
                  }}
                >
                  {/* Rank Badge */}
                  <div className="absolute top-0 left-0 px-6 py-2 rounded-br-2xl text-[10px] font-black uppercase tracking-widest shadow-sm"
                    style={{ background: rankColor, color: "white" }}>
                    #{index + 1}
                  </div>

                  <div className="flex items-center gap-6 flex-1 w-full sm:w-auto mt-4 sm:mt-0">
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border-2 shadow-xl transition-all group-hover:rotate-6 sm:group-hover:scale-110`}
                        style={{ background: "var(--bg)", color: rankColor, borderColor: isTop3 ? rankColor : "var(--border)" }}>
                        {user.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
                      </div>
                      {isTop3 && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full shadow-lg border-2 border-white dark:border-slate-800 flex items-center justify-center animate-bounce"
                          style={{ background: rankColor }}>
                          {getRankIcon(index)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <h3 className={`font-black truncate ${isTop3 ? "text-2xl" : "text-lg"}`} style={{ color: "var(--text)" }}>
                          {user.name}
                        </h3>
                        {/* If you have usersApi update with user status, you could show it here */}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        <span className="opacity-60">{user.school || "KlinikIQ Üyesi"}</span>
                        {user.year && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                            <span className="opacity-60">Dönem {user.year}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-8 w-full sm:w-auto mt-6 sm:mt-0 pt-6 sm:pt-0 border-t sm:border-0" style={{ borderColor: "var(--border)" }}>
                    <div className="text-center sm:text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-40" style={{ color: "var(--text-muted)" }}>Vaka</div>
                      <div className="font-black text-lg" style={{ color: "var(--text)" }}>{user.total_cases}</div>
                    </div>
                    <div className="w-px h-8 bg-current opacity-10" />
                    <div className="text-center sm:text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-40" style={{ color: "var(--text-muted)" }}>Ort. Skor</div>
                      <div className="font-black text-lg" style={{ color: "var(--primary)" }}>{Math.round(user.average_score)}</div>
                    </div>
                    <div className="w-px h-8 bg-current opacity-10 hidden sm:block" />
                    <div className="text-right min-w-[100px]">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: rankColor }}>Toplam Puan</div>
                      <div className={`font-black leading-none ${isTop3 ? "text-4xl" : "text-2xl"}`} style={{ color: isTop3 ? rankColor : "var(--text)" }}>
                        {Math.round(user.total_score).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
