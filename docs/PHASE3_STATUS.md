# Phase 3 Status — Native mobile applications

**Shipped:** 18 August 2026

| Workstream | Delivered |
|------------|-----------|
| Apps | Expo / React Native app in `/mobile` sharing Supabase + domain types |
| Citizen mobile | Report (camera, anonymous, reference ID), track, hotlines |
| Official mobile | Login, role-filtered queue, case status updates, evidence view |
| Offline | AsyncStorage queue + NetInfo sync on reconnect |
| Stores | `app.json` bundle IDs, EAS config, store build instructions |

## Run

```bash
cd mobile && npm install && npx expo start
```

## Store presence

Production listing assets and EAS project ID still need ministry accounts (Apple Developer + Google Play). Code and config are ready for `eas build` / `eas submit`.
