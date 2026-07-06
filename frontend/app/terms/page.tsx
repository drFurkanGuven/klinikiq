import Link from 'next/link';
import {
  ArrowLeft,
  Stethoscope,
  AlertTriangle,
  AlertCircle,
  FileText,
  BookOpen,
  Stethoscope as StethoIcon,
  User,
  CheckCircle2,
  XCircle,
  Award,
  Bot,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Heart,
  Edit2,
  Mail,
} from 'lucide-react';

import Footer from '@/components/Footer';

const LAST_UPDATED = '25 Nisan 2026';
const CONTACT_EMAIL = 'drguevenfurkan@icloud.com';
const PROVIDER = 'Furkan Güven (KlinikIQ — bireysel geliştirici)';
const GOVERNING_LAW = 'Türkiye Cumhuriyeti';

const TOC: { href: string; label: string }[] = [
  { href: '#tanimlar', label: 'Tanımlar' },
  { href: '#kapsam', label: 'Hizmetin Kapsamı' },
  { href: '#uygunluk', label: 'Uygunluk ve Hesap' },
  { href: '#yukumluluk', label: 'Kullanıcı Yükümlülükleri' },
  { href: '#yasaklar', label: 'Yasaklı Davranışlar' },
  { href: '#fikri-mulkiyet', label: 'Fikri Mülkiyet' },
  { href: '#ucuncu-taraf', label: 'Üçüncü Taraf İçerikleri ve YZ' },
  { href: '#sorumluluk', label: 'Sorumluluk Reddi' },
  { href: '#garanti', label: 'Garanti Sınırlamaları' },
  { href: '#degisiklik', label: 'Hizmette Değişiklik / Sonlandırma' },
  { href: '#bagis', label: 'Bağışlar' },
  { href: '#guncelleme', label: 'Şartların Güncellenmesi' },
  { href: '#hukuk', label: 'Geçerli Hukuk ve Yetki' },
  { href: '#iletisim', label: 'İletişim' },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-y-auto">
      <nav className="glass border-b border-border sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground">KlinikIQ</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        {/* Başlık */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center">
            <FileText className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              Kullanım Şartları
            </h1>
            <p className="text-sm text-muted mt-0.5">
              KlinikIQ — Dr. Furkan Güven tarafından geliştirilmiştir
            </p>
          </div>
        </div>
        <p className="text-xs text-muted mb-8">
          Son güncelleme: <span className="text-foreground font-bold">{LAST_UPDATED}</span>
        </p>

        {/* Tıbbi Disclaimer */}
        <div className="bg-surface-muted border-2 border-border-strong rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-7 h-7 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-warning mb-2 uppercase tracking-wider">
                Tıbbi Tavsiye Değildir — Critical Disclaimer
              </p>
              <p className="text-sm text-warning leading-relaxed mb-2">
                KlinikIQ ("Platform"), <span className="font-bold">tıp eğitimi ve klinik karar verme pratiği</span>{' '}
                amacıyla tasarlanmış kurgusal bir simülasyon ortamıdır. Platformda
                yer alan vakalar, semptomlar, laboratuvar değerleri, görüntüleme
                sonuçları, tedavi önerileri ve yapay zeka tarafından üretilen
                yanıtların tamamı <span className="font-bold">eğitim amaçlı kurgudur</span>.
              </p>
              <ul className="text-xs text-warning space-y-1.5 mt-3 pl-3">
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  Platform içeriği <span className="font-bold">teşhis, tedavi veya profesyonel tıbbi tavsiye</span> yerine geçemez.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  Gerçek hastalar üzerinde uygulamak, klinik karar mekanizmasında kullanmak yasaktır.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  Sağlık sorunlarınız için lütfen yetkili bir hekime başvurun. Acil durumlarda <span className="font-bold">112</span>'yi arayın.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Giriş */}
        <div className="bg-surface-muted rounded-2xl border border-border p-6 mb-6">
          <p className="text-sm text-foreground leading-relaxed">
            Bu Kullanım Şartları ("Şartlar"), KlinikIQ web sitesi, mobil
            uygulamaları ve ilgili tüm hizmetlerinin (toplu olarak "Hizmet")
            kullanımını düzenler. Hizmeti kullanmaya başlayarak bu Şartları,{' '}
            <Link href="/privacy" className="text-foreground hover:underline">
              Gizlilik Politikası
            </Link>
            'nı ve yukarıdaki Tıbbi Disclaimer'ı kabul ettiğinizi beyan
            edersiniz. Şartları kabul etmiyorsanız Hizmeti kullanmamalısınız.
          </p>
        </div>

        {/* İçindekiler */}
        <div className="bg-surface-muted rounded-2xl border border-border p-6 mb-6">
          <h2 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted" />
            İçindekiler
          </h2>
          <ol className="text-sm text-muted grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 list-decimal pl-5">
            {TOC.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="hover:text-foreground transition-colors hover:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* 1. Tanımlar */}
        <Section
          id="tanimlar"
          icon={BookOpen}
          color="text-foreground"
          bg="bg-surface-muted"
          title="1. Tanımlar"
        >
          <ul className="text-sm text-foreground space-y-2">
            <Bullet>
              <span className="font-bold text-foreground">Platform / Hizmet:</span>{' '}
              KlinikIQ adı altında sunulan web sitesi, iOS ve Android uygulamaları, ilgili API'ler ve içerikler.
            </Bullet>
            <Bullet>
              <span className="font-bold text-foreground">Geliştirici / Sağlayıcı:</span>{' '}
              {PROVIDER}.
            </Bullet>
            <Bullet>
              <span className="font-bold text-foreground">Kullanıcı:</span>{' '}
              Hizmete kayıt olan ya da Hizmeti herhangi bir şekilde kullanan gerçek kişi.
            </Bullet>
            <Bullet>
              <span className="font-bold text-foreground">İçerik:</span>{' '}
              Vakalar, sorular, flashcardlar, histoloji görselleri, raporlar, yapay zeka çıktıları dahil tüm metin / görsel öğeler.
            </Bullet>
            <Bullet>
              <span className="font-bold text-foreground">Yapay Zeka Çıktısı:</span>{' '}
              Üçüncü taraf büyük dil modelleri tarafından üretilen ve Platform tarafından sunulan otomatik yanıtlar.
            </Bullet>
          </ul>
        </Section>

        {/* 2. Kapsam */}
        <Section
          id="kapsam"
          icon={StethoIcon}
          color="text-foreground"
          bg="bg-surface-muted"
          title="2. Hizmetin Kapsamı"
        >
          <p>
            KlinikIQ; tıp fakültesi öğrencileri ve hekim adayları için
            hazırlanmış oyunlaştırılmış bir <span className="font-bold text-foreground">klinik karar verme simülatörüdür</span>.
            Platform; sanal hasta simülasyonu, acil vaka senaryoları, TUS hazırlık
            flashcardları, histoloji öğrenme atlası ve performans takibi gibi
            modüller sunar. İçerik kurgu olup gerçek hastaları temsil etmez.
          </p>
        </Section>

        {/* 3. Uygunluk */}
        <Section
          id="uygunluk"
          icon={User}
          color="text-success"
          bg="bg-surface-muted"
          title="3. Uygunluk ve Hesap"
        >
          <ul className="text-sm text-foreground space-y-2">
            <Bullet>Hizmeti kullanabilmek için en az <span className="font-bold text-foreground">16 yaşında</span> olmalısınız.</Bullet>
            <Bullet>Kayıt sırasında verdiğiniz bilgilerin doğru, güncel ve eksiksiz olduğunu beyan edersiniz.</Bullet>
            <Bullet>Bir hesap birden fazla kişi tarafından paylaşılamaz; hesabınızdaki tüm aktivitelerden siz sorumlusunuz.</Bullet>
            <Bullet>Şifrenizin gizliliğini korumak ve yetkisiz erişimi derhal bildirmek sizin yükümlülüğünüzdür.</Bullet>
            <Bullet>Hesabınızı dilediğiniz zaman silebilir veya silinmesini talep edebilirsiniz.</Bullet>
          </ul>
        </Section>

        {/* 4. Yükümlülükler */}
        <Section
          id="yukumluluk"
          icon={CheckCircle2}
          color="text-foreground"
          bg="bg-surface-muted"
          title="4. Kullanıcı Yükümlülükleri"
        >
          <p className="mb-3">Hizmeti kullanırken:</p>
          <ul className="text-sm text-foreground space-y-2">
            <Bullet>Yalnızca eğitim ve kişisel öğrenme amacıyla kullanacağınızı kabul edersiniz.</Bullet>
            <Bullet>Gerçek hasta verisi, kimlik bilgisi veya başka bir kişinin özel verisini Platform'a girmeyeceğinizi taahhüt edersiniz.</Bullet>
            <Bullet>Yürürlükteki tüm mevzuata, mesleki etik kurallarına ve kamu düzenine uygun davranacağınızı kabul edersiniz.</Bullet>
            <Bullet>Platform'a zarar verecek, hizmeti aksatacak veya başka kullanıcıların deneyimini olumsuz etkileyecek davranışlardan kaçınırsınız.</Bullet>
          </ul>
        </Section>

        {/* 5. Yasaklı Davranışlar */}
        <Section
          id="yasaklar"
          icon={XCircle}
          color="text-destructive"
          bg="bg-surface-muted"
          title="5. Yasaklı Davranışlar"
        >
          <p className="mb-3">Aşağıdaki davranışlar kesinlikle yasaktır:</p>
          <ul className="text-sm text-foreground space-y-2">
            <Bullet>Liderlik tablosunu manipüle etmek (puan hilesi, otomatik script ile vaka çözme).</Bullet>
            <Bullet>API'leri yetkisiz şekilde scrape etmek, ters mühendislik yapmak veya rate limit'leri aşmaya çalışmak.</Bullet>
            <Bullet>Yapay zeka modellerini sistemin amacı dışına çıkarmaya yönelik <span className="font-bold text-foreground">prompt injection</span> ve jailbreak girişimleri.</Bullet>
            <Bullet>Platform içeriğini izinsiz toplu indirip ticari amaçla yeniden dağıtmak.</Bullet>
            <Bullet>Diğer kullanıcıları taciz etmek, tehdit etmek veya nefret söylemi paylaşmak.</Bullet>
            <Bullet>Telif hakkı veya fikri mülkiyet haklarını ihlal eden içerik yüklemek.</Bullet>
            <Bullet>Platform'a virüs, kötü amaçlı yazılım veya zararlı kod enjekte etmeye çalışmak.</Bullet>
            <Bullet>Hizmetin altyapısına yetkisiz erişmeye veya başka kullanıcıların hesaplarını ele geçirmeye çalışmak.</Bullet>
          </ul>
          <p className="mt-3 text-xs text-warning italic">
            Bu maddelere aykırı davranışlar; uyarı yapılmaksızın hesap askıya alma,
            kalıcı silme ve gerekli hâllerde yasal işlem başlatma ile sonuçlanabilir.
          </p>
        </Section>

        {/* 6. Fikri Mülkiyet */}
        <Section
          id="fikri-mulkiyet"
          icon={Award}
          color="text-purple-400"
          bg="bg-purple-500/10"
          title="6. Fikri Mülkiyet"
        >
          <p className="mb-3">
            Platformun yazılım kodu, tasarımı, marka, logo ve KlinikIQ tarafından
            özel olarak hazırlanmış içerikler{' '}
            <span className="font-bold text-foreground">{PROVIDER}</span>'e aittir ve
            yürürlükteki fikri mülkiyet mevzuatı ile korunur.
          </p>
          <ul className="text-sm text-foreground space-y-2">
            <Bullet>İçeriği kopyalamak, çoğaltmak, ticari amaçla dağıtmak veya türev eserler oluşturmak yazılı izin gerektirir.</Bullet>
            <Bullet>Açık kaynak bileşenler ve üçüncü taraf veri setleri (HuggingFace TUS dataset, Wikimedia Commons görselleri vb.) kendi lisanslarına tâbidir; ilgili atıflar uygulama içindeki <span className="font-bold text-foreground">"Krediler ve Teşekkürler"</span> sayfasında listelenir.</Bullet>
            <Bullet>Kullanıcı tarafından platforma girilen serbest metinler (vaka cevapları, notlar) Kullanıcıya aittir; Geliştirici bu içerikleri yalnızca hizmeti sunmak ve istatistik üretmek için işler.</Bullet>
          </ul>
        </Section>

        {/* 7. Üçüncü Taraf */}
        <Section
          id="ucuncu-taraf"
          icon={Bot}
          color="text-foreground"
          bg="bg-surface-muted"
          title="7. Üçüncü Taraf İçerikleri ve Yapay Zeka"
        >
          <p className="mb-3">
            Hizmet, üçüncü taraf büyük dil modelleri (OpenAI, Anthropic, Google
            vb.) ve açık kaynak veri kümeleri kullanır. Bu nedenle:
          </p>
          <ul className="text-sm text-foreground space-y-2">
            <Bullet>Yapay zeka çıktıları <span className="font-bold text-foreground">kesin doğruluk garantisi taşımaz</span>; tıbbi referans olarak kullanılamaz.</Bullet>
            <Bullet>Üretilen yanıtlar zaman zaman güncel literatürle çelişebilir, yanlı veya hatalı olabilir.</Bullet>
            <Bullet>Üçüncü taraf bağlantılar veya entegrasyonlar yalnızca kolaylık sağlar; ilgili sayfaların içeriği ve gizlilik uygulamaları KlinikIQ'nun sorumluluğunda değildir.</Bullet>
          </ul>
        </Section>

        {/* 8. Sorumluluk */}
        <Section
          id="sorumluluk"
          icon={ShieldAlert}
          color="text-warning"
          bg="bg-surface-muted"
          title="8. Sorumluluk Reddi"
        >
          <p className="mb-3">
            KlinikIQ "olduğu gibi" ve "mevcut olduğu sürece" esasıyla sunulur.
            Yürürlükteki mevzuatın izin verdiği azami ölçüde:
          </p>
          <ul className="text-sm text-foreground space-y-2">
            <Bullet>Platform içeriğinin mutlak doğruluğu, güncelliği veya eksiksizliği garanti edilmez.</Bullet>
            <Bullet>Platform'da yer alan bilgilerin <span className="font-bold text-foreground">tıbbi karar verme amacıyla kullanılmasından doğan</span> her türlü zarardan Geliştirici sorumlu tutulamaz.</Bullet>
            <Bullet>Doğrudan veya dolaylı zararlar, kâr kaybı, veri kaybı, itibar kaybı gibi durumlar için Geliştirici'nin toplam sorumluluğu, ilgili kullanıcıdan o zarara yol açan olaydan önceki 12 ayda alınmış toplam ücretle (varsa) sınırlıdır.</Bullet>
          </ul>
        </Section>

        {/* 9. Garanti */}
        <Section
          id="garanti"
          icon={AlertCircle}
          color="text-destructive"
          bg="bg-surface-muted"
          title="9. Garanti Sınırlamaları"
        >
          <p>
            Platform geliştirme aşamasında (Beta) bir gönüllü projesidir.
            Kesintisiz, hatasız veya tüm cihazlarda sorunsuz çalışma garantisi
            verilmez. Sistemde yaşanabilecek teknik aksaklıklar, yapay zeka API
            kesintileri veya öngörülemeyen veri kayıpları nedeniyle Geliştirici
            herhangi bir sorumluluk kabul etmez.
          </p>
        </Section>

        {/* 10. Değişiklik */}
        <Section
          id="degisiklik"
          icon={Clock}
          color="text-foreground"
          bg="bg-surface-muted"
          title="10. Hizmette Değişiklik veya Sonlandırma"
        >
          <p>
            Geliştirici; hizmet özelliklerini değiştirme, ücretlendirme modelini
            güncelleme, belirli özellikleri kaldırma veya hizmetin tamamını
            askıya alma hakkını saklı tutar. Önemli değişiklikler kullanıcılara
            uygulama içi bildirim veya e-posta yoluyla duyurulur.
          </p>
        </Section>

        {/* 11. Bağışlar */}
        <Section
          id="bagis"
          icon={Heart}
          color="text-pink-400"
          bg="bg-pink-500/10"
          title="11. Bağışlar"
        >
          <p>
            KlinikIQ ileride opsiyonel bağış kanalları sunabilir
            (örn. "Kahve Ismarla", Patreon vb.). Bağışlar tamamen gönüllü
            tabanlıdır; <span className="font-bold text-foreground">hiçbir hizmet, garantili kullanım, VIP üyelik veya
            iade hakkı tanımaz</span>. Bağış yapan kullanıcılar bu Şartların geri
            kalanına aynı şekilde tâbidir.
          </p>
        </Section>

        {/* 12. Şartların Güncellenmesi */}
        <Section
          id="guncelleme"
          icon={Edit2}
          color="text-foreground"
          bg="bg-surface-muted"
          title="12. Şartların Güncellenmesi"
        >
          <p>
            Geliştirici, bu Şartları zaman zaman güncelleyebilir. Önemli
            değişiklikler uygulama içi bildirim ve "Son güncelleme" tarihi ile
            duyurulur. Güncel Şartların yürürlük tarihinden sonra Hizmeti
            kullanmaya devam etmeniz değişiklikleri kabul ettiğiniz anlamına
            gelir. Şartları kabul etmediğiniz takdirde hesabınızı silmek
            sizin sorumluluğunuzdadır.
          </p>
        </Section>

        {/* 13. Geçerli Hukuk */}
        <Section
          id="hukuk"
          icon={ShieldCheck}
          color="text-foreground"
          bg="bg-surface-muted"
          title="13. Geçerli Hukuk ve Yetki"
        >
          <p className="mb-3">
            İşbu Şartlar <span className="font-bold text-foreground">{GOVERNING_LAW}</span>{' '}
            hukukuna tâbidir.
          </p>
          <p className="mb-3">
            <span className="font-bold text-foreground">Tüketici sıfatına sahip kullanıcılar</span>{' '}
            bakımından 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümleri
            saklıdır. Bu kullanıcılar, uyuşmazlıkları kendi yerleşim yerlerindeki{' '}
            <span className="font-bold text-foreground">Tüketici Hakem Heyetleri</span> ve{' '}
            <span className="font-bold text-foreground">Tüketici Mahkemeleri</span> önünde
            çözmek üzere yasal başvuru haklarını koruyacaktır.
          </p>
          <p>
            Tüketici niteliği taşımayan uyuşmazlıklarda (örn. fikri mülkiyet
            ihlalleri, hizmetin suistimali, prompt injection, hesap manipülasyonu
            veya ticari kullanım) ise <span className="font-bold text-foreground">Geliştirici'nin yerleşim yerindeki
            Türkiye Cumhuriyeti mahkemeleri ve icra daireleri</span> yetkilidir
            (HMK md. 6 ve 9 uyarınca).
          </p>
        </Section>

        {/* 14. İletişim */}
        <div
          id="iletisim"
          className="bg-surface-muted rounded-2xl border border-border p-6"
        >
          <h2 className="text-lg font-black text-foreground mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5 text-foreground" />
            14. İletişim
          </h2>
          <p className="text-sm text-foreground leading-relaxed mb-4">
            Bu Şartlar, hesabınız veya genel destek talepleri için aşağıdaki
            e-posta adresinden bize ulaşabilirsiniz.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=KlinikIQ%20-%20Kullan%C4%B1m%20%C5%9Eartlar%C4%B1%20Talebi`}
            className="inline-flex items-center gap-2 bg-surface-muted border border-border text-foreground font-bold px-4 py-3 rounded-xl text-sm hover:bg-surface-muted transition-colors"
          >
            <Mail className="w-4 h-4" />
            {CONTACT_EMAIL}
          </a>
          <p className="text-xs text-muted mt-4">
            Sağlayıcı:{' '}
            <span className="text-foreground font-bold">{PROVIDER}</span>
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
  icon: typeof FileText;
  color: string;
  bg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-surface-muted rounded-2xl border border-border p-6 mb-6 scroll-mt-20"
    >
      <h2 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}
        >
          <Icon className={`w-4 h-4 ${color}`} />
        </span>
        {title}
      </h2>
      <div className="text-sm text-muted leading-relaxed">{children}</div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-muted mt-1">•</span>
      <span>{children}</span>
    </li>
  );
}
