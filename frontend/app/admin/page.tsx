"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, authApi, microscopyApi, type AdminUser } from "@/lib/api";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import {
  Stethoscope,
  LogOut,
  ShieldAlert,
  ArrowLeft,
  Users,
  Search,
  Save,
  Loader2,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import HistologyUploadModal from "@/components/HistologyUploadModal";
import { Microscope, Plus } from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadTab, setUploadTab] = useState<"url" | "tiff">("tiff");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated()) {
        router.replace("/login");
        return;
      }
      
      try {
        const res = await authApi.me();
        if (!res.data.is_admin) {
          router.replace("/dashboard");
          return;
        }
        setIsAdmin(true);
        // Yetki onaylandıktan sonra verileri çek
        const userRes = await adminApi.getUsers();
        setUsers(userRes.data);
      } catch (err) {
        console.error("Admin check failed:", err);
        router.replace("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (search) {
      setFilteredUsers(users.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase()) || 
        u.email.toLowerCase().includes(search.toLowerCase())
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

  const handleUpdateLimit = async (userId: string, newLimit: number) => {
    try {
      await adminApi.updateLimit(userId, newLimit);
      setUsers(users.map(u => u.id === userId ? { ...u, daily_limit: newLimit } : u));
      alert("Limit başarıyla güncellendi.");
    } catch {
      alert("Hata oluştu.");
    }
  };

  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center opacity-50" style={{ background: "var(--bg)", color: "var(--text)" }}>Yetki kontrolü yapılıyor...</div>;

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
                style={{ background: "var(--error)" }}>
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-lg tracking-tight block leading-tight">Yönetim Paneli</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-0.5">Sistem Yöneticisi</span>
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm"
                  style={{ background: "var(--error-light)", color: "var(--error)", borderColor: "var(--error-light)" }}>
                  <Users className="w-3.5 h-3.5" />
                  Kullanıcı Yönetimi
                </div>
                <div>
                  <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                    Sistem <span style={{ color: "var(--error)" }}>Kontrolü</span>
                  </h1>
                  <p className="text-sm font-medium mt-2 opacity-60 max-w-md" style={{ color: "var(--text-muted)" }}>
                    {users.length} aktif kullanıcıyı yönetin, günlük limitleri güncelleyin ve rollerini düzenleyin.
                  </p>
                </div>
            </div>
            
            <div className="relative w-full lg:w-96 group">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" style={{ color: "var(--text)" }} />
                <input 
                    type="text" 
                    placeholder="İsim veya e-posta ile ara..." 
                    className="w-full rounded-[1.25rem] pl-12 pr-4 py-4 text-sm font-medium transition-all focus:outline-none focus:ring-4 shadow-sm border"
                    style={{ 
                      background: "var(--surface)", 
                      color: "var(--text)", 
                      borderColor: "var(--border)",
                      "--tw-ring-color": "var(--primary-light)"
                    } as any}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        {/* Users Table Card */}
        <div className="glass rounded-[2rem] border shadow-xl overflow-hidden transition-all" 
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead>
                        <tr className="border-b transition-all" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Kullanıcı Bilgileri</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Bölüm / Sınıf</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Yetki Grubu</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-center" style={{ color: "var(--text-muted)" }}>Günlük Vaka Limiti</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {loading ? (
                            <tr><td colSpan={4} className="px-8 py-24 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                                <span className="font-bold opacity-40">Kullanıcı verileri yükleniyor...</span>
                              </div>
                            </td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={4} className="px-8 py-24 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <Search className="w-12 h-12 opacity-10" />
                                <span className="font-bold opacity-40">Aradığınız kriterlere uygun kullanıcı bulunamadı.</span>
                              </div>
                            </td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border shadow-sm transition-transform group-hover:scale-110"
                                      style={{ background: "var(--surface-2)", color: "var(--primary)", borderColor: "var(--border)" }}>
                                      {user.name.split(' ').map(n=>n[0]).join('')}
                                    </div>
                                    <div>
                                      <p className="font-black text-base" style={{ color: "var(--text)" }}>{user.name}</p>
                                      <p className="text-xs font-bold opacity-40" style={{ color: "var(--text-muted)" }}>{user.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex flex-col gap-1">
                                    <p className="font-bold text-sm" style={{ color: "var(--text)" }}>{user.school || "—"}</p>
                                    {user.year && (
                                      <p className="text-[10px] font-black uppercase tracking-wider opacity-40" style={{ color: "var(--text-muted)" }}>
                                        {user.year}. Sınıf Öğrencisi
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                    {user.is_admin ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border shadow-sm"
                                          style={{ background: "var(--error-light)", color: "var(--error)", borderColor: "var(--error-light)" }}>
                                          <ShieldAlert className="w-3 h-3" />
                                          Yönetici
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold opacity-60 border"
                                          style={{ background: "var(--surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
                                          Standart
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center justify-center gap-3">
                                        <input 
                                            type="number" 
                                            className="w-16 h-10 rounded-xl px-2 text-center font-black focus:outline-none focus:ring-2 transition-all border shadow-sm"
                                            style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)", "--tw-ring-color": "var(--primary-light)" } as any}
                                            defaultValue={user.daily_limit}
                                            id={`limit-${user.id}`}
                                        />
                                        <button 
                                            onClick={() => {
                                                const el = document.getElementById(`limit-${user.id}`) as HTMLInputElement;
                                                handleUpdateLimit(user.id, parseInt(el.value));
                                            }}
                                            className="w-10 h-10 rounded-xl transition-all hover:scale-110 active:scale-90 shadow-lg flex items-center justify-center group/btn relative overflow-hidden"
                                            style={{ background: "var(--primary)", color: "white" }}
                                            title="Kaydet"
                                        >
                                            <div className="absolute inset-0 bg-white/10 w-0 group-hover/btn:w-full transition-all duration-300" />
                                            <Save className="w-4 h-4 relative z-10" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Histology Image Management Section - Simplified */}
        <div id="image-management" className="glass rounded-[2rem] border shadow-xl p-8 mt-12 transition-all relative overflow-hidden" 
             style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:rotate-12" 
                         style={{ background: "var(--primary)", color: "white" }}>
                       <Microscope className="w-6 h-6" />
                    </div>
                    <div>
                       <h2 className="text-2xl font-black tracking-tight">Görüntü Arşivi Yönetimi</h2>
                       <p className="text-sm font-medium opacity-60" style={{ color: "var(--text-muted)" }}>Mikroskop ve Histoloji sistemi için yeni vakalar ekleyin.</p>
                    </div>
                </div>
                
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] text-white bg-primary shadow-xl hover:shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  YENİ GÖRÜNTÜ YÜKLE
                </button>
            </div>
        </div>

        {/* Upload Modal */}
        <HistologyUploadModal 
          isOpen={isUploadModalOpen} 
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            // İsterseniz burada görüntü listesini yenileyebilirsiniz
            alert("Görüntü başarıyla arşive eklendi!");
          }}
        />

      </main>
      <Footer />
    </div>
  );
}
