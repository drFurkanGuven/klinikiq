"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, authApi, type AdminUser, type HistologyImage, type OrphanDziFile } from "@/lib/api";
import { resolvePublicAssetUrl } from "@/lib/tileUrl";
import { isAuthenticated, logout } from "@/lib/auth";
import Footer from "@/components/Footer";
import {
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
  FolderOpen,
  Link2,
  CloudDownload,
  Pencil,
} from "lucide-react";

const SPECIALTY_LABEL: Record<string, string> = {
  pathology: "Patoloji",
  cardiology: "Kardiyoloji",
  endocrinology: "Endokrinoloji",
  neurology: "Nöroloji",
  pulmonology: "Pulmonoloji",
  gastroenterology: "Gastroenteroloji",
  nephrology: "Nefroloji",
  infectious_disease: "Enfeksiyon",
  hematology: "Hematoloji",
  rheumatology: "Romatoloji",
  basic_sciences: "Temel bilimler",
};

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
  const [orphans, setOrphans] = useState<OrphanDziFile[]>([]);
  const [orphansLoading, setOrphansLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHfModalOpen, setIsHfModalOpen] = useState(false);
  const [hfRepoId, setHfRepoId] = useState("");
  const [hfPathInRepo, setHfPathInRepo] = useState("");
  const [hfTitle, setHfTitle] = useState("");
  const [hfRepoType, setHfRepoType] = useState<"dataset" | "model">("dataset");
  const [hfImporting, setHfImporting] = useState(false);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [editImage, setEditImage] = useState<HistologyImage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);

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
      const res = await adminApi.listHistologyImages();
      setImages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setImagesLoading(false);
    }
  };

  const fetchOrphans = async () => {
    setOrphansLoading(true);
    try {
      const res = await adminApi.listOrphanDzi();
      setOrphans(res.data);
    } catch (err) {
      console.error(err);
      setOrphans([]);
    } finally {
      setOrphansLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "histology") {
      fetchImages();
      fetchOrphans();
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
      await adminApi.deleteImage(id);
      setImages(images.filter(img => img.id !== id));
    } catch (err) {
      alert("Silme hatası oluştu.");
    }
  };

  const handleHfImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hfRepoId.trim() || !hfPathInRepo.trim() || !hfTitle.trim()) {
      alert("Repo, dosya yolu ve başlık zorunlu.");
      return;
    }
    setHfImporting(true);
    try {
      await adminApi.importHfTiff({
        repo_id: hfRepoId.trim(),
        path_in_repo: hfPathInRepo.trim(),
        title: hfTitle.trim(),
        repo_type: hfRepoType,
      });
      setIsHfModalOpen(false);
      setHfRepoId("");
      setHfPathInRepo("");
      setHfTitle("");
      await fetchImages();
      await fetchOrphans();
    } catch (err: unknown) {
      console.error(err);
      alert(
        "İçe aktarılamadı. Repo/yol doğru mu? Büyük dosyalar dakikalar sürebilir. Kapalı veri için sunucuda HF_TOKEN ayarlayın.",
      );
    } finally {
      setHfImporting(false);
    }
  };

  const openEditImage = (img: HistologyImage) => {
    setEditImage(img);
    setEditTitle(img.title);
    setEditDescription(img.description ?? "");
  };

  const handleSaveEditImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editImage) return;
    const t = editTitle.trim();
    if (!t) {
      alert("Başlık boş olamaz.");
      return;
    }
    setEditSaving(true);
    try {
      await adminApi.patchHistologyImage(editImage.id, {
        title: t,
        description: editDescription.trim() || null,
      });
      setImages((prev) =>
        prev.map((i) =>
          i.id === editImage.id
            ? { ...i, title: t, description: editDescription.trim() || undefined }
            : i,
        ),
      );
      setEditImage(null);
    } catch {
      alert("Güncellenemedi.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleRegisterOrphan = async (relativePath: string) => {
    const def = relativePath.replace(/\.dzi$/i, "").split("/").pop() || relativePath;
    const title = window.prompt("Listede görünecek başlık", def);
    if (!title?.trim()) return;
    try {
      await adminApi.registerDzi({ relative_path: relativePath, title: title.trim() });
      await fetchImages();
      await fetchOrphans();
    } catch {
      alert("Kayıt eklenemedi (dosya yolu veya zaten kayıtlı olabilir).");
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
              <div>
                <h1 className="text-4xl font-black tracking-tight leading-tight">
                  Histoloji <span className="text-primary">Arşivi</span>
                </h1>
                <p className="text-sm font-medium mt-2 opacity-60 max-w-xl">
                  Veritabanı kayıtları (önbelleksiz liste). DZI dosyaları <code className="text-xs opacity-80">/tiles/</code> altında
                  olup veritabanında yoksa aşağıda &quot;Yetim dosyalar&quot; bölümünde listelenir — tek tıkla kayıt ekleyebilirsiniz.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    fetchImages();
                    fetchOrphans();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-border bg-surface hover:bg-black/5 dark:hover:bg-white/5 transition-all text-sm font-bold"
                >
                  <RefreshCcw className={`w-4 h-4 ${imagesLoading || orphansLoading ? "animate-spin" : ""}`} />
                  Yenile
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-white bg-primary shadow-lg hover:opacity-95 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  TIFF / görüntü yükle
                </button>
                <button
                  type="button"
                  onClick={() => setIsHfModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-border bg-surface hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <CloudDownload className="w-5 h-5 text-violet-500" />
                  HF&apos;den TIFF
                </button>
              </div>
            </div>

            <div className="glass rounded-[2rem] border shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-black/[0.03] dark:bg-white/[0.04] flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary opacity-80" />
                <span className="text-xs font-black uppercase tracking-widest opacity-50">Kayıtlı preparatlar</span>
                <span className="text-xs font-bold opacity-40">({images.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-black/5 dark:bg-white/5 border-b border-border">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Önizleme</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Başlık</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Kaynak / yol</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {imagesLoading ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center opacity-40 font-bold italic">
                          Yükleniyor…
                        </td>
                      </tr>
                    ) : images.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center opacity-40 font-bold">
                          Kayıtlı görüntü yok. TIFF yükleyin veya diskteki DZI için aşağıdan kayıt ekleyin.
                        </td>
                      </tr>
                    ) : (
                      images.map((img) => {
                        const thumbSrc = resolvePublicAssetUrl(img.thumbnail_url || img.image_url);
                        return (
                          <tr key={img.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 align-middle">
                              <div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-zinc-900/10 flex items-center justify-center">
                                {thumbSrc ? (
                                  <img
                                    src={thumbSrc}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <ImageIcon className="w-8 h-8 opacity-20" />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 align-middle max-w-[220px]">
                              <p className="font-black text-base leading-snug line-clamp-2">{img.title}</p>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-primary mt-1">
                                {img.specialty ? SPECIALTY_LABEL[img.specialty] ?? img.specialty : "—"}
                              </p>
                              {img.asset_source && (
                                <p className="text-[10px] font-bold opacity-40 mt-0.5">kaynak: {img.asset_source}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 align-middle">
                              <code className="text-[11px] leading-relaxed block bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg opacity-70 break-all max-w-md">
                                {img.image_url}
                              </code>
                            </td>
                            <td className="px-6 py-4 align-middle text-right">
                              <div className="inline-flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditImage(img)}
                                  className="p-2.5 rounded-xl bg-surface border border-border hover:border-primary hover:text-primary transition-all"
                                  title="Başlık ve açıklama düzenle"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <Link
                                  href={`/histology?image=${img.id}`}
                                  className="p-2.5 rounded-xl bg-surface border border-border hover:border-primary hover:text-primary transition-all"
                                  title="Histoloji sayfasında aç"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteImage(img.id)}
                                  className="p-2.5 rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-white transition-all"
                                  title="Veritabanı ve sunucudan sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass rounded-[2rem] border border-amber-500/20 shadow-xl overflow-hidden bg-amber-500/[0.04]">
              <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-600/90" />
                  <span className="text-xs font-black uppercase tracking-widest opacity-60">Yetim DZI dosyaları</span>
                  <span className="text-xs font-bold opacity-40">({orphans.length})</span>
                </div>
                <p className="text-[11px] opacity-50 max-w-lg">
                  Diskte var, veritabanında kayıt yok. Kayıt ekleyince Histoloji sayfasında görünür.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-black/5 dark:bg-white/5 border-b border-border">
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">Göreli yol</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">Önizleme</th>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orphansLoading ? (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center opacity-40 font-bold italic">
                          Taranıyor…
                        </td>
                      </tr>
                    ) : orphans.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-8 py-12 text-center opacity-40 text-sm">
                          Yetim DZI yok — tüm klasördeki .dzi dosyaları veritabanında kayıtlı veya henüz dosya yok.
                        </td>
                      </tr>
                    ) : (
                      orphans.map((o) => (
                        <tr key={o.relative_path} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 align-middle">
                            <code className="text-xs break-all block">{o.relative_path}</code>
                          </td>
                          <td className="px-6 py-4 align-middle">
                            {o.has_thumb ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                                <img
                                  src={resolvePublicAssetUrl(
                                    `/tiles/${o.relative_path.replace(/\.dzi$/i, "_thumb.jpg")}`,
                                  )}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold opacity-40">thumb yok</span>
                            )}
                          </td>
                          <td className="px-6 py-4 align-middle text-right">
                            <button
                              type="button"
                              onClick={() => handleRegisterOrphan(o.relative_path)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide bg-primary text-white hover:opacity-95 transition-all"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              Veritabanına ekle
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      <HistologyUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchImages}
      />

      {editImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSaveEditImage}
            className="w-full max-w-lg rounded-3xl border border-border bg-surface shadow-2xl p-8 space-y-5"
            style={{ background: "var(--surface)", color: "var(--text)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black tracking-tight">Görüntü metni</h2>
                <p className="text-sm opacity-60 mt-1">
                  Başlık ve açıklama yalnızca listede ve görüntüleyicide görünür; dosya yolu değişmez.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !editSaving && setEditImage(null)}
                className="p-2 rounded-xl opacity-50 hover:opacity-100"
              >
                ×
              </button>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Başlık</span>
              <input
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={editSaving}
                className="w-full rounded-xl border border-border bg-black/5 dark:bg-white/5 px-4 py-3 text-sm font-semibold"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Açıklama</span>
              <textarea
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={editSaving}
                placeholder="İsteğe bağlı"
                className="w-full rounded-xl border border-border bg-black/5 dark:bg-white/5 px-4 py-3 text-sm resize-none"
              />
            </label>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => setEditImage(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border border-border opacity-80 hover:opacity-100"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="px-5 py-2.5 rounded-xl text-sm font-black bg-primary text-white hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
              >
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {isHfModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-3xl border border-border bg-surface shadow-2xl p-8 space-y-6"
            style={{ background: "var(--surface)", color: "var(--text)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black tracking-tight">Hugging Face → DZI</h2>
                <p className="text-sm opacity-60 mt-1">
                  Veri kümesindeki bir TIFF/SVS/NDPI dosyası indirilir, sunucuda Deep Zoom üretilir. Hazır DZI paketi
                  nadir; çoğu veri kümesi pyramidal TIFF kullanır.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !hfImporting && setIsHfModalOpen(false)}
                className="p-2 rounded-xl opacity-50 hover:opacity-100"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleHfImport} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Repo türü</span>
                <select
                  value={hfRepoType}
                  onChange={(e) => setHfRepoType(e.target.value as "dataset" | "model")}
                  className="w-full rounded-xl border border-border bg-black/5 dark:bg-white/5 px-4 py-3 text-sm font-semibold"
                >
                  <option value="dataset">dataset</option>
                  <option value="model">model</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Repo ID</span>
                <input
                  required
                  value={hfRepoId}
                  onChange={(e) => setHfRepoId(e.target.value)}
                  placeholder="örn. organization/wsi-sample"
                  className="w-full rounded-xl border border-border bg-black/5 dark:bg-white/5 px-4 py-3 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Dosya yolu (repo içi)</span>
                <input
                  required
                  value={hfPathInRepo}
                  onChange={(e) => setHfPathInRepo(e.target.value)}
                  placeholder="örn. data/slide.tif veya slides/case1.svs"
                  className="w-full rounded-xl border border-border bg-black/5 dark:bg-white/5 px-4 py-3 text-sm font-mono text-xs"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Başlık (uygulamada)</span>
                <input
                  required
                  value={hfTitle}
                  onChange={(e) => setHfTitle(e.target.value)}
                  placeholder="Listede görünecek isim"
                  className="w-full rounded-xl border border-border bg-black/5 dark:bg-white/5 px-4 py-3 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={hfImporting}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-all"
              >
                {hfImporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> İndiriliyor ve DZI oluşturuluyor…
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-5 h-5" /> İçe aktar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
