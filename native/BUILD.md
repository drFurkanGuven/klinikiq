# KlinikIQ Native — EAS Build (iOS öncelikli)

## Ön koşullar

1. [Expo EAS CLI](https://docs.expo.dev/build/setup/): `npm i -g eas-cli`
2. Expo hesabı: `eas login`
3. Proje bağlı: `app.json` → `extra.eas.projectId` (mevcut)

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `EXPO_PUBLIC_API_URL` | API base URL (varsayılan: `https://klinikiq.furkanguven.space/api`) |
| `EXPO_PUBLIC_WEB_URL` | WebView / yasal linkler için frontend origin |

Production'da farklı ortam için `eas.json` production profilindeki `env` değerlerini güncelleyin veya EAS Secrets kullanın.

## iOS TestFlight

```bash
cd native

# Production IPA
eas build --platform ios --profile production

# App Store Connect'e gönder (submit credentials doldurulmalı)
eas submit --platform ios --profile production
```

`eas.json` → `submit.production.ios` alanlarını doldurun:

- `appleId` — Apple ID e-postası
- `ascAppId` — App Store Connect uygulama ID
- `appleTeamId` — Developer Team ID

## Lokal iOS geliştirme

```bash
cd native
npm install
npx expo start --ios
# veya native modül testi:
npx expo prebuild --platform ios
npx expo run:ios
```

`ios/` gitignore'da; commit edilmez.

## Sürüm

Her TestFlight yüklemesinde artırın:

- `app.json` → `expo.version` (örn. 1.3.2)
- `app.json` → `expo.ios.buildNumber` (örn. 9)

## Store varlıkları

Gönderim öncesi kontrol:

- [ ] `assets/icon.png` — gerçek KlinikIQ ikonu (placeholder değil)
- [ ] `assets/splash-icon.png` — splash görseli
- [ ] `splash.backgroundColor` — `#000000` (monokrom)

## App Review

- Reviewer hesabı: `backend/seed_reviewer.py`
- Review notları: `APP_STORE_REVIEW.md`
- Smoke test: `SMOKE_TEST.md`

Android build/submit bu aşamada ertelendi; `eas.json` içinde Android submit profili kaldırıldı.
