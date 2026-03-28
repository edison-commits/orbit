# Orbit — Progress Log

## 2026-03-27

### v1.0.0 — QA/Polish Sprint

**Builds:**
- iOS (development): `eas build --platform ios --profile development` ✅ — build ID `22835ef4-0cbe-4b27-a42f-ffbb511b1cae`
- Android (preview): `eas build --platform android --profile preview` ✅ — APK https://expo.dev/artifacts/eas/aBuAvGgaKpqrA87oTvaLzx.apk

**Feedback section (Settings):**
- New `feedback` SQLite table (migration 003) — stores type, message, created_at
- New `feedbackRepository` — submit, getAll, delete
- Settings screen updated: type selector (Bug/Feature/Other), multiline input, Save locally + Email (mailto) buttons, submission history with delete

**App Store:**
- Copy written: "Orbit · Stay connected with the people who matter"
- Full description, short description, keywords
- Category: Lifestyle
- Privacy strings in app.json (photo library, camera)
- Icons regenerated (purple palette) via Pillow script
- expo-image-picker plugin configured

**Polish:**
- Progressive disclosure form: required fields (name, relationship, cadence) upfront; +More expands inline for photo, contact info, social, notes
- Photo support: expo-image-picker wired end-to-end (photo_uri column connected to new.tsx, edit, detail header, people cards)
- Traffic light due indicators: red/amber/green/gray via shared DUE_COLORS + getDueColor()
- People screen: color urgency bar on cards, search bar, last contacted as "3d ago"
- Colored header/tab bar: solid purple (#7C5CFC) header + white tab bar, lavender body background
- Birthday display: "March 26 · 32 years old" + upcoming birthday nudge within 14 days
- Tap-to-call/text: phone row has call+text icon buttons; email tappable with mailto
- Smart interaction defaults: Quick log pre-selects overdue+due contacts
- Empty states: Home "Your orbit is empty" + People contextual copy with CTA
- Settings rebuilt: default cadence, reset all data with confirmation, about section

**Database migrations:**
- 001: contacts + interactions + app_meta tables
- 002: ALTER TABLE contacts ADD COLUMN social_json TEXT
- 003: CREATE TABLE feedback (id, type, message, created_at)

---

## 2026-03-26

### Initial MVP

**Stack:** Expo/React Native (SDK 55), TypeScript, expo-sqlite, EAS Build

**Core features delivered:**
- Contact CRUD (name, nickname, photo, relationship type, how we met, notes)
- Interaction logging (when, type, note, link to contacts)
- Cadence tracking (due state: overdue/due/approaching/upcoming, next_due_at computed)
- Snooze/pause/archive contacts
- Home screen with traffic-light due indicators
- People screen with search and contact list
- Contact detail screen with activity timeline

**Known limitations:**
- Data local-only (no cloud sync)
- No push notifications yet
- Android build not yet tested

---

## 2026-03-28 — App Store Submission

**Status:** Apple Developer Program enrollment should be active now (~24h since signup on 2026-03-27).

**Next steps (requires London):**
1. Check developer.apple.com — enrollment should be active
2. Create App Store Connect API key: developer.apple.com → Account → Keys → App Store Connect API → Create key
3. Upload key to Expo: expo.dev → Orbit → Access Keys → Add App Store Connect API Key
4. Run: `eas submit --platform ios --latest --auto-submit`

**Domain:** `orbitcontacts.app` registered on Cloudflare ✅
- Landing page deployed to: `https://orbit-landing-co3.pages.dev` ✅
- Custom domain waiting on manual setup in Cloudflare dashboard (Pages → orbit-landing → Custom domains → Add orbitcontacts.app)
- Privacy policy URL for App Store: `https://orbitcontacts.app/privacy` (live once domain is wired)

**What's needed:**
1. Apple Developer Program membership ($99/year) — is London a member?
2. App Store Connect API key uploaded to Expo
3. App Store listing: screenshots (iPhone 6.5", 6.9", iPad 12.9"), description, keywords, privacy policy URL, support URL
4. EAS Submit configured in eas.json

**Pre-work done:**
- iOS bundle ID: `com.orbit.app` ✅ (already in app.json)
- App icons: all generated ✅
- App Store copy: written ✅ ("Orbit · Stay connected with the people who matter")
- Privacy policy URL: needed (can use a free one from iubenda/privacypolicytemplate.net)

**Steps once Apple account is connected:**
1. `eas submit --platform ios --latest --auto-submit` builds + submits
2. Or: build with `eas build --platform ios --profile production` then submit separately
