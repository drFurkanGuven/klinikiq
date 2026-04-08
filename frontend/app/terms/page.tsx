import Link from 'next/link';
import { ArrowLeft, Stethoscope, AlertTriangle } from 'lucide-react';
import Footer from '@/components/Footer';

export default function TermsOfService() {
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
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-3xl font-bold text-white m-0">Kullanım Şartları</h1>
          </div>
          
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-400 font-bold m-0 mb-1">TIBBİ TAVSİYE DEĞİLDİR (CRITICAL DISCLAIMER)</p>
              <p className="text-xs text-amber-200/70 m-0">
                KlinikIQ ("Platform") kesinlikle teşhis, tedavi veya profesyonel tıbbi tavsiye amacıyla kullanılamaz. 
                Platformdaki vakalar, laboratuvar sonuçları ve yapay zeka tarafından oluşturulan yanıtlar tamamen kurgusaldır ve eğitim/simülasyon 
                amacı taşır. Gerçek hastaların tedavisi için bu platformdaki verileri kullanmak yasaktır.
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">1. Kabul Edilen Şartlar</h2>
          <p className="mb-4">
            Bu platformu kullanarak, tüm kullanım şartlarını ve "Tıbbi Tavsiye Değildir" uyarısını okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz.
          </p>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">2. Eğitim Amacı</h2>
          <p className="mb-4">
            KlinikIQ, tıp öğrencileri ve asistan hekimler için tasarlanmış bir "Oyunlaştırılmış Klinik Karar Destek Simülatörüdür". 
            Üretilen teşhis ve tetkikler hata içerebilir; bu nedenle her zaman güncel tıp literatürü ve resmi TUS kaynakları referans alınmalıdır.
          </p>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">3. Hesap Güvenliği ve Kötüye Kullanım</h2>
          <p className="mb-4">
            Liderlik tablosunda hile yapmak (API açıklarını kullanarak puan manipülasyonu), platformun yapay zeka sınırlarını (Prompt Injection) 
            kötüye kullanmak ve sisteme zarar vermek yasaktır. Bu tür davranışlarda bulunan kullanıcıların hesapları uyarı yapılmaksızın silinebilir. 
            Tek bir vakanın eşsiz olmayan çoklu katılımları rekor (En yüksek skor) bazında değerlendirilecektir.
          </p>

          <h2 className="text-xl font-semibold text-slate-200 mt-8 mb-4">4. Kesintisiz Hizmet Garantisi Olmaması</h2>
          <p className="mb-4">
            Platform geliştirme aşamasında (Beta) bir gönüllü projesidir. Sistemde yaşanabilecek teknik aksaklıklar, yapay zeka API kesintileri 
            veya veri kayıplarından dolayı platform sorumluluk kabul etmez. Bağışlar (Kahve Ismarla) tamamen gönüllü tabanlı olup, 
            hiçbir şekilde hizmet garantisi satın alımı veya VIP üyelik hakkı tanımaz.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
