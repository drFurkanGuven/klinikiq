# KlinikIQ Native — EAS Build

## Ön koşullar

1. [Expo EAS CLI](https://docs.expo.dev/build/setup/): `npm i -g eas-cli`
2. Expo hesabı: `eas login`
3. Proje bağlantısı: `cd native && eas init` (app.json içindeki `extra.eas.projectId` güncellenir)

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `EXPO_PUBLIC_API_URL` | API base URL (varsayılan: `https://klinikiq.furkanguven.space/api`) |

Production build'de farklı API kullanmak için `eas.json` production profilindeki `env` değerini güncelleyin veya EAS Secrets kullanın:

```bash
eas secret:create --name EXPO_PUBLIC_API_URL --value https://klinikiq.furkanguven.space/api --scope project
```

## Build komutları

```bash
cd native

# iOS + Android production (store)
eas build --platform all --profile production

# Sadece iOS
eas build --platform ios --profile production

# Sadece Android
eas build --platform android --profile production

# Internal test (preview)
eas build --platform all --profile preview
```

## Lokal native klasör (debug)

```bash
cd native
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

`android/` ve `ios/` gitignore'da; commit edilmez.

## Sürüm

- `app.json` → `expo.version` (kullanıcıya görünen, örn. 1.3.2)
- iOS → `expo.ios.buildNumber`
- Android → `expo.android.versionCode`

Her store gönderiminde bu üç değeri artırın.

## Store submit

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Submit profilindeki placeholder alanları (`appleId`, `ascAppId`, vb.) doldurun.
