import Link from 'next/link';
import { ArrowLeft, Stethoscope, Trash2, Mail, Clock, Database, ShieldCheck } from 'lucide-react';

import Footer from '@/components/Footer';

export default function DeleteAccount() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-300 overflow-y-auto">
      <nav className="glass border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">KlinikIQ</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">

        {/* Başlık */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Hesap Silme Talebi</h1>
            <p className="text-sm text-slate-400 mt-0.5">KlinikIQ — Dr. Furkan Güven tarafından geliştirilmiştir</p>
          </div>
        </div>

        {/* Nasıl Silinir */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Hesabınızı Nasıl Silersiniz?
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Hesabınızın silinmesini talep etmek için aşağıdaki e-posta adresine, kayıtlı e-postanızdan bir mesaj gönderin:
          </p>
          <a
            href="mailto:drguevenfurkan@icloud.com?subject=Hesap Silme Talebi&body=Merhaba, KlinikIQ hesabımın silinmesini talep ediyorum. Kayıtlı e-posta adresim: [e-posta adresinizi yazın]"
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold px-4 py-3 rounded-xl text-sm hover:bg-blue-500/20 transition-colors"
          >
            <Mail className="w-4 h-4" />
            drguevenfurkan@icloud.com
          </a>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">E-postanızda şunları belirtin:</p>
            <ul className="text-sm text-slate-400 space-y-1.5 pl-3">
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> KlinikIQ'ya kayıtlı e-posta adresiniz</li>
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">•</span> "Hesap Silme Talebi" konu başlığı</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Talebiniz <span className="text-white font-bold">7 iş günü</span> içinde işleme alınır ve size bilgi verilir.
          </p>
        </div>

        {/* Hangi Veriler Silinir */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-green-400" />
            Silinen Veriler
          </h2>
          <p className="text-sm text-slate-400 mb-3">Hesap silme talebinizin onaylanmasının ardından aşağıdaki veriler kalıcı olarak silinir:</p>
          <ul className="text-sm text-slate-400 space-y-2">
            {[
              "Ad, soyad ve e-posta adresi",
              "Tüm oturum ve vaka geçmişi",
              "Performans raporları ve puanlar",
              "Soru bankası cevap geçmişi",
              "Histoloji anotasyonları",
              "Biyometrik giriş bilgileri (varsa)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Saklama Süresi */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            Veri Saklama Politikası
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            KlinikIQ, kullanıcı verilerini yalnızca hesap aktif olduğu sürece saklar.
            Hesap silme talebi onaylandıktan sonra tüm veriler kalıcı olarak silinir.
            Aktif hesaplara ait veriler, hizmet kalitesini korumak amacıyla saklanmaya devam eder.
          </p>
        </div>

        {/* Alternatif: Uygulama İçinden */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            Uygulama İçinden Çıkış
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Yalnızca cihazınızdan çıkış yapmak istiyorsanız uygulamayı açın,
            <span className="text-white font-bold"> Ayarlar → Oturumu Kapat</span> adımlarını izleyin.
            Bu işlem yalnızca oturumunuzu sonlandırır, hesabınızı ve verilerinizi silmez.
          </p>
        </div>

      </main>

      <Footer />
    </div>
  );
}
