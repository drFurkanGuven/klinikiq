import Link from 'next/link';
import {
  ArrowLeft,
  Stethoscope,
  ShieldCheck,
  Database,
  Activity,
  Bot,
  Clock,
  Lock,
  Settings,
  User,
  Trophy,
  Edit2,
  Mail,
  AlertCircle,
  BookOpen,
  Award,
  Heart,
} from 'lucide-react';

import Footer from '@/components/Footer';

const LAST_UPDATED = '25 Nisan 2026';
const CONTACT_EMAIL = 'drguevenfurkan@icloud.com';
const CONTROLLER = 'Furkan Güven (KlinikIQ — bireysel geliştirici)';

const TOC: { href: string; label: string }[] = [
  { href: '#ozet', label: 'Özet' },
  { href: '#veri-sorumlusu', label: 'Veri Sorumlusu' },
  { href: '#hangi-veriler', label: 'Toplanan Veriler' },
  { href: '#kullanim', label: 'Verilerin İşlenme Amaçları' },
  { href: '#ucuncu-taraf', label: 'Yapay Zeka ve Üçüncü Taraflar' },
  { href: '#saklama', label: 'Veri Saklama Süreleri' },
  { href: '#guvenlik', label: 'Veri Güvenliği' },
  { href: '#cerezler', label: 'Çerezler ve Yerel Depolama' },
  { href: '#cocuklar', label: 'Çocukların Gizliliği' },
  { href: '#haklar', label: 'KVKK ve GDPR Kapsamındaki Haklarınız' },
  { href: '#liderlik', label: 'Liderlik Tablosu ve Anonimlik' },
  { href: '#degisiklikler', label: 'Politikadaki Değişiklikler' },
  { href: '#iletisim', label: 'İletişim ve Talepler' },
];

export default function PrivacyPolicy() {
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

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        {/* Başlık */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Gizlilik Politikası
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              KlinikIQ — Dr. Furkan Güven tarafından geliştirilmiştir
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-8 ml-15 sm:ml-15">
          Son güncelleme: <span className="text-slate-300 font-bold">{LAST_UPDATED}</span>
        </p>

        {/* Özet Kart */}
        <div
          id="ozet"
          className="bg-blue-500/5 rounded-2xl border border-blue-500/20 p-6 mb-6"
        >
          <h2 className="text-lg font-black text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            Tek Bakışta Özet
          </h2>
          <ul className="text-sm text-slate-300 space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              KlinikIQ <span className="font-bold text-white">eğitim amaçlı</span> bir tıp simülasyon platformudur; <span className="font-bold text-white">gerçek hasta verisi toplamaz</span>.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              Sadece kayıt için zorunlu temel bilgileri (ad, e-posta, sınıf vb.) ve uygulama içi performans verilerinizi tutarız.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              Vaka diyaloglarınız <span className="font-bold text-white">üçüncü taraf yapay zeka servisleri</span> (OpenAI, Anthropic, Google) ile <span className="font-bold text-white">geçici olarak</span> işlenir; gerçek hasta bilgisi yazmamalısınız.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              Verileriniz reklam, profilleme veya satış amacıyla <span className="font-bold text-white">üçüncü taraflarla paylaşılmaz</span>.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              Hesabınızı istediğiniz zaman silebilir, verilerinize ilişkin haklarınızı kullanabilirsiniz.
            </li>
          </ul>
        </div>

        {/* İçindekiler */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
          <h2 className="text-sm font-black text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            İçindekiler
          </h2>
          <ol className="text-sm text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 list-decimal pl-5">
            {TOC.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="hover:text-white transition-colors hover:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* 1. Veri Sorumlusu */}
        <Section
          id="veri-sorumlusu"
          icon={User}
          color="text-cyan-400"
          bg="bg-cyan-500/10"
          title="1. Veri Sorumlusu"
        >
          <p>
            KVKK madde 3/1-(ı) ve GDPR Madde 4(7) anlamında bu platformun veri
            sorumlusu (controller) <span className="text-white font-bold">{CONTROLLER}</span>'dir.
            Talep ve sorularınız için iletişim adresi bu politikanın 13. bölümündedir.
          </p>
        </Section>

        {/* 2. Toplanan Veriler */}
        <Section
          id="hangi-veriler"
          icon={Database}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          title="2. Toplanan Veriler"
        >
          <p className="mb-3">
            KlinikIQ, hizmeti sunabilmek için aşağıdaki veri kategorilerini
            toplar ve işler:
          </p>
          <SubList
            title="Kimlik ve İletişim Bilgileri"
            items={[
              'Ad ve soyad (liderlik tablosunda maskelenmiş şekilde gösterilir)',
              'E-posta adresi (giriş, parola sıfırlama, kritik bildirimler için)',
              'Şifre (yalnızca tek yönlü hash olarak saklanır; düz metin tutulmaz)',
            ]}
          />
          <SubList
            title="Profil ve Eğitim Bilgileri"
            items={[
              'Tıp fakültesi adı (opsiyonel)',
              'Sınıf / dönem bilgisi (opsiyonel)',
              'Avatar / profil resmi (opsiyonel)',
            ]}
          />
          <SubList
            title="Uygulama İçi Aktivite Verileri"
            items={[
              'Tamamlanan ve aktif vakalar, performans skorları, hata defteri kayıtları',
              'TUS flashcard cevaplama geçmişi ve "kolay/zor" işaretlemeleri',
              'Histoloji, soru bankası ve öğrenme modülü etkileşimleri',
              'Liderlik tablosu konumu ve günlük çalışma serisi (streak)',
            ]}
          />
          <SubList
            title="Teknik ve Cihaz Verileri"
            items={[
              'IP adresi (saldırı tespiti ve suistimal önleme amacıyla, kısa süreli)',
              'Tarayıcı / cihaz türü, işletim sistemi, uygulama sürümü',
              'Anonim hata ve çökme raporları (bug fix amaçlı)',
            ]}
          />
        </Section>

        {/* 3. Verilerin İşlenme Amaçları */}
        <Section
          id="kullanim"
          icon={Activity}
          color="text-purple-400"
          bg="bg-purple-500/10"
          title="3. Verilerin İşlenme Amaçları"
        >
          <p className="mb-3">
            Toplanan veriler yalnızca aşağıdaki açık ve meşru amaçlar için
            işlenir (KVKK md. 4 ve GDPR md. 5 ilkeleri uyarınca):
          </p>
          <ul className="text-sm text-slate-300 space-y-2">
            <Bullet>Kullanıcı hesabınızı oluşturmak ve oturumunuzu yönetmek</Bullet>
            <Bullet>Eğitim simülasyonlarını sağlamak ve performansınızı izlemek</Bullet>
            <Bullet>Liderlik tablosunda anonimleştirilmiş şekilde sıralama göstermek</Bullet>
            <Bullet>Suistimal, hile (puan manipülasyonu, prompt injection) ve güvenlik ihlallerini önlemek</Bullet>
            <Bullet>Yasal yükümlülüklerimizi (örn. mahkeme talebine cevap) yerine getirmek</Bullet>
            <Bullet>Hizmeti iyileştirmek için anonimleştirilmiş istatistik üretmek</Bullet>
          </ul>
          <p className="mt-3 text-xs text-slate-500 italic">
            Verileriniz <span className="text-white not-italic font-bold">reklam, profilleme veya satış</span> amacıyla
            kullanılmaz.
          </p>
        </Section>

        {/* 4. Yapay Zeka ve Üçüncü Taraflar */}
        <Section
          id="ucuncu-taraf"
          icon={Bot}
          color="text-indigo-400"
          bg="bg-indigo-500/10"
          title="4. Yapay Zeka ve Üçüncü Taraf İşleyiciler"
        >
          <p className="mb-3">
            Sanal hasta simülasyonları ve metin üretiminin gerçekleştirilebilmesi
            için diyaloglarınız aşağıdaki üçüncü taraf yapay zeka sağlayıcılarına
            iletilebilir:
          </p>
          <ul className="text-sm text-slate-300 space-y-1.5">
            <Bullet>OpenAI (ABD)</Bullet>
            <Bullet>Anthropic (ABD)</Bullet>
            <Bullet>Google AI / Vertex AI (ABD / AB)</Bullet>
          </ul>
          <p className="mt-3">
            Bu sağlayıcılar diyalogları yalnızca <span className="text-white font-bold">hasta-doktor simülasyonu yanıtı üretmek</span> için
            anlık olarak işler ve kendi gizlilik politikalarına tâbidir. KlinikIQ,
            bu servislere yapılan API isteklerinde mümkün olduğunca model
            eğitiminden çıkarma (no-train) bayraklarını aktif tutar.
          </p>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mt-4">
            <p className="text-sm text-amber-200/90 font-bold mb-1">
              Önemli Uyarı
            </p>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              Vaka simülasyonu giriş kutularına <span className="font-bold">gerçek hasta verisi, kişisel sağlık
              bilgisi veya başka bir kişiye ait özel veri girmemelisiniz</span>. KlinikIQ
              kurgusal eğitim senaryoları üzerinde çalışmak için tasarlanmıştır.
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Ayrıca altyapı için aşağıdaki teknik servis sağlayıcılar kullanılabilir:
            barındırma (VDS sağlayıcısı), e-posta gönderimi (transactional e-posta servisi),
            hata izleme (Sentry vb.). Bu servisler yalnızca hizmetin teknik
            işleyişi için zorunlu verileri işler.
          </p>
        </Section>

        {/* 5. Veri Saklama */}
        <Section
          id="saklama"
          icon={Clock}
          color="text-amber-400"
          bg="bg-amber-500/10"
          title="5. Veri Saklama Süreleri"
        >
          <ul className="text-sm text-slate-300 space-y-2">
            <Bullet>
              <span className="font-bold text-white">Hesap verileri:</span> hesap aktif olduğu sürece saklanır.
            </Bullet>
            <Bullet>
              <span className="font-bold text-white">Vaka ve performans geçmişi:</span> hesap aktif olduğu sürece; hesap silindiğinde tüm kayıtlar kalıcı olarak silinir.
            </Bullet>
            <Bullet>
              <span className="font-bold text-white">Yapay zeka istek logları:</span> kalite kontrol ve suistimal incelemesi amacıyla en fazla <span className="font-bold text-white">30 gün</span>, ardından otomatik olarak silinir.
            </Bullet>
            <Bullet>
              <span className="font-bold text-white">Anonim istatistik / analitik:</span> kişisel bağlantı kurulamayacak şekilde anonim halde süresiz saklanabilir.
            </Bullet>
            <Bullet>
              <span className="font-bold text-white">Yasal yükümlülük:</span> belirli verilerin saklanması yasal olarak zorunlu olduğunda mevzuatın gerektirdiği süre boyunca tutulur.
            </Bullet>
          </ul>
        </Section>

        {/* 6. Güvenlik */}
        <Section
          id="guvenlik"
          icon={Lock}
          color="text-rose-400"
          bg="bg-rose-500/10"
          title="6. Veri Güvenliği"
        >
          <p className="mb-3">
            Verilerinizi korumak için sektör standardı tedbirler uygulanır:
          </p>
          <ul className="text-sm text-slate-300 space-y-2">
            <Bullet>Tüm trafik için zorunlu HTTPS / TLS şifrelemesi.</Bullet>
            <Bullet>Şifrelerin tek yönlü güçlü hash algoritmaları (bcrypt vb.) ile saklanması.</Bullet>
            <Bullet>JWT tabanlı oturum yönetimi ve oturum sürelerinin sınırlandırılması.</Bullet>
            <Bullet>Sunucu tarafında erişim logu ve anomali izleme.</Bullet>
            <Bullet>Düzenli yedekleme ve sürüm takibi.</Bullet>
          </ul>
          <p className="mt-3 text-xs text-slate-500 italic">
            Hiçbir internet servisi %100 güvenli değildir. Şifrenizi kimseyle
            paylaşmamak ve farklı servislerde tekrar kullanmamak sizin
            sorumluluğunuzdadır.
          </p>
        </Section>

        {/* 7. Çerezler */}
        <Section
          id="cerezler"
          icon={Settings}
          color="text-orange-400"
          bg="bg-orange-500/10"
          title="7. Çerezler ve Yerel Depolama"
        >
          <p className="mb-3">
            KlinikIQ web sürümü, oturum yönetimi ve kullanıcı tercihleri için
            tarayıcınızın yerel depolama (LocalStorage) ve çerez (cookie)
            mekanizmalarını kullanır. Reklam veya üçüncü taraf izleme çerezi
            kullanılmaz.
          </p>
          <ul className="text-sm text-slate-300 space-y-2">
            <Bullet><span className="font-bold text-white">Zorunlu çerezler:</span> oturum açma ve güvenlik (silinmesi durumunda hizmet çalışmaz).</Bullet>
            <Bullet><span className="font-bold text-white">Tercih çerezleri:</span> tema (açık/koyu) ve dil seçimi gibi.</Bullet>
            <Bullet>Mobil uygulamada hassas bilgiler iOS Keychain / Android Keystore üzerinde güvenli depolanır.</Bullet>
          </ul>
        </Section>

        {/* 8. Çocukların Gizliliği */}
        <Section
          id="cocuklar"
          icon={Heart}
          color="text-pink-400"
          bg="bg-pink-500/10"
          title="8. Çocukların Gizliliği"
        >
          <p>
            KlinikIQ, içeriği ve hedef kitlesi itibarıyla{' '}
            <span className="font-bold text-white">tıp öğrencileri ve hekim adaylarına</span> yöneliktir.
            Platform 13 yaş altı çocuklar için tasarlanmamıştır ve bilerek
            13 yaş altı kullanıcılardan veri toplamaz. App Store yaş
            derecelendirmemiz <span className="font-bold text-white">16+</span> olarak ayarlanmıştır. 13
            yaşından küçük bir çocuğun verilerini topladığımızı öğrenmemiz halinde,
            bu veriler derhal silinir.
          </p>
        </Section>

        {/* 9. Haklar */}
        <Section
          id="haklar"
          icon={Award}
          color="text-blue-400"
          bg="bg-blue-500/10"
          title="9. KVKK ve GDPR Kapsamındaki Haklarınız"
        >
          <p className="mb-3">
            Türkiye'de Kişisel Verilerin Korunması Kanunu (KVKK) madde 11 ve
            Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) madde 15-22 kapsamında
            aşağıdaki haklara sahipsiniz:
          </p>
          <ul className="text-sm text-slate-300 space-y-1.5">
            <Bullet>Kişisel verilerinizin işlenip işlenmediğini öğrenme.</Bullet>
            <Bullet>İşlenen veriler hakkında bilgi talep etme (erişim hakkı).</Bullet>
            <Bullet>Verilerin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.</Bullet>
            <Bullet>Verilerin yurt içinde / yurt dışında aktarıldığı üçüncü kişileri bilme.</Bullet>
            <Bullet>Verilerin eksik / yanlış işlenmişse düzeltilmesini isteme.</Bullet>
            <Bullet>Yasal şartlar oluştuğunda silinmesini veya yok edilmesini isteme.</Bullet>
            <Bullet>Verilerin yapılandırılmış formatta başka bir veri sorumlusuna aktarılmasını talep etme (taşınabilirlik).</Bullet>
            <Bullet>İşlemenin sınırlandırılmasını veya itiraz etmeyi.</Bullet>
            <Bullet>Hakların ihlal edildiğini düşündüğünüzde KVKK Kuruluna veya yetkili veri koruma otoritesine şikayet etme.</Bullet>
          </ul>
          <p className="mt-3">
            Bu haklarınızı kullanmak için 13. bölümdeki iletişim adresinden bize
            yazın. Talepleriniz <span className="font-bold text-white">en geç 30 gün</span> içinde ücretsiz olarak
            karşılanır (KVKK md. 13/2).
          </p>
        </Section>

        {/* 10. Liderlik */}
        <Section
          id="liderlik"
          icon={Trophy}
          color="text-yellow-400"
          bg="bg-yellow-500/10"
          title="10. Liderlik Tablosu ve Anonimlik"
        >
          <p>
            KlinikIQ, performans skorlarınızı liderlik tablosunda{' '}
            <span className="font-bold text-white">isim maskelenmiş</span> şekilde gösterir
            (örn: "Furkan G."). Tam soyad, e-posta veya iletişim bilgileri başka
            kullanıcılarla paylaşılmaz. Tablodan çıkarılma talebinde bulunabilir
            ya da hesabınızı silerek görünürlüğü tamamen kaldırabilirsiniz.
          </p>
        </Section>

        {/* 11. Değişiklikler */}
        <Section
          id="degisiklikler"
          icon={Edit2}
          color="text-slate-300"
          bg="bg-slate-500/10"
          title="11. Politikadaki Değişiklikler"
        >
          <p>
            Bu politikayı yasal yükümlülükler veya ürün değişiklikleri nedeniyle
            zaman zaman güncelleyebiliriz. Önemli değişiklikleri uygulama
            içinde duyurur ve "Son güncelleme" tarihini yenileriz.
            Güncellenmiş politikanın yürürlük tarihinden sonra hizmeti
            kullanmaya devam etmeniz değişiklikleri kabul ettiğiniz anlamına
            gelir.
          </p>
        </Section>

        {/* 12. İletişim */}
        <div
          id="iletisim"
          className="bg-slate-900 rounded-2xl border border-slate-800 p-6"
        >
          <h2 className="text-lg font-black text-white mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            12. İletişim ve Talepler
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            Gizlilik politikası, kişisel verileriniz ve haklarınızla ilgili tüm
            soru ve talepleriniz için aşağıdaki e-posta adresinden bize
            ulaşabilirsiniz. Talebinizi en geç 30 gün içinde yanıtlıyoruz.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=KlinikIQ%20-%20Gizlilik%20Talebi`}
            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold px-4 py-3 rounded-xl text-sm hover:bg-blue-500/20 transition-colors"
          >
            <Mail className="w-4 h-4" />
            {CONTACT_EMAIL}
          </a>
          <p className="text-xs text-slate-500 mt-4">
            Veri Sorumlusu:{' '}
            <span className="text-slate-300 font-bold">{CONTROLLER}</span>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────── */

function Section({
  id,
  icon: Icon,
  color,
  bg,
  title,
  children,
}: {
  id?: string;
  icon: typeof ShieldCheck;
  color: string;
  bg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6 scroll-mt-20"
    >
      <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}
        >
          <Icon className={`w-4 h-4 ${color}`} />
        </span>
        {title}
      </h2>
      <div className="text-sm text-slate-400 leading-relaxed">{children}</div>
    </section>
  );
}

function SubList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        {title}
      </p>
      <ul className="text-sm text-slate-300 space-y-1.5 pl-3">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2">
            <span className="text-slate-500 mt-1">•</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-slate-500 mt-1">•</span>
      <span>{children}</span>
    </li>
  );
}
