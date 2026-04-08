"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usersApi, type LeaderboardItem } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import { Stethoscope, LogOut, ArrowLeft, Trophy, Medal, Award } from "lucide-react";
import Link from "next/link";

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
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 1:
        return <Medal className="w-6 h-6 text-slate-300" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="font-bold text-slate-500 text-lg w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="glass border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="mr-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg hidden sm:block">TUS Liderlik Tablosu</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-black text-white">Genel Sıralama</h1>
          <p className="text-slate-400 text-sm">
            Sıralama "Toplam Puan" (Çözülen Vaka × Ortalama Skor) üzerinden hesaplanmaktadır.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 shimmer rounded-xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Henüz kimse vaka çözmedi. İlk sırayı sen al!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((user, index) => {
              const isTop3 = index < 3;
              return (
                <div
                  key={index}
                  className={`relative overflow-hidden rounded-xl border flex items-center p-4 transition-all ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30"
                      : index === 1
                      ? "bg-gradient-to-r from-slate-400/10 to-transparent border-slate-400/30"
                      : index === 2
                      ? "bg-gradient-to-r from-amber-600/10 to-transparent border-amber-600/30"
                      : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 flex items-center justify-center flex-shrink-0">
                      {getRankIcon(index)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold truncate ${isTop3 ? "text-white text-lg" : "text-slate-200"}`}>
                        {user.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {user.school ? (
                          <span className="truncate">{user.school}</span>
                        ) : (
                          <span>Tıp Fakültesi</span>
                        )}
                        {user.year && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span>Dönem {user.year}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <div className="text-xs text-slate-500">Ort. Skor</div>
                      <div className="font-semibold text-slate-300">{Math.round(user.average_score)}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-xs text-slate-500">Vaka</div>
                      <div className="font-semibold text-slate-300">{user.total_cases}</div>
                    </div>
                    <div className="w-24 text-right">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-0.5">Top. Puan</div>
                      <div className={`font-black text-xl ${
                        index === 0 ? "text-yellow-400" : 
                        index === 1 ? "text-slate-300" : 
                        index === 2 ? "text-amber-500" : "text-blue-400"
                      }`}>
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
