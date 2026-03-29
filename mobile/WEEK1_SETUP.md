# Week 1 Setup — Smart Attendance Mobile

## Step 1: Initialize Expo project

```bash
cd ~/Desktop/smart_attendance
npx create-expo-app mobile --template blank-typescript
cd mobile
```

## Step 2: Install all dependencies

```bash
# Expo libraries
npx expo install expo-router expo-camera expo-location expo-secure-store \
  expo-notifications expo-file-system expo-sharing \
  react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar

# npm packages
npm install zustand axios

# NativeWind
npm install nativewind
npm install --save-dev tailwindcss
```

## Step 3: Copy the generated files

Replace/merge the following files from this handoff into your `mobile/` folder:

```
mobile/
├── app.json                         ← replace generated one
├── babel.config.js                  ← replace generated one
├── tailwind.config.js               ← new
├── tsconfig.json                    ← replace generated one
├── app/
│   ├── _layout.tsx                  ← replace generated one (root auth guard)
│   ├── (auth)/
│   │   └── login.tsx                ← new
│   └── (app)/
│       ├── _layout.tsx              ← new (tab navigator)
│       ├── home/index.tsx           ← new
│       ├── attendance/index.tsx     ← new (placeholder)
│       ├── leaves/index.tsx         ← new (placeholder)
│       └── salary/index.tsx         ← new (placeholder)
├── store/
│   ├── auth.store.ts
│   └── attendance.store.ts
├── lib/
│   ├── api.ts
│   └── auth.ts
└── constants/
    └── colors.ts
```

## Step 4: Update backend (see BACKEND_CHANGES.md)

Three quick additions to the backend:
1. `/api/auth/refresh` new endpoint
2. Login response also returns `accessToken` + `refreshToken` in JSON body
3. `authenticate` middleware checks Bearer header before cookie

## Step 5: Run

```bash
npx expo start
```

Scan the QR code with Expo Go on Android, or press `i` for iOS simulator.

---

## What's working after Week 1

- ✅ Login screen with email/password
- ✅ Tokens stored securely in device keychain
- ✅ Automatic token refresh on 401
- ✅ Force logout when refresh also fails
- ✅ Session restored on app relaunch (no login every time)
- ✅ Bottom tab navigation (Home, Attendance, Leaves, Salary)
- ✅ Home dashboard with live clock-in status card + timer
- ✅ Attendance, Leaves, Salary tabs (placeholder — built Week 2-3)

## Next: Week 2

- QR scanner (expo-camera)
- GPS check-in (expo-location)
- Attendance history with BS month picker
- Home dashboard quick stats (fill in real data)
