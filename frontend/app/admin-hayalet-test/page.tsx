"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Search, RefreshCcw, CheckCircle2, XCircle, 
  Trash2, ShieldCheck, Database, LayoutDashboard, Plus, ExternalLink
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "lucide-react";
import Footer from "@/components/Footer";

// Client-side only components
const HistologyUploadModal = dynamic(() => import("@/components/HistologyUploadModal"), { ssr: false });
const ThemeToggle = dynamic(() => import("@/components/ThemeToggle"), { ssr: false });

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.is_admin) {
          setIsAdmin(true);
          fetchUsers();
          fetchImages();
        } else {
          window.location.href = "/dashboard";
        }
      } catch (e) {
        window.location.href = "/login";
      }
    };
    checkAuth();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      const data = await res.json();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    setImagesLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/microscopy/images`);
      const data = await res.json();
      setImages(data);
    } finally {
      setImagesLoading(false);
    }
  };

  const handleUpdateLimit = async (userId: string, newLimit: number) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/users/${userId}/limit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify({ daily_limit: newLimit })
      });
      setUsers(users.map(u => u.id === userId ? { ...u, daily_limit: newLimit } : u));
    } catch (e) {
      alert("Limit güncellenemedi");
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Bu görüntüyü silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/admin/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      setImages(images.filter(img => img.id !== imageId));
    } catch (e) {
      alert("Görüntü silinemedi");
    }
  };

  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center opacity-50" style={{ background: "var(--bg)", color: "var(--text)" }}>Yetki kontrolü yapılıyor...</div>;

  return (
    <div className="min-h-screen flex flex-col transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Navbar */}
      <nav className="glass border-b sticky top-0 z-50 transition-all font-sans" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="p-2.5 rounded-xl transition-all hover:bg-black/5 hover:scale-105 active:scale-90" style={{ color: "var(--text-muted)" }}>
              <Users className="w-5 h-5" />
            </Link>
            <div className="h-6 w-px bg-border opacity-50" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6" style={{ color: "var(--primary)" }} />
              <span className="text-xl font-black tracking-tighter uppercase italic">KlinikIQ <span style={{ color: "var(--primary)" }}>Panel</span></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-px h-6 bg-border mx-2" />
             <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Toplam Kullanıcı", value: users.length, icon: Users, color: "var(--primary)" },
            { label: "Medikal Görüntü", value: images.length, icon: Database, color: "var(--success)" },
            { label: "Sistem Durumu", value: "Aktif", icon: LayoutDashboard, color: "var(--info)" }
          ].map((stat, i) => (
            <div key={i} className="glass p-6 rounded-3xl border transition-all hover:scale-[1.02]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <stat.icon className="w-5 h-5 mb-4" style={{ color: stat.color }} />
              <p className="text-3xl font-black">{stat.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest opacity-50">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* User Management */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Kullanıcı Yönetimi</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
              <input 
                type="text" 
                placeholder="İsim veya e-posta ara..." 
                className="pl-10 pr-4 py-2 rounded-xl text-sm border focus:ring-2 focus:ring-primary outline-none transition-all w-64"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="glass rounded-3xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-[10px] font-black uppercase tracking-widest opacity-50" style={{ borderColor: "var(--border)" }}>
                  <th className="px-6 py-4">Kullanıcı</th>
                  <th className="px-6 py-4">E-posta</th>
                  <th className="px-6 py-4">Sınıf/Okul</th>
                  <th className="px-6 py-4">Günlük Limit</th>
                  <th className="px-6 py-4">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: "var(--border)" }}>
                {users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).map(user => (
                  <tr key={user.id} className="hover:bg-black/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold">{user.name}</td>
                    <td className="px-6 py-4 font-medium opacity-60">{user.email}</td>
                    <td className="px-6 py-4 text-sm">{user.school || "-"} / {user.year || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-primary">{user.daily_limit}</span>
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdateLimit(user.id, user.daily_limit - 1)} className="p-1 hover:text-danger transition-colors opacity-50 hover:opacity-100">çıkart</button>
                          <button onClick={() => handleUpdateLimit(user.id, user.daily_limit + 1)} className="p-1 hover:text-primary transition-colors opacity-50 hover:opacity-100">ekle</button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_admin ? (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-primary/10 text-primary uppercase">Yönetici</span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-black/5 opacity-50 uppercase">Üye</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Histology Management */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight">Mikroskopi Havuzu</h2>
            <div className="flex gap-3">
              <button 
                onClick={fetchImages}
                className="p-2.5 rounded-xl border hover:scale-105 active:scale-95 transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <RefreshCcw className={`w-5 h-5 ${imagesLoading ? 'animate-spin' : ''}`} />
              </button>
              <button 
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-primary text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" />
                <span>Yeni Görüntü</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {images.map(img => (
              <div key={img.id} className="glass rounded-2xl border overflow-hidden group transition-all hover:scale-[1.05]" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="aspect-square relative flex items-center justify-center bg-black/5 overflow-hidden">
                  <Database className="w-10 h-10 opacity-10" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button className="p-2 bg-white rounded-lg text-black hover:scale-110 active:scale-90 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteImage(img.id)}
                      className="p-2 bg-danger rounded-lg text-white hover:scale-110 active:scale-90 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold truncate">{img.title}</p>
                  <p className="text-[10px] font-black uppercase opacity-40 mt-1">{img.specialty || "Genel"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />

      {showUpload && (
        <HistologyUploadModal 
          onClose={() => setShowUpload(false)} 
          onSuccess={() => { setShowUpload(false); fetchImages(); }} 
        />
      )}
    </div>
  );
}
