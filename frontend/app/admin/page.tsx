"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, authApi, microscopyApi, type AdminUser, type HistologyImage } from "@/lib/api";
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
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Plus,
  RefreshCcw,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import dynamic from "next/dynamic";
const HistologyUploadModal = dynamic(() => import("@/components/HistologyUploadModal"), { ssr: false });

type Tab = "users" | "histology";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("users");
  
  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  
  // Histology State
  const [images, setImages] = useState<HistologyImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
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
        fetchUsers();
      } catch (err) {
        console.error("Admin check failed:", err);
        router.replace("/dashboard");
      }
    };

    init();
  }, [router]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchImages = async () => {
    setImagesLoading(true);
    try {
      const res = await microscopyApi.listImages();
      setImages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setImagesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "histology") {
      fetchImages();
    }
  }, [activeTab]);

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
    } catch {
      alert("Hata oluştu.");
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm("Bu görüntüyü HEM veritabanından HEM DE sunucudan kalıcı olarak silmek istediğinizden emin misiniz?")) return;
    try {
      await microscopyApi.deleteImage(id);
      setImages(images.filter(img => img.id !== id));
    } catch (err) {
      alert("Silme hatası oluştu.");
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg bg-danger">
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
        
        {/* Tab Selection */}
        <div className="flex p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border w-fit mb-12">
            <button
                onClick={() => setActiveTab("users")}
                className={`flex items-center gap-2 px-8 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                    activeTab === "users" ? "bg-white dark:bg-zinc-800 shadow-xl text-primary" : "opacity-40 hover:opacity-100"
                }`}
            >
                <Users className="w-4 h-4" />
                Kullanıcı Yönetimi
            </button>
            <button
                onClick={() => setActiveTab("histology")}
                className={`flex items-center gap-2 px-8 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-xl ${
                    activeTab === "histology" ? "bg-white dark:bg-zinc-800 shadow-xl text-primary" : "opacity-40 hover:opacity-100"
                }`}
            >
                <ImageIcon className="w-4 h-4" />
                Histoloji Arşivi
            </button>
        </div>

        {activeTab === "users" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-8">
                <div>
                  <h1 className="text-4xl font-black tracking-tight leading-tight">Kullanıcı <span className="text-primary">Kontrolü</span></h1>
                  <p className="text-sm font-medium mt-2 opacity-60">Sistemdeki kullanıcıların yetki ve limitlerini düzenleyin.</p>
                </div>
                <div className="relative w-full lg:w-96">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
                    <input 
                        type="text" 
                        placeholder="İsim veya e-posta ile ara..." 
                        className="w-full rounded-2xl pl-12 pr-4 py-4 text-sm font-bold transition-all border bg-surface outline-none focus:ring-4 focus:ring-primary/10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="glass rounded-[2rem] border shadow-xl overflow-hidden">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-black/5 dark:bg-white/5 border-b border-border">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest opacity-40">Kullanıcı</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest opacity-40">Okul / Bölüm</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest opacity-40">Limit</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest opacity-40">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {usersLoading ? (
                             <tr><td colSpan={4} className="px-8 py-24 text-center opacity-40 font-bold italic">Yükleniyor...</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-6">
                                    <p className="font-black text-base">{user.name}</p>
                                    <p className="text-xs font-bold opacity-40">{user.email}</p>
                                </td>
                                <td className="px-8 py-6 font-bold">{user.school || "—"}</td>
                                <td className="px-8 py-6">
                                    <input 
                                        type="number" 
                                        id={`limit-${user.id}`}
                                        defaultValue={user.daily_limit}
                                        className="w-16 bg-black/5 dark:bg-white/5 rounded-lg px-2 py-1 text-center font-black border border-border"
                                    />
                                </td>
                                <td className="px-8 py-6">
                                    <button 
                                        onClick={() => {
                                            const val = (document.getElementById(`limit-${user.id}`) as HTMLInputElement).value;
                                            handleUpdateLimit(user.id, parseInt(val));
                                        }}
                                        className="p-2.5 rounded-xl bg-primary text-white shadow-lg hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <Save className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-8">
                <div>
                  <h1 className="text-4xl font-black tracking-tight leading-tight">Histoloji <span className="text-primary">Arşivi</span></h1>
                  <p className="text-sm font-medium mt-2 opacity-60">Sistemdeki dijital slaytları yönetin ve yenilerini ekleyin.</p>
                </div>
                <div className="flex gap-4 w-full lg:w-fit">
                    <button 
                        onClick={fetchImages}
                        className="p-4 rounded-2xl border border-border bg-surface hover:bg-black/5 transition-all"
                    >
                        <RefreshCcw className={`w-5 h-5 ${imagesLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                         onClick={() => setIsUploadModalOpen(true)}
                         className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest text-white bg-primary shadow-xl hover:scale-[1.05] active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        YENİ EKLE
                    </button>
                </div>
            </div>

            <div className="glass rounded-[2rem] border shadow-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-black/5 dark:bg-white/5 border-b border-border">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest opacity-40">Önizleme</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest opacity-40">Başlık / Branş</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest opacity-40">URL / Yol</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {imagesLoading ? (
                             <tr><td colSpan={4} className="px-8 py-24 text-center opacity-40 font-bold italic">Yükleniyor...</td></tr>
                        ) : images.length === 0 ? (
                            <tr><td colSpan={4} className="px-8 py-24 text-center opacity-40 font-bold">Arşivde henüz görüntü bulunmuyor.</td></tr>
                        ) : images.map(img => (
                            <tr key={img.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-4">
                                     <div className="w-16 h-16 rounded-xl overflow-hidden border border-border bg-black/5">
                                         {img.thumbnail_url && (
                                            <img 
                                                src={`${(process.env.NEXT_PUBLIC_API_URL || "").replace("/api", "")}${img.thumbnail_url}`} 
                                                className="w-full h-full object-cover" 
                                                alt="" 
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                            />
                                         )}
                                     </div>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="font-black text-base">{img.title}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">{img.specialty}</p>
                                </td>
                                <td className="px-8 py-6">
                                    <code className="text-xs bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg opacity-60">
                                        {img.image_url.length > 30 ? img.image_url.substring(0, 30) + "..." : img.image_url}
                                    </code>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center justify-end gap-3">
                                        <Link 
                                            href={`/histology?image=${img.id}`}
                                            className="p-2.5 rounded-xl bg-surface border border-border hover:border-primary hover:text-primary transition-all"
                                            title="Görüntüle"
                                            target="_blank"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        <button 
                                            onClick={() => handleDeleteImage(img.id)}
                                            className="p-2.5 rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all"
                                            title="Sunucudan Sil"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

      </main>

      <HistologyUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchImages}
      />

      <Footer />
    </div>
  );
}
