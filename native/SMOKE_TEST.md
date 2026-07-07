# KlinikIQ Native — Smoke Test Checklist

Release öncesi manuel test listesi (iOS, v1.3.2+).

## Ortam

- [ ] Production API erişilebilir: `curl https://klinikiq.furkanguven.space/health`
- [ ] Reviewer hesabı oluşturuldu: `cd backend && python seed_reviewer.py`

## iOS — iPad simülatör

- [ ] Fresh install (önceki sürüm kaldırıldı)
- [ ] Login ekranı: monokrom kart, "Tekrar hoş geldin"
- [ ] Yanlış şifre → Türkçe hata mesajı
- [ ] Uçak modu → bağlantı hatası
- [ ] Demo hesap ile giriş → Çalış sekmesi açılıyor
- [ ] Çalış → Bugün → Oturumu başlat → MCQ akışı
- [ ] Çalış → İlerleme → native istatistikler yükleniyor
- [ ] Çalış → Profil → Hesap ve ayarlar
- [ ] Vaka → Rastgele başlat veya önerilen vaka
- [ ] Öğren → Farmakoloji (WebView, geri butonu çalışıyor)
- [ ] Logout → login ekranına dönüş

## iOS — iPhone simülatör

- [ ] Login + 3 sekme navigasyonu (Çalış | Vaka | Öğren)
- [ ] Face ID (fiziksel cihaz): hızlı giriş token doğruluyor

## Auth / oturum

- [ ] Giriş sonrası uygulama kapat-aç → oturum devam (Beni hatırla açık)
- [ ] E-posta hatırlama: login ekranında kayıtlı e-posta dolu geliyor
- [ ] Access token süresi dolduğunda refresh ile devam
- [ ] Refresh başarısız → login ekranına yönlendirme
- [ ] WebView sayfalarında token enjekte (farmakoloji giriş yapmadan açılıyor)

## Build doğrulama

- [ ] `npx tsc --noEmit` hatasız
- [ ] `eas build --platform ios --profile production` başarılı
- [ ] TestFlight build açılıyor, crash yok

## Android

Android testleri sonraki aşamada yapılacak.
