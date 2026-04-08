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

  if (isAdmin === null) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Yetki kontrolü yapılıyor...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Navbar */}
      <nav className="glass border-b border-red-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg transition-colors mr-2">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">Yönetim Paneli</span>
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-3 text-slate-300">
                <Users className="w-6 h-6 text-red-500" />
                <h1 className="text-2xl font-bold">Kullanıcı Yönetimi</h1>
                <span className="bg-slate-800 text-xs px-2 py-1 rounded-md">{users.length} Kayıt</span>
            </div>
            
            <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="İsim veya e-posta ara..." 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-colors"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </div>

        <div className="glass rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-800/50 text-xs text-slate-300 uppercase">
                        <tr>
                            <th className="px-6 py-4 font-medium">Kullanıcı</th>
                            <th className="px-6 py-4 font-medium">E-posta</th>
                            <th className="px-6 py-4 font-medium">Bölüm/Sınıf</th>
                            <th className="px-6 py-4 font-medium">Rol</th>
                            <th className="px-6 py-4 font-medium text-center">Günlük Limit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Yükleniyor...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Sonuç bulunamadı.</td></tr>
                        ) : filteredUsers.map(user => (
                            <tr key={user.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                                <td className="px-6 py-4">{user.email}</td>
                                <td className="px-6 py-4">{user.school || "-"} / {user.year ? `${user.year}. Sınıf` : "-"}</td>
                                <td className="px-6 py-4">
                                    {user.is_admin ? (
                                        <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs font-bold border border-red-500/20">Admin</span>
                                    ) : (
                                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs">Standart</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <input 
                                            type="number" 
                                            className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-center text-white focus:outline-none focus:border-red-500"
                                            defaultValue={user.daily_limit}
                                            id={`limit-${user.id}`}
                                        />
                                        <button 
                                            onClick={() => {
                                                const el = document.getElementById(`limit-${user.id}`) as HTMLInputElement;
                                                handleUpdateLimit(user.id, parseInt(el.value));
                                            }}
                                            className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors border border-blue-500/30 text-xs"
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
