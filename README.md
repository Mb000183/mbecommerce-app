# E-Commerce Omnichannel Management System

An omnichannel ecommerce workspace with a **Three.js 3D Command Centre**, **Express + Gemini AI backend**, real-time multi-store management, automated SEO generation, trend scraping, and Capacitor Android packaging.

---

## 🌐 Run Locally (Web)

```bash
npm install
# Copy .env.example → .env.local and add your GEMINI_API_KEY
npm run dev          # starts Express + Vite dev server on :3000
```

---

## 📱 Build Android APK via Ionic Appflow

All Android files are pre-generated. No CLI commands needed on your side.

1. Push this repo to GitHub (include the `android/` folder)
2. Connect repo to [Ionic Appflow](https://dashboard.ionicframework.com)
3. **Builds → Android → Debug** — Appflow will:
   - Run `npm run build` → produces `dist/`
   - Run `npx cap sync android` → copies `dist/` into `android/app/src/main/assets/public/`
   - Run `./gradlew assembleDebug` → produces APK
4. Download and install the APK on your Android device

---

## 🏗️ Project Structure

```
├── server.ts                    # Express backend (Gemini SEO, store APIs, trends)
├── index.html                   # Vite SPA entry
├── src/                         # React + Three.js frontend source
├── dist/                        # Vite build output (served by Capacitor)
├── capacitor.config.ts          # Capacitor 6 config
├── ionic.config.json            # Appflow integration
├── firebase-applet-config.json  # Firebase project config
├── firestore.rules              # Firestore security rules
└── android/                     # Complete Capacitor Android project
    ├── build.gradle / settings.gradle / variables.gradle
    ├── gradlew + gradle/wrapper/ (gradle-wrapper.jar included)
    ├── capacitor-android/       # Capacitor bridge library (BridgeActivity)
    └── app/
        ├── build.gradle
        └── src/main/
            ├── AndroidManifest.xml
            ├── assets/public/   ← web app loaded here by WebView
            ├── java/com/mian/omnichannel/MainActivity.kt
            └── res/             ← icons, splash, styles, colors, xml
```

---

## ⚙️ App Config

| Key | Value |
|---|---|
| App ID | `com.mian.omnichannel` |
| App Name | E-Commerce Omnichannel Management System |
| Capacitor | v6 |
| Min Android SDK | 22 (Android 5.1+) |
| Target SDK | 34 (Android 14) |
| WebDir | `dist` |

---

## 🔑 Firebase

- **Project:** `elaborate-odyssey-xw532`
- **Firestore DB:** `ai-studio-2899682f-fa0e-4c85-90ff-b877fff8feb2`
- **Storage:** `elaborate-odyssey-xw532.firebasestorage.app`
