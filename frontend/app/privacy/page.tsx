import Link from 'next/link';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-300 overflow-y-auto">
      <nav className="glass border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
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

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12">
        <div className="glass rounded-2xl p-8 border border-slate-800 prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold text-white mb-6">Gizlilik Politikası</h1>
          
          <p className="text-sm text-slate-400 mb-8">Son güncellenme: {new Date().toLocaleDateString('tr-TR')}</p>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">1. Veri Toplama ve Kullanımı</h2>
          <p className="mb-4">
            KlinikIQ platformunu ("Platform") kullanırken, kayıt olmanız ve simülasyon deneyimini yaşamanız için adınız, 
            okulunuz, sınıfınız ve e-posta adresiniz gibi temel bilgileri toplarız. Bu bilgiler, liderlik tablosu sıralamalarınızı (maskelenmiş olarak) 
            ve kişisel hata defterinizi (çözdüğünüz vakalar ve kaçırdığınız tanılar) oluşturmak amacıyla kullanılır.
          </p>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">2. Yapay Zeka ve Veri İşleme</h2>
          <p className="mb-4">
            Platform, tıbbi simülasyonları gerçekleştirmek için girdiğiniz diyalogları, muayene ve tetkik taleplerini OpenAI (veya benzeri) 
            yapay zeka sağlayıcılarına iletir. Bu diyaloglar sadece "Hasta/Doktor simülasyonu" oluşturmak için kullanılır. Gerçek 
            hasta verilerinizi (KVK) veya gerçek yaşantınızdaki tanısal verileri bu alanlara asla yazmamalısınız.
          </p>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">3. Liderlik Tablosu ve Anonimlik</h2>
          <p className="mb-4">
            KlinikIQ, platform içerisindeki başarı puanlarınızı (Skor) Liderlik Tablosu'nda herkese açık olarak listeler. Ancak bu listeleme 
            sırasında kimliğinizi korumak amacıyla isminiz maskelenir (Örn: Furkan G.). Tam soyadınız diğer kullanıcılar tarafından görülemez.
          </p>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">4. Çerezler (Cookies) ve Yerel Depolama</h2>
          <p className="mb-4">
            Platform, oturumunuzu açık tutmak ve size daha iyi hizmet verebilmek için (Token yönetimi) tarayıcınızın yerel depolama özelliklerini (LocalStorage) kullanır.
          </p>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">5. İletişim</h2>
          <p className="mb-4">
            Kişisel verilerinizle, politikalarımızla veya hesabınızın silinmesi talebiyle ilgili her türlü soru için Github üzerinden yapımcıyla 
            iletişime geçebilirsiniz.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
