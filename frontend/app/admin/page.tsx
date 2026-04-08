"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminApi, authApi, type AdminUser } from "@/lib/api";
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
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

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
      <nav className="glass border-b sticky top-0 z-50 transition-all" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 transition-colors mr-2 hover:scale-110 active:scale-95" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "var(--error)" }}>
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block">Yönetim Paneli</span>
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl" style={{ background: "var(--error-light)" }}>
                  <Users className="w-6 h-6" style={{ color: "var(--error)" }} />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">Kullanıcı Yönetimi</h1>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: "var(--text-muted)" }}>{users.length} Kayıtlı Kullanıcı</p>
                </div>
            </div>
            
            <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                <input 
                    type="text" 
                    placeholder="İsim veya e-posta ara..." 
                    className="w-full rounded-2xl pl-11 pr-4 py-3 text-sm transition-all focus:outline-none focus:ring-2"
                    style={{ 
                      background: "var(--surface)", 
                      color: "var(--text)", 
                      border: "1px solid var(--border)",
                      "--tw-ring-color": "var(--primary-light)"
                    } as any}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-[11px] font-black uppercase tracking-widest border-b" style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-muted)" }}>
                        <tr>
                            <th className="px-6 py-5">Kullanıcı</th>
                            <th className="px-6 py-5">E-posta</th>
                            <th className="px-6 py-5">Bölüm / Sınıf</th>
                            <th className="px-6 py-5">Rol</th>
                            <th className="px-6 py-5 text-center">Günlük Limit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center opacity-50">Yükleniyor...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-12 text-center opacity-50">Sonuç bulunamadı.</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-500/5 transition-colors">
                                <td className="px-6 py-5 font-bold" style={{ color: "var(--text)" }}>{user.name}</td>
                                <td className="px-6 py-5 opacity-70">{user.email}</td>
                                <td className="px-6 py-5 opacity-70">
                                  {user.school || "Belirtilmemiş"} {user.year ? `/ ${user.year}. Sınıf` : ""}
                                </td>
                                <td className="px-6 py-5">
                                    {user.is_admin ? (
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border shadow-sm"
                                          style={{ background: "var(--error-light)", color: "var(--error)", borderColor: "var(--error-light)" }}>
                                          Admin
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold opacity-60 border"
                                          style={{ background: "var(--surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
                                          Standart
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className="flex items-center justify-center gap-3">
                                        <input 
                                            type="number" 
                                            className="w-16 rounded-xl px-2 py-1.5 text-center font-bold focus:outline-none transition-all"
                                            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
                                            defaultValue={user.daily_limit}
                                            id={`limit-${user.id}`}
                                        />
                                        <button 
                                            onClick={() => {
                                                const el = document.getElementById(`limit-${user.id}`) as HTMLInputElement;
                                                handleUpdateLimit(user.id, parseInt(el.value));
                                            }}
                                            className="p-2 rounded-xl transition-all hover:scale-110 active:scale-95 shadow-sm"
                                            style={{ background: "var(--primary)", color: "white" }}
                                            title="Kaydet"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
