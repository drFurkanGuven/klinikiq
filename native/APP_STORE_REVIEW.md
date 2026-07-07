# App Store Connect — Review Notes Checklist

## Demo hesap

| Alan | Değer |
|------|-------|
| E-posta | `review@klinikiq.app` |
| Şifre | `KlinikIQ-Review-2026!` |

Sunucuda oluştur:

```bash
cd backend
python seed_reviewer.py
```

**Önemli:** App Store Connect'teki e-posta ve şifre yukarıdakiyle **birebir aynı** olmalı. Şifre boş bırakılırsa giriş 422 hatası verir.

## App Store Connect → Review Notes (kopyala-yapıştır)

```
Demo account for App Review:

Email: review@klinikiq.app
Password: KlinikIQ-Review-2026!

How to sign in:
1. Launch the app on iPad or iPhone.
2. Enter BOTH email and password above on the login screen.
3. Tap "Giriş Yap" (Sign In).
4. Main tabs: Çalış | Vaka | Öğren

Requires internet. API: https://klinikiq.furkanguven.space
Privacy: https://klinikiq.furkanguven.space/privacy
```

## Gönderim öncesi

- [ ] `seed_reviewer.py` production'da çalıştı
- [ ] Simülatörde bu hesapla giriş test edildi
- [ ] Review Notes'ta şifre yazılı
- [ ] Sürüm 1.3.2, build 10+
