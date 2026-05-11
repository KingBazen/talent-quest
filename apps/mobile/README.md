# Mobile app — The Bling Records Talent Show

React Native + Expo + TypeScript + NativeWind. Lives at `apps/mobile/` inside the main monorepo so it can share types with the Next.js web app at the repo root.

## Prerequisites

You need these installed once on your dev machine:

- **Node 20+**
- **Bun or pnpm or npm** — examples below use `npm`
- **Expo CLI** comes via `npx`; no global install needed
- **iOS only:** Xcode 15+ (for the iOS Simulator). Macs only.
- **Android only:** Android Studio with an emulator, OR an Android phone with [Expo Go](https://expo.dev/go) installed
- **Both:** [Expo Go](https://expo.dev/go) on a real phone is the fastest path

## First-time setup

```bash
cd apps/mobile
npm install
```

If you see `EUNSUPPORTEDPROTOCOL` or peer-dep warnings, run with `--legacy-peer-deps`. Expo's deps are well-behaved in practice, so this is rare.

## Run against the local dev server

The mobile app needs the Next.js backend running. From the repo root:

```bash
# Terminal 1 — backend
npm run dev          # Next.js on http://localhost:3000
```

```bash
# Terminal 2 — mobile
cd apps/mobile
npm start            # Expo dev server
```

Press `i` for iOS Simulator, `a` for Android, or scan the QR code from Expo Go on a real phone.

### Pointing the app at a different backend

By default the app calls `http://localhost:3000`. To target a deployed Vercel preview or a tunnelled local server:

```bash
EXPO_PUBLIC_API_URL=https://my-preview.vercel.app npm start
```

If you're running on a real device (not the simulator), `localhost` from your laptop is **not** reachable. Two options:

1. **Use your laptop's LAN IP**: `EXPO_PUBLIC_API_URL=http://192.168.1.42:3000 npm start`. Make sure the phone is on the same Wi-Fi.
2. **Use Expo's tunnel**: `npm start -- --tunnel`. Slower, but routes around NAT.

## Type-check

```bash
cd apps/mobile
npm run type-check
```

The mobile `tsconfig.json` has its own paths — it does **not** participate in the web app's `tsc --noEmit` (the web app's `tsconfig.json` excludes `apps/`). Both type-check independently.

## Architecture

### Source layout

```
apps/mobile/
├── app/                    expo-router file-based routes
│   ├── _layout.tsx         root stack + providers
│   ├── (tabs)/             bottom tab nav
│   │   ├── _layout.tsx
│   │   ├── index.tsx       home (latest clips feed)
│   │   ├── contestants.tsx
│   │   ├── watchlist.tsx
│   │   └── profile.tsx
│   ├── sign-in.tsx         auth (sign in OR register)
│   ├── clips/[id].tsx      clip detail + video player
│   └── contestants/[id].tsx public profile
├── components/             reusable presentation
├── lib/
│   ├── api.ts              fetch wrapper, mirrors web client-api
│   ├── auth.ts             signIn / registerAudience / signOut
│   ├── session.ts          SecureStore wrapper
│   ├── session-context.tsx React context (mirrors web SessionProvider)
│   └── push-notifications.ts expo-notifications scaffold
├── tailwind.config.js      brand palette mirrored from web
├── babel.config.js
├── metro.config.js         monorepo-aware (watches ../../)
└── tsconfig.json
```

### Auth model

Mobile uses **JWT in `Authorization: Bearer` header** instead of the cookie used by web. The flow:

1. App calls `POST /api/auth/login` with `audience: "mobile"`
2. Backend returns the JWT in the response body (no cookie set)
3. App stores the JWT in `expo-secure-store` (Keychain / EncryptedSharedPrefs)
4. Subsequent requests send `Authorization: Bearer <jwt>`

The backend's `readSession()` consults both the cookie (web) and the Authorization header (mobile), so all existing API endpoints "just work" once the bearer token is presented.

Token lifetime mirrors the web cookie — 14 days. The app pre-emptively clears expired tokens before sending a doomed request.

### Type sharing with the web app

The mobile `tsconfig.json` aliases `@shared/*` to `../../src/lib/*` so individual DTO types can be imported verbatim:

```ts
import type { ContestantStatus } from "@shared/dto-types";
```

This is the **whole point** of the monorepo — the web app's existing types are the source of truth for the API contract; the mobile app consumes them. When the web app adds a new field to a DTO, mobile sees it on the next reload.

## Build for the stores (eventually)

EAS Build is the modern path. None of this needs to happen until the founder is ready to publish; the dev flow above works against TestFlight + Internal Testing channels first.

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

You'll need:

- An Apple Developer Program account ($99/year) for App Store
- A Google Play Console account ($25 one-time) for Play Store
- App icons + splash screens (placeholders are referenced in `app.json`; replace `assets/icon.png` etc.)
- Push notification certificates (Apple Push + Firebase) — set up via EAS Credentials

## Pending work (deferred)

These are the rough edges of a v0.1 mobile app, tracked for future iteration:

- **Real icon + splash assets** — placeholders are referenced in `app.json`; design + drop into `assets/`.
- **Audition upload (contestant role)** — needs `expo-image-picker` + `expo-camera` + a chunked upload to Cloudinary direct-upload endpoint. The web app's [src/lib/uploads.ts](../../src/lib/uploads.ts) is the reference implementation.
- **Payment flow** — needs the AdmasPay / Telebirr deep-link handler. The web app's [src/lib/payments.ts](../../src/lib/payments.ts) drives the desktop checkout; the mobile equivalent will use the same `payment-init` endpoint and route through `Linking.openURL()` to the AdmasPay app.
- **Push notification backend pipeline** — see header comment of [lib/push-notifications.ts](lib/push-notifications.ts). One table + one POST endpoint + one `sendPush()` companion in `src/lib/notify.ts`.
- **Bilingual EN/AM** — port the web app's [src/lib/i18n.ts](../../src/lib/i18n.ts) dictionary directly via `@shared/i18n`. Same dictionary, different `<View>` instead of `<div>`.
- **Episodes + leaderboard tabs** — currently web-only; mirror the existing `/api/episodes` + `/api/leaderboard` endpoints into the mobile tab nav.
- **App store assets** — store listings, screenshots, privacy policy URL (point at `/privacy` on the web).

## License

Private. Bling Records × Neo Studios.
