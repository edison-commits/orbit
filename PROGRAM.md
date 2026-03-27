# Orbit

## Project Identity
- **What:** Personal relationship manager — local-first, Expo/React Native, tracks contacts + interaction cadences
- **Canonical repo:** github.com/edison-commits/orbit
- **Dev path:** /Users/edison/.openclaw/workspace/orbit
- **iOS target:** iPhone 17 Pro simulator (iOS 26.4), ID: 8835C52F-767D-4123-8245-6910F3CDEEE4

## Stack
- Expo / React Native (SDK 53+)
- TypeScript
- Local state (local-first, no backend yet)
- EAS Build for iOS builds

## Build & Run
```bash
# Dev (Expo)
cd orbit && CI=1 npx expo start --port 8081

# iOS simulator
cd orbit && npx expo run:ios

# Xcode build
cd orbit/ios && xcodebuild -workspace Orbit.xcworkspace -scheme Orbit -configuration Debug -destination "platform=iOS Simulator,id=8835C52F-767D-4123-8245-6910F3CDEEE4" build

# EAS build
npx eas-cli build --platform ios --profile development
```

## Current Phase
MVP complete. In QA/polish mode — testing, refinement, small improvements.

Working features:
- Contact CRUD, interaction logging, cadence tracking
- Snooze/pause/archive
- Birthday, phone, email, social fields (Instagram, Twitter/X, LinkedIn)
- Tap-to-open social links
- Redesigned contact detail screen with due status banner

Recent work: DB migration 002 (social_json column), new contact forms, redesigned detail screen.

## QA Workflow
Before declaring a feature complete:
1. Build succeeds (xcodebuild or EAS)
2. App launches on simulator without crash
3. Core flow works (add contact → log interaction → see it on home screen)
4. No new TypeScript errors

## What's Pre-Approved
- Polish/refinement within existing feature scope
- Fixing obvious bugs without asking
- Sprint mode: "sprint on X for 10 minutes" → work autonomously, report back

## Sprint Protocol
When London says "sprint":
1. Work for the stated time without asking
2. Report what was done, what's working, what's not
3. Do NOT commit unless explicitly told to
4. Leave code buildable

## Expo Notes
- Logged in as edison@idiotic.solutions
- GitHub app connected (expo-by-edisonclaw)
- EAS credentials stored in Keychain

## Contacts
- London: approves designs, major decisions
- Edison: orchestrator, manages ops and delegation to Forge
