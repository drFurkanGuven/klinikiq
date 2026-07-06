# App Store Connect — Review Notes Checklist

Bu dosyayı store gönderimi öncesi kontrol listesi olarak kullanın. App Store Connect içinde **App Review Information → Notes** alanına aşağıdaki metni yapıştırın.

## Ön koşul

Production veritabanında reviewer hesabını oluşturun:

```bash
cd backend
python seed_reviewer.py
```

Varsayılan demo hesap:

| Alan | Değer |
|------|-------|
| E-posta | `review@klinikiq.app` |
| Şifre | `KlinikIQ-Review-2026!` |

Şifreyi değiştirmek için:

```bash
REVIEWER_PASSWORD="YourSecurePassword" python seed_reviewer.py
```

## App Store Connect Review Notes (kopyala-yapıştır)

```
Demo account for App Review:

Email: review@klinikiq.app
Password: KlinikIQ-Review-2026!

How to sign in:
1. Launch the app on iPad or iPhone.
2. On the login screen, enter the email and password above.
3. Tap "Giriş Yap" (Sign In).
4. You will land on the main dashboard with tabs: Dashboard, Simulation, Pharmacology, Emergency, Profile.

The app requires an active internet connection. API: https://klinikiq.furkanguven.space

Registration is also available via "Kayıt ol" on the login screen if you prefer to create a new account.

Privacy policy: https://klinikiq.furkanguven.space/privacy
```

## Gönderim öncesi kontrol

- [ ] `seed_reviewer.py` production DB'de çalıştırıldı
- [ ] iPad simülatörde demo hesap ile giriş test edildi
- [ ] Review Notes alanına demo credential yazıldı
- [ ] Gizlilik politikası URL'si App Store metadata'da mevcut
- [ ] Sürüm: 1.3.2, build: 8
- [ ] Face ID usage description (NSFaceIDUsageDescription) prebuild sonrası Info.plist'te doğrulandı

## Apple yanıtı (red durumunda)

Resolution Center'da şu bilgileri paylaşın:

- Login bug fixed in version 1.3.2
- Demo credentials provided in Review Notes
- Tested on iPad Air simulator with iPadOS latest
- Refresh token flow added; session stability improved
