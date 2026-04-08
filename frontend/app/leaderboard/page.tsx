"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi, type LeaderboardItem } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { Stethoscope, LogOut, ArrowLeft, Trophy, Medal, Award } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LeaderboardPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    fetchLeaderboard();
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Navbar */}
      <nav className="glass border-b sticky top-0 z-50 transition-all" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="mr-2 transition-colors hover:scale-110 active:scale-95" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "var(--warning)" }}>
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block" style={{ color: "var(--text)" }}>Liderlik Tablosu</span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg hover:bg-slate-500/10"
              style={{ color: "var(--text-muted)" }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-10 text-center space-y-3">
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--text)" }}>Genel Sıralama</h1>
          <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Sıralama "Toplam Puan" (Çözülen Vaka × Ortalama Skor) üzerinden gerçek zamanlı hesaplanmaktadır.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 shimmer rounded-2xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed" style={{ borderColor: "var(--border)" }}>
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium opacity-60" style={{ color: "var(--text-muted)" }}>Henüz kimse vaka çözmedi. İlk sırayı sen al!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((user, index) => {
              const isTop3 = index < 3;
              return (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-2xl border flex items-center p-4 transition-all card-hover shadow-sm"
                  style={{ 
                    background: "var(--surface)", 
                    borderColor: index === 0 ? "var(--warning)" : "var(--border)" 
                  }}
                >
                  {isTop3 && (
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full blur-2xl opacity-20"
                      style={{ background: index === 0 ? "var(--warning)" : index === 1 ? "var(--text-muted)" : "#d97706" }} />
                  )}
                  
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 flex items-center justify-center flex-shrink-0">
                      {getRankIcon(index)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold truncate ${isTop3 ? "text-lg" : ""}`} style={{ color: "var(--text)" }}>
                        {user.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        {user.school ? (
                          <span className="truncate">{user.school}</span>
                        ) : (
                          <span>Tıp Fakültesi</span>
                        )}
                        {user.year && (
                          <>
                            <span className="w-1 h-1 rounded-full opacity-30" style={{ background: "var(--text-muted)" }} />
                            <span>Dönem {user.year}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Ort. Skor</div>
                      <div className="font-bold" style={{ color: "var(--text)" }}>{Math.round(user.average_score)}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Vaka</div>
                      <div className="font-bold" style={{ color: "var(--text)" }}>{user.total_cases}</div>
                    </div>
                    <div className="w-24 text-right">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: "var(--primary)" }}>Top. Puan</div>
                      <div className="font-black text-2xl" style={{ 
                        color: index === 0 ? "var(--warning)" : "var(--primary)" 
                      }}>
                        {Math.round(user.total_score)}
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
