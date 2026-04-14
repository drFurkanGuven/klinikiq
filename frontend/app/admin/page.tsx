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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  const [uploadTab, setUploadTab] = useState<"url" | "tiff">("tiff");
  const [uploadProgress, setUploadProgress] = useState(-1);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    checkAdmin();
  }, []);

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

  async function checkAdmin() {
    try {
      const res = await authApi.me();
      if (!res.data.is_admin) {
        router.replace("/dashboard");
        return;
      }
      setIsAdmin(true);
      fetchUsers();
    } catch {
      router.replace("/dashboard");
    }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await adminApi.getUsers();
      setUsers(res.data);
    } catch {}
    setLoading(false);
  }

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

        {/* Histology Image Management Section */}
        <div id="image-management" className="glass rounded-[2rem] border shadow-xl p-8 mt-12 transition-all relative overflow-hidden" 
             style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
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
                
                <div className="flex p-1.5 rounded-2xl border shadow-inner w-fit" 
                     style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                    <button 
                        onClick={() => setUploadTab("tiff")} 
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black transition-all rounded-xl ${uploadTab === "tiff" ? "shadow-md scale-105" : "opacity-40 hover:opacity-100"}`} 
                        style={{ 
                            background: uploadTab === "tiff" ? "var(--surface)" : "transparent", 
                            color: uploadTab === "tiff" ? "var(--primary)" : "var(--text)",
                            borderColor: uploadTab === "tiff" ? "var(--border)" : "transparent",
                            borderWidth: 1 
                        }}>
                        <div className={`w-1.5 h-1.5 rounded-full ${uploadTab === "tiff" ? "bg-primary animate-pulse" : "bg-current"}`} />
                        TIFF Yükle
                    </button>
                    <button 
                        onClick={() => setUploadTab("url")} 
                        className={`flex items-center gap-2 px-6 py-2.5 text-sm font-black transition-all rounded-xl ${uploadTab === "url" ? "shadow-md scale-105" : "opacity-40 hover:opacity-100"}`} 
                        style={{ 
                            background: uploadTab === "url" ? "var(--surface)" : "transparent", 
                            color: uploadTab === "url" ? "var(--primary)" : "var(--text)",
                            borderColor: uploadTab === "url" ? "var(--border)" : "transparent",
                            borderWidth: 1 
                        }}>
                        <div className={`w-1.5 h-1.5 rounded-full ${uploadTab === "url" ? "bg-primary animate-pulse" : "bg-current"}`} />
                        URL İle Ekle
                    </button>
                </div>
            </div>
            
            <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                if (isUploading) return;
                
                try {
                    setIsUploading(true);
                    setUploadProgress(0);
                    
                    const title = (form.title_input as HTMLInputElement).value;
                    const description = (form.description as HTMLInputElement).value;
                    const specialty = (form.specialty as HTMLSelectElement).value;
                    
                    // Önce bir yetki tazelemesi yapalım (401 hatasını önlemek için)
                    try { await authApi.me(); } catch (e) { console.warn("Token refresh failed, re-login might be needed."); }

                    if (uploadTab === "tiff") {
                        const fileInput = form.file as HTMLInputElement;
                        const file = fileInput.files?.[0];
                        if (!file) throw new Error("Lütfen bir dosya seçin.");
                        
                        // microscopyApi kullanılarak standart api interceptor'ları devreye girer
                        await microscopyApi.uploadTiff(file, { title, description, specialty }, (pct) => setUploadProgress(pct));
                    } else {
                        const imageUrl = (form.image_url as HTMLInputElement).value;
                        if (!imageUrl) throw new Error("Lütfen URL girin.");
                        await microscopyApi.createImage({ title, description, specialty, image_url: imageUrl });
                        setUploadProgress(100);
                    }
                    
                    setTimeout(() => {
                        alert("Görüntü başarıyla sisteme eklendi!");
                        form.reset();
                        setIsUploading(false);
                        setUploadProgress(-1);
                    }, 800);
                } catch (err: any) {
                    setIsUploading(false);
                    setUploadProgress(-1);
                    console.error("Upload Error:", err);
                    const errorMsg = err.response?.data?.detail || err.message || "Bilinmeyen bir hata oluştu.";
                    alert("⚠️ İşlem Başarısız: " + errorMsg);
                }
            }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                
                <div className="space-y-6">
                    <div className="space-y-4">
                        {uploadTab === "tiff" ? (
                            <div className="group transition-all">
                                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50 group-focus-within:opacity-100 group-focus-within:text-primary transition-all">
                                    Histoloji Dosyası (.tiff, .svs)
                                </label>
                                <div className="relative group/input">
                                    <input 
                                        name="file" 
                                        type="file" 
                                        accept=".tiff,.tif,.svs,.jpg,.png" 
                                        required={uploadTab === "tiff"} 
                                        disabled={isUploading} 
                                        className="w-full text-xs file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-primary file:text-white hover:file:opacity-90 file:cursor-pointer outline-none transition-all font-bold disabled:opacity-50 p-1 rounded-2xl border-2 border-dashed border-border hover:border-primary-light" 
                                    />
                                </div>
                                <p className="mt-3 text-[10px] opacity-40 leading-relaxed font-bold">
                                    * TIFF/SVS dosyaları sunucu tarafında DZI formatına dönüştürülür. Bu işlem dosya boyutuna bağlı olarak 1-5 dakika sürebilir.
                                </p>
                            </div>
                        ) : (
                            <div className="group transition-all">
                                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50 group-focus-within:opacity-100 group-focus-within:text-primary transition-all">
                                    Doğrudan Görüntü / DZI URL
                                </label>
                                <input 
                                    name="image_url" 
                                    type="url" 
                                    required={uploadTab === "url"} 
                                    disabled={isUploading} 
                                    className="w-full rounded-2xl px-5 py-4 text-sm font-bold border focus:ring-4 transition-all outline-none disabled:opacity-50 shadow-sm" 
                                    style={{ background: "var(--bg)", borderColor: "var(--border)", "--tw-ring-color": "var(--primary-light)" } as any} 
                                    placeholder="https://example.com/histology.jpg" 
                                />
                            </div>
                        )}
                        
                        <div className="group transition-all">
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50 group-focus-within:opacity-100 group-focus-within:text-primary transition-all">
                                Görüntü Başlığı (Vaka İsmi)
                            </label>
                            <input 
                                name="title_input" 
                                type="text" 
                                required 
                                disabled={isUploading} 
                                className="w-full rounded-2xl px-5 py-4 text-sm font-bold border focus:ring-4 transition-all outline-none disabled:opacity-50 shadow-sm" 
                                style={{ background: "var(--bg)", borderColor: "var(--border)", "--tw-ring-color": "var(--primary-light)" } as any} 
                                placeholder="Örn: Akut Glomerülonefrit" 
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6 flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="group transition-all">
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Tıbbi Branş</label>
                            <select 
                                name="specialty" 
                                disabled={isUploading} 
                                className="w-full rounded-2xl px-5 py-4 text-sm font-bold border outline-none disabled:opacity-50 appearance-none shadow-sm cursor-pointer" 
                                style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                                <option value="pathology">Genel Patoloji</option>
                                <option value="nephrology">Nefroloji / Böbrek</option>
                                <option value="pulmonology">Pulmonoloji / Akciğer</option>
                                <option value="neurology">Nöroloji / Beyin</option>
                                <option value="endocrinology">Endokrinoloji</option>
                                <option value="cardiology">Kardiyoloji</option>
                            </select>
                        </div>
                        
                        <div className="group transition-all">
                            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Öğrenci İçin Açıklama</label>
                            <textarea 
                                name="description" 
                                rows={2} 
                                disabled={isUploading} 
                                className="w-full rounded-2xl px-5 py-4 text-sm font-bold border outline-none resize-none disabled:opacity-50 shadow-sm" 
                                style={{ background: "var(--bg)", borderColor: "var(--border)" }} 
                                placeholder="Vaka hakkında kısa bir klinik bilgi veya preparat notu..."></textarea>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {isUploading && uploadProgress >= 0 && uploadTab === "tiff" && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1">
                                    <span className="opacity-50">{uploadProgress >= 100 ? "İşleniyor..." : "Dosya Yükleniyor..."}</span>
                                    <span style={{ color: "var(--primary)" }}>%{uploadProgress}</span>
                                </div>
                                <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-4 p-1 border shadow-inner overflow-hidden relative" style={{ borderColor: "var(--border)" }}>
                                    <div className="h-full rounded-full transition-all duration-500 relative flex items-center justify-end pr-2 overflow-hidden shadow-lg" 
                                        style={{ width: `${uploadProgress}%`, background: "var(--primary)" }}>
                                        <div className="absolute inset-0 bg-white/25 animate-pulse" />
                                        <div className="absolute inset-0 translate-x-[-100%] animate-[shimmer_2s_infinite]" 
                                             style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <button 
                            type="submit" 
                            disabled={isUploading} 
                            className={`w-full py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] text-white transition-all outline-none flex items-center justify-center gap-3 relative overflow-hidden group/btn ${isUploading ? "opacity-70 cursor-not-allowed" : "hover:scale-[1.02] active:scale-95 shadow-xl hover:shadow-primary/20"}`} 
                            style={{ background: "var(--primary)" }}>
                            <div className="absolute inset-0 bg-white/10 w-0 group-hover/btn:w-full transition-all duration-300 pointer-events-none" />
                            {isUploading ? (
                               <>
                                 <Loader2 className="w-5 h-5 animate-spin" />
                                 <span>{uploadTab === "tiff" ? (uploadProgress >= 100 ? "DÖNÜŞTÜRÜLÜYOR" : "YÜKLENİYOR") : "KAYDEDİLİYOR"}</span>
                               </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>{uploadTab === "tiff" ? "TIFF VERİSİNİ İŞLE" : "URL İLE ARŞİVE EKLE"}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>

      </main>
      <Footer />
    </div>
  );
}
