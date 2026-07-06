import Link from 'next/link';
import {
  ArrowLeft,
  Stethoscope,
  LifeBuoy,
  Mail,
  HelpCircle,
  AlertTriangle,
  Bug,
  KeyRound,
  Activity,
  ShieldCheck,
  FileText,
  Trash2,
  ExternalLink,
  Clock,
} from 'lucide-react';

import Footer from '@/components/Footer';

const SUPPORT_EMAIL = 'drguevenfurkan@icloud.com';

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Şifremi unuttum, ne yapmalıyım?',
    a: 'Giriş ekranındaki "Şifremi unuttum" bağlantısını kullanarak kayıtlı e-postanıza sıfırlama bağlantısı talep edebilirsiniz. Bağlantı 30 dakika içinde geçerlidir. E-posta gelmediyse spam klasörünü kontrol etmenizi öneririz.',
  },
  {
    q: 'Vaka simülasyonu çok yavaş yanıt veriyor.',
    a: 'Sanal hasta yanıtları yapay zeka modelleri tarafından üretilmektedir; sunucu yoğunluğuna bağlı olarak nadiren 10-15 saniye sürebilir. Eğer bu süreyi aşan beklemeler yaşıyorsanız internet bağlantınızı kontrol edip uygulamayı yeniden başlatın. Sorun devam ederse bize yazın.',
  },
  {
    q: 'Günlük vaka kotasını yanlış hesapladığını düşünüyorum.',
    a: 'Vaka kotanız her gün gece yarısı (Türkiye saati 00:00) yenilenir. Eğer kullanmadığınız bir vaka kotanızdan düşmüşse "Hata Bildirimi" bölümünden bize ekran görüntüsüyle ulaşın, manuel olarak iade ediyoruz.',
  },
  {
    q: 'Liderlik tablosunda neden tam ismim görünmüyor?',
    a: 'Gizlilik politikamız gereği ad-soyad maskelenmiş şekilde gösterilir (Örn: Furkan G.). Tam adınız diğer kullanıcılarla paylaşılmaz, kendi profilinizde tam görünür.',
  },
  {
    q: 'TUS Flashcard cevapları yanlış mı?',
    a: 'Flashcard içerikleri açık kaynaklı TUS soru veri setlerinden derlenmiştir, içerik müdahalemiz yoktur. Yanlış olduğunu düşündüğünüz bir kart için "Hata Bildirimi" bölümünden bize bildirim gönderirseniz veri kaynağımıza geri bildirim iletiriz.',
  },
  {
    q: 'Web ve mobil arasında verilerim senkron mu?',
    a: 'Evet. Aynı hesapla giriş yaptığınız sürece vakalarınız, raporlarınız, puanlarınız ve liderlik konumunuz tüm cihazlarda senkronize olur.',
  },
  {
    q: 'Premium / abonelik sistemi var mı?',
    a: 'Şu anda KlinikIQ tamamen ücretsizdir; ileride sunulabilecek opsiyonel özellikler için ücretli abonelik açılabilir, ancak temel vaka simülasyonu ve TUS flashcard erişimi her zaman ücretsiz kalacaktır.',
  },
];

const CATEGORIES: {
  icon: typeof KeyRound;
  iconColor: string;
  iconBg: string;
  title: string;
  desc: string;
}[] = [
  {
    icon: KeyRound,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    title: 'Hesap & Giriş',
    desc: 'Şifre sıfırlama, e-posta değişikliği, biyometrik girişle ilgili sorunlar.',
  },
  {
    icon: Activity,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    title: 'Vaka Simülasyonu',
    desc: 'Hasta yanıtları, tetkik sonuçları, rapor üretimi ve performans hesaplaması.',
  },
  {
    icon: Bug,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    title: 'Hata Bildirimi',
    desc: 'Uygulamanın çökmesi, donması veya beklenmedik davranması.',
  },
  {
    icon: ShieldCheck,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    title: 'Gizlilik & Veri',
    desc: 'Veri saklama, hesap silme, üçüncü taraf paylaşımları hakkında sorular.',
  },
];

export default function Destek() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-300 overflow-y-auto">
      <nav className="glass border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
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
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <LifeBuoy className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Destek</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              KlinikIQ — Dr. Furkan Güven tarafından geliştirilmiştir
            </p>
          </div>
        </div>

        {/* İletişim */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Bize Ulaşın
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Sorununuz aşağıdaki kategorilerin hiçbirine girmiyorsa veya hızlı bir
            yanıt almak istiyorsanız aşağıdaki e-posta adresine doğrudan
            yazabilirsiniz. Genelde <span className="text-white font-bold">24-48 saat</span>{' '}
            içinde yanıt veriyoruz.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=KlinikIQ Destek Talebi&body=Merhaba, KlinikIQ uygulamasıyla ilgili aşağıdaki konuda yardımınıza ihtiyacım var:%0D%0A%0D%0A[Sorunuzu detaylı yazın]%0D%0A%0D%0A--- Cihaz Bilgileri ---%0D%0AUygulama: iOS / Android / Web%0D%0AUygulama Sürümü: ...%0D%0ACihaz: ...`}
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold px-4 py-3 rounded-xl text-sm hover:bg-blue-500/20 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {SUPPORT_EMAIL}
          </a>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              E-postanızda lütfen belirtin:
            </p>
            <ul className="text-sm text-slate-400 space-y-1.5 pl-3">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                Sorunun yaşandığı cihaz (iOS / Android / Web) ve uygulama sürümü
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                Sorunu yeniden üreten adımlar
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                Mümkünse ekran görüntüsü veya kısa video
              </li>
            </ul>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Hafta içi <span className="text-white font-bold">09:00 — 22:00</span>{' '}
              (TRT) arası daha hızlı yanıt veriyoruz.
            </span>
          </div>
        </div>

        {/* Kategoriler */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            Yardım Kategorileri
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Hangi konuda destek almak istediğinize göre e-postanızın konusuna
            kategoriyi yazarsanız işlem süremiz kısalır.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  className="flex gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg}`}
                  >
                    <Icon className={`w-4 h-4 ${c.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{c.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                      {c.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SSS */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            Sıkça Sorulan Sorular
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden p-4 text-sm font-bold text-white hover:bg-slate-900 transition-colors">
                  <span className="flex-1">{item.q}</span>
                  <span className="text-slate-500 text-xs group-open:rotate-180 transition-transform shrink-0">
                    ▼
                  </span>
                </summary>
                <div className="px-4 pb-4 -mt-1 text-sm text-slate-400 leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Tıbbi Uyarı */}
        <div className="bg-amber-500/5 rounded-2xl border border-amber-500/20 p-6 mb-6">
          <h2 className="text-lg font-black text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Önemli Tıbbi Uyarı
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            KlinikIQ tamamen <span className="font-bold text-white">eğitim amaçlıdır</span>{' '}
            ve klinik karar verme pratiği için tasarlanmıştır. Uygulamadaki
            içerikler kesinlikle gerçek tıbbi tavsiye, tanı veya tedavi yerine
            geçmez. Sağlık sorunlarınız için mutlaka yetkili bir hekime
            başvurunuz.
          </p>
          <p className="text-xs text-slate-500 mt-3">
            Acil tıbbi durumlarda <span className="text-white font-bold">112</span>{' '}
            (Türkiye) numarasını arayın.
          </p>
        </div>

        {/* Yararlı Linkler */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h2 className="text-lg font-black text-white mb-4">Yararlı Bağlantılar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/privacy"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-sm font-bold text-white">Gizlilik Politikası</span>
            </Link>
            <Link
              href="/terms"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm font-bold text-white">Kullanım Şartları</span>
            </Link>
            <Link
              href="/delete-account"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm font-bold text-white">Hesap Silme</span>
            </Link>
            <a
              href="https://github.com/drFurkanGuven"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="text-sm font-bold text-white">GitHub</span>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
