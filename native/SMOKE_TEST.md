# KlinikIQ Native — Smoke Test Checklist

Release öncesi manuel test listesi (v1.3.2+).

## Ortam

- [ ] Production API erişilebilir: `curl https://klinikiq.furkanguven.space/health`
- [ ] Reviewer hesabı oluşturuldu: `cd backend && python seed_reviewer.py`

## iOS — iPad Air simülatör

- [ ] Fresh install (önceki sürüm kaldırıldı)
- [ ] Login ekranı açılıyor, form iPad genişliğinde ortalanmış
- [ ] Yanlış şifre → Türkçe hata mesajı (`Hatalı e-posta veya şifre`)
- [ ] Uçak modu → `İnternet bağlantınızı kontrol edin`
- [ ] Demo hesap ile giriş → Dashboard açılıyor
- [ ] Simülasyon sekmesi → vaka listesi yükleniyor
- [ ] Profil → Ayarlar → Gizlilik Politikası linki açılıyor
- [ ] Logout → login ekranına dönüş
- [ ] Kayıt ol ekranı → yeni hesap oluşturma (opsiyonel test)

## iOS — iPhone simülatör

- [ ] Login + dashboard akışı
- [ ] Face ID / Touch ID (fiziksel cihazda): biyometrik buton token doğruluyor

## Android — API 35 emulator

- [ ] Edge-to-edge: tab bar sistem gesture barının üstünde
- [ ] Login keyboard açıkken butonlar görünür
- [ ] Histoloji detay ekranı: siyah tam ekran, geri butonu tıklanabilir
- [ ] Demo login → dashboard

## Auth / oturum

- [ ] Giriş sonrası uygulama kapat-aç → oturum devam (Beni hatırla açık)
- [ ] Access token süresi dolduğunda (15 dk+) API isteği refresh ile devam ediyor
- [ ] Refresh başarısız → login ekranına yönlendirme

## Build doğrulama

- [ ] `app.json` version: 1.3.2
- [ ] iOS buildNumber: 8
- [ ] Android versionCode: 8
- [ ] `EXPO_PUBLIC_API_URL` production build'de doğru

## Store

- [ ] iOS: APP_STORE_REVIEW.md notları App Store Connect'e eklendi
- [ ] Android: Play Console pre-launch report temiz veya bilinen uyarılar kabul edilebilir
